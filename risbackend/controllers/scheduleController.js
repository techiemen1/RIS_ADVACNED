// controllers/scheduleController.js
const { pool } = require('../config/postgres');

exports.getAllSchedules = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schedules ORDER BY appointment_date DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const { patient_id, doctor_id, appointment_date, status } = req.body;
    const result = await pool.query(
      `INSERT INTO schedules (patient_id, doctor_id, appointment_date, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [patient_id, doctor_id, appointment_date, status || 'scheduled']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date, status } = req.body;
    const result = await pool.query(
      `UPDATE schedules SET appointment_date = $1, status = $2 WHERE id = $3 RETURNING *`,
      [appointment_date, status, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Schedule not found' });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM schedules WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Schedule not found' });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
};
