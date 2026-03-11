const { Server, Scp, requests, responses, constants, Dataset } = require('dcmjs-dimse');
const { CFindRequest } = requests;
const { CFindResponse } = responses;
const {
    Status,
    PresentationContextResult,
    TransferSyntax,
    SopClass
} = constants;

const { pool } = require('../config/postgres');
// ...

// --- CONSTANTS ---
const RIS_AET = process.env.RIS_AE_TITLE || 'RIS_MWL';
const RIS_PORT = parseInt(process.env.RIS_MWL_PORT || '11112', 10);

// Custom SOP Class for MWL if not in constants (it might be there)
const SOP_MWL_FIND = '1.2.840.10008.5.1.4.31';

class MwlScp extends Scp {
    constructor(socket, opts) {
        super(socket, opts);
        this.association = undefined;
    }

    associationRequested(association) {
        this.association = association;
        console.log(`[MWL] Association Requested from ${association.getCallingAeTitle()}`);

        // Accept all contexts that match MWL or Verification
        const contexts = association.getPresentationContexts();
        contexts.forEach((c) => {
            const context = association.getPresentationContext(c.id);
            const abstractSyntax = context.getAbstractSyntaxUid();

            if (
                abstractSyntax === SopClass.Verification ||
                abstractSyntax === SOP_MWL_FIND ||
                abstractSyntax === '1.2.840.10008.5.1.4.1.2.2.1' // Study Root FIND (often used as fallback)
            ) {
                const transferSyntaxes = context.getTransferSyntaxUids();
                // Naive acceptance of first supported syntax (Implicit LE is mandatory usually)
                let acceptedSyntax = null;
                for (const ts of transferSyntaxes) {
                    if (ts === TransferSyntax.ImplicitVRLittleEndian || ts === TransferSyntax.ExplicitVRLittleEndian) {
                        acceptedSyntax = ts;
                        break;
                    }
                }

                if (acceptedSyntax) {
                    context.setResult(PresentationContextResult.Accept, acceptedSyntax);
                } else {
                    context.setResult(PresentationContextResult.RejectTransferSyntaxesNotSupported);
                }
            } else {
                context.setResult(PresentationContextResult.RejectAbstractSyntaxNotSupported);
            }
        });

        this.sendAssociationAccept();
    }

    // Handle C-FIND Request
    async cFindRequest(request, callback) {
        console.log(`[MWL] Received C-FIND from ${this.association.callingAeTitle}`);

        // 1. Extract Query Parameters
        // dcmjs-dimse provides 'request.dataset' which is the DICOM dataset
        const dataset = request.dataset;

        // Basic Filtering Logic (Expand as needed)
        // PatientID (0010,0020), AccessionNumber (0008,0050), ScheduledDate (0040,0002) etc.
        // Note: dataset.getElement might return undefined if tag missing

        // For now, we assume "Get Worklist for Today/All" if no specific filters
        // In a real scenario, we parse query Dataset to SQL WHERE clause

        try {
            // Fetch Scheduled Orders from DB
            // We limit to status 'SCHEDULED' or 'ARRIVED' usually
            const q = `
        SELECT 
           o.id, 
           o.accession_number, 
           o.study_instance_uid, 
           o.modality, 
           o.scheduled_time, 
           o.procedure_description, 
           p.mrn as patient_id, 
           p.name as patient_name, 
           p.gender as patient_sex, 
           p.dob as patient_dob
        FROM orders o
        JOIN patients p ON o.patient_id = p.id
        WHERE o.status IN ('SCHEDULED', 'ARRIVED')
        ORDER BY o.scheduled_time ASC
        LIMIT 50
      `;
            // TODO: Add date filtering if Modality sent Date range

            const { rows } = await pool.query(q);
            console.log(`[MWL] Found ${rows.length} scheduled orders`);

            const responses = [];

            for (const row of rows) {
                // Map DB Record to DICOM Dataset
                // We assume 'Dataset' helper from dcmjs-dimse works or we construct object
                // dcmjs-dimse expects a plain object or specific structure depending on version
                // Usually: { "00100010": { "vr": "PN", "Value": ["Name"] } } etc.

                // Actually dcmjs-dimse usually wants a Dataset object for response
                // Let's create a response dataset

                const scheduledDate = row.scheduled_time ? new Date(row.scheduled_time) : new Date();
                const da = scheduledDate.toISOString().slice(0, 10).replace(/-/g, '');
                const tm = scheduledDate.toISOString().slice(11, 19).replace(/:/g, '');

                const item = {
                    // Patient
                    '00100010': { vr: 'PN', Value: [row.patient_name || ''] },
                    '00100020': { vr: 'LO', Value: [row.patient_id || ''] },
                    '00100040': { vr: 'CS', Value: [row.patient_sex ? row.patient_sex[0].toUpperCase() : 'O'] },
                    '00101010': { vr: 'AS', Value: ['000Y'] }, // TODO: Calc Age

                    // Study
                    '0020000D': { vr: 'UI', Value: [row.study_instance_uid || ''] },
                    '00080050': { vr: 'SH', Value: [row.accession_number || ''] },
                    '00080060': { vr: 'CS', Value: [row.modality || 'OT'] }, // Modality
                    '00321060': { vr: 'LO', Value: [row.procedure_description || 'Study'] },

                    // Scheduled Procedure Step
                    '00400100': {
                        vr: 'SQ',
                        Value: [
                            new Dataset({
                                '00400001': { vr: 'AE', Value: [RIS_AET] }, // Scheduled Station AE
                                '00400002': { vr: 'DA', Value: [da] },      // Scheduled Date
                                '00400003': { vr: 'TM', Value: [tm] },      // Scheduled Time
                                '00080060': { vr: 'CS', Value: [row.modality] },
                                '00400009': { vr: 'SH', Value: [row.id.toString()] } // SPS ID (using Order ID)
                            })
                        ]
                    }
                };

                // Send a Pending Response for each match
                const pending = CFindResponse.createPending(request.context.contextId, new Dataset(item));
                callback(pending);
            }

            // Final Success Response
            const success = CFindResponse.createSuccess(request.context.contextId);
            callback(success);

        } catch (err) {
            console.error("[MWL] Error processing C-FIND", err);
            // Send Failure
            const fail = CFindResponse.createFailure(request.context.contextId, 0xC000, "Processing Failure");
            callback(fail);
        }
    }

    // Handle Association Release
    associationReleaseReceived() {
        this.sendAssociationReleaseResponse();
    }
}

let serverInstance = null;

function startMwlServer() {
    if (serverInstance) return;

    try {
        serverInstance = new Server(MwlScp);
        serverInstance.on('networkError', (e) => console.log('MWL Network Error', e));

        serverInstance.listen(RIS_PORT);
        console.log(`[MWL] Native DICOM SCP listening on port ${RIS_PORT} (AE: ${RIS_AET})`);
    } catch (err) {
        console.error("[MWL] Failed to start DICOM Server", err);
    }
}

module.exports = { startMwlServer, RIS_AET, RIS_PORT };
