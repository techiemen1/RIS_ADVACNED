const { pool } = require('../config/postgres');

exports.createWorklistEntry = async (data) => {
  const {
    patient_id, study_instance_uid, modality, study_date, status, assigned_to
  } = data;

  const result = await pool.query(
    `INSERT INTO worklist
      (patient_id, study_instance_uid, modality, study_date, status, assigned_to, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)
     RETURNING *`,
    [patient_id, study_instance_uid, modality, study_date, status, assigned_to]
  );
  return result.rows[0];
};

exports.getWorklist = async (assignedTo = null) => {
  let query = `SELECT w.*, p.first_name, p.last_name FROM worklist w
               JOIN patients p ON w.patient_id = p.id
               ORDER BY w.study_date DESC`;
  const params = [];
  if (assignedTo) {
    query = `SELECT w.*, p.first_name, p.last_name FROM worklist w
             JOIN patients p ON w.patient_id = p.id
             WHERE w.assigned_to=$1
             ORDER BY w.study_date DESC`;
    params.push(assignedTo);
  }
  const result = await pool.query(query, params);
  return result.rows;
};
