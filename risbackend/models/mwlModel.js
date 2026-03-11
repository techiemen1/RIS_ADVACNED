// models/mwlModel.js
const { pool } = require("../config/postgres");

async function listAll() {
  const q = `SELECT id, study_instance_uid, accession_number, requested_procedure_id,
                    patient_id, patient_name, patient_id_str, patient_dob, patient_sex,
                    modality, scheduled_datetime, scheduled_station_aet, station_aet,
                    status, appointment_id, description, created_by, created_at, updated_at
             FROM mwl_entries
             ORDER BY scheduled_datetime DESC NULLS LAST, created_at DESC`;
  const r = await pool.query(q);
  return r.rows;
}

async function getById(id) {
  const r = await pool.query("SELECT * FROM mwl_entries WHERE id=$1", [id]);
  return r.rows[0] || null;
}

async function create(entry) {
  const q = `
    INSERT INTO mwl_entries
      (study_instance_uid, accession_number, requested_procedure_id,
       patient_id, patient_name, patient_id_str, patient_dob, patient_sex,
       modality, scheduled_datetime, scheduled_station_aet, station_aet,
       status, created_by, created_at, appointment_id, description)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),$15,$16) RETURNING *
  `;
  const params = [
    entry.study_instance_uid || null,
    entry.accession_number || null,
    entry.requested_procedure_id || null,
    entry.patient_id ? String(entry.patient_id) : null,
    entry.patient_name || null,
    entry.patient_id_str || null,
    entry.patient_dob || null,
    entry.patient_sex || null,
    entry.modality || null,
    entry.scheduled_datetime || null,
    entry.scheduled_station_aet || entry.station_aet || null,
    entry.station_aet || null,
    entry.status || "NEW",
    entry.created_by || "system",
    entry.appointment_id || null,
    entry.description || null
  ];
  const r = await pool.query(q, params);
  return r.rows[0];
}

async function remove(id) {
  const r = await pool.query("DELETE FROM mwl_entries WHERE id=$1 RETURNING *", [id]);
  return r.rows[0] || null;
}

async function updateStatus(id, status) {
  const r = await pool.query("UPDATE mwl_entries SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *", [status, id]);
  return r.rows[0] || null;
}

module.exports = { listAll, getById, create, remove, updateStatus };
