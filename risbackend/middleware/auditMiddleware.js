const { pool } = require("../config/postgres");

module.exports = function audit(action, entity) {
  return async (req, res, next) => {
    res.on("finish", async () => {
      try {
        if (!res.locals.auditEntityId) return;

        await pool.query(
          `
          INSERT INTO audit_logs
            (username, action, entity, entity_id, ip_address, payload)
          VALUES ($1,$2,$3,$4,$5,$6)
          `,
          [
            req.user?.username || "system",
            action,
            entity,
            String(res.locals.auditEntityId),
            req.ip,
            JSON.stringify(req.body || {}),
          ]
        );
      } catch (err) {
        console.error("Audit log failed:", err.message);
      }
    });

    next();
  };
};
