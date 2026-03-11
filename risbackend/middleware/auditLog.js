// middleware/auditLog.js
const { pool } = require("../config/postgres");

/**
 * Audit log middleware
 * Logs WHO did WHAT, WHEN, and on WHICH entity
 */
module.exports.auditLog = (action, entity) => {
  return async (req, res, next) => {
    const start = Date.now();

    res.on("finish", async () => {
      try {
        // Only log successful writes
        if (res.statusCode < 200 || res.statusCode >= 300) return;

        const user = req.user?.username || "system";
        const ip = req.ip;
        const payload = req.body ? JSON.stringify(req.body).slice(0, 5000) : null;

        await pool.query(
          `
          INSERT INTO audit_logs
            (username, action, entity, entity_id, ip_address, payload, created_at)
          VALUES ($1,$2,$3,$4,$5,$6,NOW())
          `,
          [
            user,
            action,
            entity,
            req.body?.studyUID || req.params?.studyId || null,
            ip,
            payload,
          ]
        );
      } catch (e) {
        console.error("Audit log failed", e.message);
      }
    });

    next();
  };
};
