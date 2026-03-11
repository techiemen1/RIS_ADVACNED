const { Client, requests } = require('dcmjs-dimse');
const { CFindRequest } = requests;

// Config matching our server
const TARGET_IP = '127.0.0.1';
const TARGET_PORT = 11112;
const TARGET_AET = 'RIS_MWL';
const CALLING_AET = 'TEST_MODALITY';

async function testMwl() {
    console.log(`Connecting to ${TARGET_IP}:${TARGET_PORT}...`);

    const client = new Client();

    // DICOM request for MWL (Worklist Information Model - FIND)
    // We request typical return keys
    const request = new CFindRequest({
        affectedSOPClassUID: '1.2.840.10008.5.1.4.31', // Modality Worklist FIND
        priority: 1,
        dataSet: {
            '00100010': { vr: 'PN', Value: ['*'] }, // Patient Name
            '00100020': { vr: 'LO', Value: [''] },  // Patient ID (Empty means return value)
            '00080060': { vr: 'CS', Value: [''] },  // Modality
            '00400100': {
                vr: 'SQ', Value: [
                    {
                        '00400001': { vr: 'AE', Value: [''] }, // Scheduled Station AE
                        '00400002': { vr: 'DA', Value: [''] }  // Scheduled Date
                    }
                ]
            }
        }
    });

    client.addRequest(request);

    request.on('response', (response, context) => {
        console.log('--- C-FIND Response ---');
        if (response.getStatus().match(/Pending/)) {
            const ds = response.getDataset();
            const name = ds.getElement('00100010')?.Value?.[0]?.Alphabetic || ds.getElement('00100010')?.Value?.[0];
            const acc = ds.getElement('00080050')?.Value?.[0];
            const modality = ds.getElement('00080060')?.Value?.[0];

            console.log(`FOUND: ${name} | Accession: ${acc} | Modality: ${modality}`);
        } else {
            console.log('Status:', response.getStatus().toString(16));
        }
    });

    return new Promise((resolve, reject) => {
        client.on('networkError', (e) => {
            console.error("Network Error:", e);
            reject(e);
        });

        client.on('closed', () => {
            console.log('Connection closed');
            resolve();
        });

        client.send(TARGET_IP, TARGET_PORT, CALLING_AET, TARGET_AET);
    });
}

testMwl().catch(e => console.error(e));
