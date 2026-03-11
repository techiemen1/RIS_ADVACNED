// models/appointmentsModel.js
const { pool } = require('../config/postgres');

const createTable = async () => {
  const q = `
  CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(100),
    patient_name VARCHAR(255),
    modality VARCHAR(50) NOT NULL,
    accession_number VARCHAR(100),
    requested_procedure_id VARCHAR(100),
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP,
    station_aet VARCHAR(100),
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    created_by VARCHAR(100),
    body_part VARCHAR(100),
    scan_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`;
  await pool.query(q);

  // Self-healing: Ensure all columns exist
  const columns = [
    ['patient_id', 'VARCHAR(100)'],
    ['patient_name', 'VARCHAR(255)'],
    ['modality', 'VARCHAR(50)'],
    ['accession_number', 'VARCHAR(100)'],
    ['requested_procedure_id', 'VARCHAR(100)'],
    ['scheduled_start', 'TIMESTAMP'],
    ['scheduled_end', 'TIMESTAMP'],
    ['station_aet', 'VARCHAR(100)'],
    ['status', "VARCHAR(50) DEFAULT 'SCHEDULED'"],
    ['created_by', 'VARCHAR(100)'],
    ['study_instance_uid', 'VARCHAR(255)'],
    ['body_part', 'VARCHAR(100)'],
    ['scan_type', 'VARCHAR(100)'],
    ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP']
  ];

  for (const [col, type] of columns) {
    try {
      await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ${col} ${type}`);
    } catch (e) {
      // Ignore errors if column already exists with different but compatible constraints
    }
  }
  console.log('✅ Appointment Model Schema Verified');
};

const create = async (data) => {
  const q = `INSERT INTO appointments
    (patient_id, patient_name, modality, accession_number, requested_procedure_id,
     scheduled_start, scheduled_end, station_aet, status, created_by, body_part, scan_type, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
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
    data.created_by || null,
    data.body_part || null,
    data.scan_type || null
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
  if (filter.from) { where.push(`scheduled_start >= $${i++}`); params.push(filter.from); }
  if (filter.to) { where.push(`scheduled_start <= $${i++}`); params.push(filter.to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const q = `SELECT * FROM appointments ${whereSql} ORDER BY scheduled_start ASC`;
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
  for (const k of ['patient_id','patient_name','modality','accession_number','requested_procedure_id','scheduled_start','scheduled_end','station_aet','status','body_part','scan_type']) {
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
  const r = await pool.query(`UPDATE appointments SET status='CANCELLED', updated_at=NOW() WHERE id=$1 RETURNING *`, [id]);
  return r.rows[0];
};

module.exports = { init: createTable, create, list, getById, update, remove };
