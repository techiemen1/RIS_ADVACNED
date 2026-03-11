// controllers/collabController.js
const { pool } = require('../config/postgres');
const { v4: uuidv4 } = require('uuid');

exports.createSession = async (req, res) => {
  try {
    const { study_uid } = req.body;
    const session_id = uuidv4();
    const r = await pool.query(`INSERT INTO collab_sessions (session_id, study_uid) VALUES($1,$2) RETURNING *`, [session_id, study_uid]);
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error('collab.create', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const r = await pool.query(`SELECT * FROM collab_sessions WHERE session_id=$1`, [sessionId]);
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'not found' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error('collab.get', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const document = req.body.document || '';
    const r = await pool.query(`UPDATE collab_sessions SET document=$1, updated_at=NOW() WHERE session_id=$2 RETURNING *`, [document, sessionId]);
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error('collab.update', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
