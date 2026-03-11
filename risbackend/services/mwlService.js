// services/mwlService.js
const axios = require("axios");
const { pool } = require("../config/postgres");

function normalizeBase(b) {
  if (!b) return null;
  if (/^https?:\/\//i.test(b)) return b.replace(/\/+$/g, "");
  return `http://${b.replace(/\/+$/g, "")}`;
}

/**
 * Save MWL record to DB for history/audit (returns saved row)
 */
async function saveMWLEntry(obj) {
  const q = `INSERT INTO mwl_entries
    (pacs_id, accession_number, study_instance_uid, patient_id, patient_name, modality, scheduled_datetime, payload, status, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    RETURNING *`;
  const params = [
    obj.pacs_id || null,
    obj.accession_number || null,
    obj.study_instance_uid || null,
    obj.patient_id || null,
    obj.patient_name || null,
    obj.modality || null,
    obj.scheduled_datetime || null,
    obj.payload || {},
    obj.status || "PENDING",
  ];
  const r = await pool.query(q, params);
  return r.rows[0];
}

/**
 * Create MWL on configured PACS (Orthanc / DCM4CHEE best-effort)
 * Returns { ok:boolean, message?, detail?, dbEntry }
 */
async function createMWL({ pacs, patient_id, patient_name, accession_number, study_instance_uid, modality, scheduled_datetime, payload }) {
  if (!pacs) throw new Error("PACS config required");

  const payloadForPACS = {
    PatientID: patient_id,
    PatientName: patient_name,
    AccessionNumber: accession_number,
    StudyInstanceUID: study_instance_uid,
    Modality: modality,
    ScheduledDatetime: scheduled_datetime,
  };

  // Save DB entry first so we have audit
  const saved = await saveMWLEntry({
    pacs_id: pacs.id,
    accession_number,
    study_instance_uid,
    patient_id,
    patient_name,
    modality,
    scheduled_datetime,
    payload: payloadForPACS,
    status: "PENDING",
  });

  const baseCandidate = pacs.base_url || `${pacs.host}:${pacs.port}`;
  const base = normalizeBase(baseCandidate);

  // Orthanc path
  if (/orthanc/i.test(pacs.type || "") || (base && base.includes("orthanc"))) {
    const endpoints = [
      `${base}/tools/create-mwl`,
      `${base}/mwl`,
      `${base}/dicom-web/mwl`,
    ];
    let lastErr = null;
    for (const url of endpoints) {
      try {
        const res = await axios.post(url, payloadForPACS, {
          auth: pacs.username && pacs.password ? { username: pacs.username, password: pacs.password } : undefined,
          timeout: 8000,
        });
        await pool.query("UPDATE mwl_entries SET status=$1, updated_at=NOW() WHERE id=$2", ["PUSHED", saved.id]);
        return { ok: true, url, response: res.data, dbEntry: saved };
      } catch (err) {
        lastErr = err;
      }
    }
    // all failed
    await pool.query("UPDATE mwl_entries SET status=$1, updated_at=NOW() WHERE id=$2", ["FAILED", saved.id]);
    return { ok: false, message: "Orthanc MWL push failed", detail: lastErr && (lastErr.message || (lastErr.response && lastErr.response.data)), dbEntry: saved };
  }

  // DCM4CHEE path
  if (/dcm4chee/i.test(pacs.type || "") || (base && base.includes("dcm4chee"))) {
    const endpoints = [
      `${base}/rs/mwl`,
      `${base}/mwl`,
      `${base}/dicom-web/mwl`,
    ];
    let lastErr = null;
    for (const url of endpoints) {
      try {
        const res = await axios.post(url, payloadForPACS, {
          auth: pacs.username && pacs.password ? { username: pacs.username, password: pacs.password } : undefined,
          timeout: 8000,
        });
        await pool.query("UPDATE mwl_entries SET status=$1, updated_at=NOW() WHERE id=$2", ["PUSHED", saved.id]);
        return { ok: true, url, response: res.data, dbEntry: saved };
      } catch (err) {
        lastErr = err;
      }
    }
    await pool.query("UPDATE mwl_entries SET status=$1, updated_at=NOW() WHERE id=$2", ["FAILED", saved.id]);
    return { ok: false, message: "DCM4CHEE MWL push failed", detail: lastErr && (lastErr.message || (lastErr.response && lastErr.response.data)), dbEntry: saved };
  }

  // Unknown pacs: saved locally for manual push
  return { ok: false, message: "PACS type not recognized for automatic MWL push; saved locally", dbEntry: saved };
}

module.exports = { createMWL, saveMWLEntry };
