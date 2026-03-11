/**
 * services/studyArrivalService.js
 *
 * Core business logic for the Orthanc study_arrived webhook pipeline.
 *
 * Steps executed on each arriving study:
 *  1. Parse & validate Orthanc payload
 *  2. Match study to a RIS order (AccessionNumber → primary, PatientID → fallback)
 *  3. Update order status → ARRIVED if matched
 *  4. Create UNSCHEDULED STUDY record if no order found
 *  5. Insert/upsert into pacs_studies
 *  6. Assign radiologist based on modality (falls back to round-robin)
 *  7. Emit STUDY_ARRIVED WebSocket event to 'radiology' and 'reception' rooms
 */

'use strict';

const { pool }       = require('../config/postgres');
const { getIO }      = require('./socketService');
const { logAction }  = require('../controllers/auditController');

/* ═══════════════════════════════════════════════════════════
   PAYLOAD PARSER
   Handles both Orthanc webhook formats:
     - New format (Orthanc 1.12+): { ID, Path, ...Resources }
     - Legacy change notification: { ResourceType, ID, ... }
   Extracts DICOM tags from WhileStudy or Series resources.
═══════════════════════════════════════════════════════════ */
function parseOrthancPayload(body) {
  // Orthanc webhook sends a JSON body when a study is stable.
  // The payload looks like:
  //   { "ID": "orthanc-uuid", "Path": "/studies/orthanc-uuid",
  //     "Resources": { "Studies": ["orthanc-uuid"] },
  //     "Tags": { "StudyInstanceUID": "...", "PatientID": "...", ... },
  //     "Series": [{ ... }], "Instances": [{ ... }]
  //   }
  //
  // OR a simplified change event:
  //   { "ChangeType": "StableStudy", "ID": "...", "ResourceType": "Study" }

  const orthancId = body.ID || body.id || null;

  // Extract study-level DICOM tags
  const tags   = body.Tags || body.tags || {};
  const series = body.Series || body.series || [];
  const instances = body.Instances || body.instances || [];

  const studyUID      = tags.StudyInstanceUID  || body.StudyInstanceUID  || null;
  const patientIdDicom = tags.PatientID        || body.PatientID         || null;
  const accessionNum  = tags.AccessionNumber   || body.AccessionNumber   || null;
  const patientName   = tags.PatientName       || body.PatientName       || null;
  const studyDateRaw  = tags.StudyDate         || body.StudyDate         || null;
  const studyDesc     = tags.StudyDescription  || body.StudyDescription  || null;

  // Modality: prefer study-level, then scrape from first series
  let modality = tags.Modality || tags.ModalitiesInStudy || body.Modality || null;
  if (!modality && Array.isArray(series) && series.length > 0) {
    const firstSeries = series[0];
    modality = firstSeries?.Tags?.Modality || firstSeries?.Modality || null;
  }
  if (Array.isArray(modality)) modality = modality[0];  // pick first if array

  // Parse DICOM date YYYYMMDD → JS Date
  let studyDate = null;
  if (studyDateRaw && studyDateRaw.length === 8) {
    studyDate = new Date(
      `${studyDateRaw.slice(0,4)}-${studyDateRaw.slice(4,6)}-${studyDateRaw.slice(6,8)}`
    );
    if (isNaN(studyDate.getTime())) studyDate = null;
  }

  return {
    orthancId,
    studyUID,
    patientIdDicom,
    accessionNumber: accessionNum,
    patientName,
    studyDate,
    studyDescription: studyDesc,
    modality:        modality ? modality.toUpperCase() : null,
    seriesCount:     Array.isArray(series)    ? series.length    : 0,
    instanceCount:   Array.isArray(instances) ? instances.length : 0,
    rawSeries:       series,
    rawInstances:    instances,
  };
}

/* ═══════════════════════════════════════════════════════════
   ORDER MATCHING
   Strategy 1: AccessionNumber EXACT match (primary)
   Strategy 2: PatientID match with status SCHEDULED (fallback)
═══════════════════════════════════════════════════════════ */
async function findMatchingOrder({ accessionNumber, patientIdDicom }) {
  // Strategy 1: AccessionNumber exact match
  if (accessionNumber) {
    const res = await pool.query(
      `SELECT id, patient_id, accession_number, modality, status
       FROM orders
       WHERE accession_number = $1
       LIMIT 1`,
      [accessionNumber]
    );
    if (res.rows.length > 0) {
      return { order: res.rows[0], matchedBy: 'accession_number' };
    }
  }

  // Strategy 2: PatientID fallback — find most recent SCHEDULED order for this patient
  if (patientIdDicom) {
    const res = await pool.query(
      `SELECT o.id, o.patient_id, o.accession_number, o.modality, o.status
       FROM orders o
       JOIN patients p ON p.id = o.patient_id
       WHERE (p.mrn = $1 OR p.id::text = $1)
         AND o.status = 'SCHEDULED'
       ORDER BY o.scheduled_time DESC
       LIMIT 1`,
      [patientIdDicom]
    );
    if (res.rows.length > 0) {
      return { order: res.rows[0], matchedBy: 'patient_id_fallback' };
    }
  }

  return { order: null, matchedBy: null };
}

/* ═══════════════════════════════════════════════════════════
   ORDER STATUS UPDATE → ARRIVED
═══════════════════════════════════════════════════════════ */
async function markOrderArrived(orderId, pacsStudyId, client) {
  await client.query(
    `UPDATE orders
     SET status       = 'ARRIVED',
         arrived_at   = NOW(),
         pacs_study_id = $2,
         updated_at   = NOW()
     WHERE id = $1`,
    [orderId, pacsStudyId]
  );
}

/* ═══════════════════════════════════════════════════════════
   RADIOLOGIST AUTO-ASSIGNMENT
   Lookup modality_assignments table → find assigned user.
   Fallback: pick the radiologist with the fewest active studies today.
═══════════════════════════════════════════════════════════ */
async function assignRadiologist(modality) {
  // Step 1: explicit modality assignment
  if (modality) {
    const res = await pool.query(
      `SELECT ma.user_id, u.username, u.full_name
       FROM modality_assignments ma
       JOIN users u ON u.id = ma.user_id
       WHERE ma.modality = $1 AND ma.user_id IS NOT NULL
       LIMIT 1`,
      [modality]
    );
    if (res.rows.length > 0) {
      return { userId: res.rows[0].user_id, method: 'modality_mapping', name: res.rows[0].full_name };
    }
  }

  // Step 2: round-robin fallback — radiologist with fewest ARRIVED studies today
  const fallback = await pool.query(
    `SELECT u.id AS user_id, u.full_name,
            COUNT(ps.id) FILTER (WHERE ps.arrived_at::date = CURRENT_DATE) AS today_count
     FROM users u
     LEFT JOIN pacs_studies ps ON ps.assigned_radiologist = u.id
     WHERE u.is_active = true
       AND u.role ILIKE '%radiologist%'
     GROUP BY u.id, u.full_name
     ORDER BY today_count ASC, u.id ASC
     LIMIT 1`
  );

  if (fallback.rows.length > 0) {
    return {
      userId: fallback.rows[0].user_id,
      method: 'round_robin',
      name:   fallback.rows[0].full_name,
    };
  }

  return { userId: null, method: 'none', name: null };
}

/* ═══════════════════════════════════════════════════════════
   INSERT / UPSERT pacs_studies
═══════════════════════════════════════════════════════════ */
async function upsertPacsStudy(parsed, orderId, radiologistId, isUnscheduled, rawPayload, client) {
  const res = await client.query(
    `INSERT INTO pacs_studies
       (study_instance_uid, patient_id_dicom, accession_number, modality,
        patient_name, study_date, study_description,
        series_count, instance_count,
        orthanc_study_id, order_id, assigned_radiologist,
        arrival_status, is_unscheduled, raw_payload, arrived_at,
        urgency_score, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),$16,$17)
     ON CONFLICT (study_instance_uid)
     DO UPDATE SET
       patient_id_dicom     = EXCLUDED.patient_id_dicom,
       accession_number     = COALESCE(EXCLUDED.accession_number, pacs_studies.accession_number),
       modality             = COALESCE(EXCLUDED.modality, pacs_studies.modality),
       patient_name         = COALESCE(EXCLUDED.patient_name, pacs_studies.patient_name),
       study_date           = COALESCE(EXCLUDED.study_date, pacs_studies.study_date),
       study_description    = COALESCE(EXCLUDED.study_description, pacs_studies.study_description),
       series_count         = EXCLUDED.series_count,
       instance_count       = EXCLUDED.instance_count,
       order_id             = COALESCE(EXCLUDED.order_id, pacs_studies.order_id),
       assigned_radiologist = COALESCE(EXCLUDED.assigned_radiologist, pacs_studies.assigned_radiologist),
       arrival_status       = EXCLUDED.arrival_status,
       is_unscheduled       = EXCLUDED.is_unscheduled,
       raw_payload          = EXCLUDED.raw_payload,
       urgency_score        = EXCLUDED.urgency_score,
       priority             = EXCLUDED.priority,
       updated_at           = NOW()
     RETURNING *`,
    [
      parsed.studyUID,
      parsed.patientIdDicom,
      parsed.accessionNumber,
      parsed.modality,
      parsed.patientName,
      parsed.studyDate,
      parsed.studyDescription,
      parsed.seriesCount,
      parsed.instanceCount,
      parsed.orthancId,
      orderId || null,
      radiologistId || null,
      isUnscheduled ? 'UNSCHEDULED' : (orderId ? 'MATCHED' : 'ARRIVED'),
      isUnscheduled,
      JSON.stringify(rawPayload),
      parsed.triage ? parsed.triage.score : 0,
      parsed.triage ? parsed.triage.priority : 'NORMAL'
    ]
  );
  return res.rows[0];
}

/* ═══════════════════════════════════════════════════════════
   MAIN ENTRY POINT — processStudyArrival()
   Called by studyController.studyArrived handler.
═══════════════════════════════════════════════════════════ */
async function processStudyArrival(rawBody) {
  const parsed = parseOrthancPayload(rawBody);

  if (!parsed.studyUID) {
    throw new Error('StudyInstanceUID missing from Orthanc payload — cannot process');
  }

  // 🔥 AI Triage: Score Urgency on Arrival
  const aiTriage = require('./aiTriageService');
  parsed.triage = aiTriage.analyzeStudy({
      studyDescription: parsed.studyDescription,
      modality: parsed.modality,
      patientAge: null // If extraction of patient age is added later
  });

  console.log(`\n📥 [ARRIVAL] StudyUID: ${parsed.studyUID} | Modality: ${parsed.modality} | Priority: ${parsed.triage.priority} (${parsed.triage.score})`);

  // Wrap in a transaction
  const client = await pool.connect();
  let result;

  try {
    await client.query('BEGIN');

    // ── 1. Match order ────────────────────────────────────
    const { order, matchedBy } = await findMatchingOrder(parsed);
    const isUnscheduled        = !order;

    if (order) {
      console.log(`✅ [ARRIVAL] Matched order #${order.id} by ${matchedBy}`);
    } else {
      console.log(`⚠️  [ARRIVAL] No matching order — creating UNSCHEDULED record`);
    }

    // ── 2. Assign radiologist ─────────────────────────────
    const assignment = await assignRadiologist(parsed.modality);
    console.log(`👨‍⚕️ [ARRIVAL] Radiologist: ${assignment.name || 'none'} (method: ${assignment.method})`);

    // ── 3. Upsert pacs_studies ────────────────────────────
    const pacsStudy = await upsertPacsStudy(
      parsed,
      order?.id || null,
      assignment.userId,
      isUnscheduled,
      rawBody,
      client
    );

    // ── 4. Update order status → ARRIVED ─────────────────
    if (order) {
      await markOrderArrived(order.id, pacsStudy.id, client);
    }

    await client.query('COMMIT');

    // ── 5. Also update study_metadata cache ──────────────
    try {
      await pool.query(
        `INSERT INTO study_metadata
           (study_instance_uid, patient_name, patient_id, modality, accession_number, study_date)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (study_instance_uid) DO UPDATE SET
           patient_name     = COALESCE(EXCLUDED.patient_name, study_metadata.patient_name),
           patient_id       = COALESCE(EXCLUDED.patient_id, study_metadata.patient_id),
           modality         = COALESCE(EXCLUDED.modality, study_metadata.modality),
           accession_number = COALESCE(EXCLUDED.accession_number, study_metadata.accession_number),
           study_date       = COALESCE(EXCLUDED.study_date, study_metadata.study_date)`,
        [
          parsed.studyUID,
          parsed.patientName,
          parsed.patientIdDicom,
          parsed.modality,
          parsed.accessionNumber,
          parsed.studyDate,
        ]
      );
    } catch (cacheErr) {
      console.warn('[ARRIVAL] study_metadata cache update failed (non-fatal):', cacheErr.message);
    }

    // ── 6. Audit log ──────────────────────────────────────
    try {
      await logAction(
        'ORTHANC_WEBHOOK',
        'system',
        `Study arrived: ${parsed.studyUID} | Modality: ${parsed.modality} | ${
          isUnscheduled ? 'UNSCHEDULED' : `Matched order #${order.id}`
        }`
      );
    } catch (auditErr) {
      console.warn('[ARRIVAL] Audit log failed (non-fatal):', auditErr.message);
    }

    // ── 7. Build result payload ───────────────────────────
    result = {
      pacsStudy,
      matched:          !isUnscheduled,
      matchedBy,
      isUnscheduled,
      orderId:          order?.id || null,
      radiologist: {
        userId: assignment.userId,
        name:   assignment.name,
        method: assignment.method,
      },
      parsed: {
        studyUID:        parsed.studyUID,
        accessionNumber: parsed.accessionNumber,
        patientId:       parsed.patientIdDicom,
        modality:        parsed.modality,
        patientName:     parsed.patientName,
        seriesCount:     parsed.seriesCount,
        instanceCount:   parsed.instanceCount,
      },
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // ── 8. Emit WebSocket STUDY_ARRIVED ───────────────────
  const wsPayload = {
    event:           'STUDY_ARRIVED',
    studyUID:        result.parsed.studyUID,
    accessionNumber: result.parsed.accessionNumber,
    patientId:       result.parsed.patientId,
    patientName:     result.parsed.patientName,
    modality:        result.parsed.modality,
    seriesCount:     result.parsed.seriesCount,
    instanceCount:   result.parsed.instanceCount,
    orderId:         result.orderId,
    matched:         result.matched,
    matchedBy:       result.matchedBy,
    isUnscheduled:   result.isUnscheduled,
    radiologist:     result.radiologist,
    arrivedAt:       new Date().toISOString(),
    priority:        result.pacsStudy ? result.pacsStudy.priority : 'NORMAL',
    urgencyScore:    result.pacsStudy ? result.pacsStudy.urgency_score : 0,
  };

  const io = getIO();
  io.to('radiology').emit('STUDY_ARRIVED', wsPayload);
  io.to('reception').emit('STUDY_ARRIVED', wsPayload);
  io.emit('STUDY_ARRIVED', wsPayload);  // broadcast — all connected clients
  
  // ── 9. Emit STUDY_PRIORITY_UPDATED if critical/urgent ──
  if (wsPayload.priority === 'CRITICAL' || wsPayload.priority === 'URGENT') {
      io.to('radiology').emit('STUDY_PRIORITY_UPDATED', wsPayload);
      console.log(`🚨 [WS] Emitted STUDY_PRIORITY_UPDATED for ${result.parsed.studyUID} - Level: ${wsPayload.priority}`);
  }

  console.log(`📡 [WS] Emitted STUDY_ARRIVED for ${result.parsed.studyUID}`);

  return result;
}

module.exports = {
  processStudyArrival,
  parseOrthancPayload,    // Exported for unit testing
  findMatchingOrder,      // Exported for unit testing
  assignRadiologist,      // Exported for unit testing
};
