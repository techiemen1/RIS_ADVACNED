const { pool } = require('../config/postgres');

const create = async (data) => {
  const q = `INSERT INTO appointments
    (patient_id, patient_name, modality, accession_number, requested_procedure_id, scheduled_start, scheduled_end, station_aet, status, created_by, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    RETURNING *`;
  const params = [
    data.patient_id,
    data.patient_name || null,
    data.modality,
    data.accession_number || null,
    data.requested_procedure_id || null,
    data.scheduled_start,
    data.scheduled_end || null,
    data.station_aet || null,
    data.status || 'SCHEDULED',
    data.created_by || null
  ];
  const r = await pool.query(q, params);
  return r.rows[0];
};

const list = async (filter = {}) => {
  const where = [];
  const params = [];
  let i = 1;
  if (filter.patient_id) { where.push(`patient_id=$${i++}`); params.push(filter.patient_id); }
  if (filter.status) { where.push(`status=$${i++}`); params.push(filter.status); }
  if (filter.modality) { where.push(`modality=$${i++}`); params.push(filter.modality); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Join with patients to get MRN and ID info
  const q = `
    SELECT a.*, p.mrn, p.id_number, p.aadhaar_number
    FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    ${whereSql} 
    ORDER BY a.scheduled_start ASC`;

  const r = await pool.query(q, params);
  return r.rows;
};

const getById = async (id) => {
  const r = await pool.query('SELECT * FROM appointments WHERE id=$1', [id]);
  return r.rows[0];
};

const update = async (id, data) => {
  const fields = [];
  const params = [];
  let i = 1;
  for (const k of ['patient_id', 'patient_name', 'modality', 'accession_number', 'requested_procedure_id', 'scheduled_start', 'scheduled_end', 'station_aet', 'status']) {
    if (Object.prototype.hasOwnProperty.call(data, k)) {
      fields.push(`${k}=$${i++}`);
      params.push(data[k]);
    }
  }
  if (fields.length === 0) return getById(id);
  params.push(id);
  const q = `UPDATE appointments SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${i} RETURNING *`;
  const r = await pool.query(q, params);
  return r.rows[0];
};

const remove = async (id) => {
  // Soft delete: set status CANCELLED
  const r = await pool.query(`UPDATE appointments SET status='CANCELLED', updated_at=NOW() WHERE id=$1 RETURNING *`, [id]);
  return r.rows[0];
};

module.exports = { create, list, getById, update, remove };
