// controllers/appointmentsController.js
const { pool } = require('../config/postgres');
const appointmentsService = require('../services/appointmentsService');

exports.list = async (req, res) => {
  try {
    const { patient_id, status, modality, from, to } = req.query;
    const where = [], params = [], q = [];
    let i = 1;
    if (patient_id) { where.push(`patient_id = $${i++}`); params.push(patient_id); }
    if (status) { where.push(`status = $${i++}`); params.push(status); }
    if (modality) { where.push(`modality = $${i++}`); params.push(modality); }
    if (from) { where.push(`scheduled_start >= $${i++}`); params.push(from); }
    if (to) { where.push(`scheduled_start <= $${i++}`); params.push(to); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT * FROM appointments ${whereSql} ORDER BY scheduled_start ASC LIMIT 2000`;
    const r = await pool.query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error('appointments.list', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM appointments WHERE id=$1', [req.params.id]);
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error('appointments.getById', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.scheduled_start) return res.status(400).json({ success:false, message: 'scheduled_start required' });

    let accession = payload.accession_number || null;
    if (!accession) accession = await appointmentsService.generateAccession();

    const q = `
      INSERT INTO appointments
      (patient_id, patient_name, modality, accession_number, requested_procedure_id, scheduled_start, scheduled_end, station_aet, status, created_by, created_at, study_instance_uid)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11) RETURNING *
    `;
    const params = [
      payload.patient_id || null,
      payload.patient_name || null,
      payload.modality || null,
      accession,
      payload.requested_procedure_id || null,
      payload.scheduled_start,
      payload.scheduled_end || null,
      payload.station_aet || null,
      payload.status || 'SCHEDULED',
      req.user?.username || payload.created_by || 'system',
      payload.study_instance_uid || null
    ];
    const r = await pool.query(q, params);
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error('appointments.create', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const fields = [], params = [];
    let i = 1;
    const updatable = ['patient_id','patient_name','modality','accession_number','requested_procedure_id','scheduled_start','scheduled_end','station_aet','status','study_instance_uid'];
    for (const k of updatable) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        fields.push(`${k}=$${i++}`); params.push(body[k]);
      }
    }
    if (fields.length === 0) {
      const r = await pool.query('SELECT * FROM appointments WHERE id=$1', [id]);
      return res.json({ success: true, data: r.rows[0] });
    }
    params.push(id);
    const q = `UPDATE appointments SET ${fields.join(',')}, updated_at=NOW() WHERE id=$${i} RETURNING *`;
    const r = await pool.query(q, params);
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error('appointments.update', err);
    res.status(500).json({ success:false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query('DELETE FROM appointments WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('appointments.remove', err);
    res.status(500).json({ success:false, message: err.message });
  }
};
