const { pool } = require('../config/postgres');

const createSchedule = async (schedule) => {
  const { patient_id, modality, scheduled_time, created_by, notes, status = 'scheduled' } = schedule;
  const result = await pool.query(
    `INSERT INTO schedules
     (patient_id, modality, scheduled_time, created_by, notes, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)
     RETURNING *`,
    [patient_id, modality, scheduled_time, created_by, notes, status]
  );
  return result.rows[0];
};

const getSchedules = async (limit = 10, offset = 0) => {
  const result = await pool.query(
    `SELECT s.*, p.first_name, p.last_name 
     FROM schedules s
     JOIN patients p ON s.patient_id = p.id
     ORDER BY scheduled_time DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
};

const getScheduleById = async (id) => {
  const result = await pool.query(`SELECT * FROM schedules WHERE id = $1`, [id]);
  return result.rows[0];
};

const updateSchedule = async (id, fields) => {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  values.push(id);

  const result = await pool.query(
    `UPDATE schedules SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
    values
  );
  return result.rows[0];
};

const deleteSchedule = async (id) => {
  await pool.query(`DELETE FROM schedules WHERE id = $1`, [id]);
};

module.exports = { createSchedule, getSchedules, getScheduleById, updateSchedule, deleteSchedule };
