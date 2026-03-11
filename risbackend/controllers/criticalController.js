const { pool } = require("../config/postgres");

exports.markCritical = async (req, res) => {
  const {
    studyUID,
    reportId,
    severity,
    reason,
    notifyTo
  } = req.body;

  const userId = req.user.id;

  const q = await pool.query(
    `INSERT INTO critical_results
     (study_instance_uid, report_id, marked_by, severity, reason, notified_to)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [studyUID, reportId, userId, severity, reason, notifyTo]
  );

  await pool.query(
    `INSERT INTO critical_ack_logs (critical_id, action, actor, actor_role)
     VALUES ($1,'notified',$2,'radiologist')`,
    [q.rows[0].id, userId]
  );

  res.json({ success: true, data: q.rows[0] });
};

exports.acknowledge = async (req, res) => {
  const { criticalId } = req.body;
  const userId = req.user.id;

  await pool.query(
    `UPDATE critical_results
     SET acknowledged=true,
         acknowledged_at=now(),
         acknowledged_by=$1
     WHERE id=$2`,
    [userId, criticalId]
  );

  await pool.query(
    `INSERT INTO critical_ack_logs (critical_id, action, actor, actor_role)
     VALUES ($1,'acknowledged',$2,'clinician')`,
    [criticalId, userId]
  );

  res.json({ success: true });
};

