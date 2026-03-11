const { pool } = require('../config/postgres');

/**
 * Log an audit entry
 * @param {Object} data
 * @param {string} data.username
 * @param {string} data.role
 * @param {string} data.action
 * @param {string} [data.ip]
 * @param {string} [data.userAgent]
 */
exports.create = async ({ username, role, action, ip, userAgent }) => {
  const query = `
    INSERT INTO audit_logs (username, role, action, ip_address, user_agent, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
  `;
  const values = [username, role, action, ip || '', userAgent || ''];

  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    console.error('AuditLog.create failed', err);
    throw err;
  }
};

/**
 * Get recent audit logs
 */
exports.find = async () => {
  const query = `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`;
  const res = await pool.query(query);
  return {
    sort: () => ({
      limit: () => res.rows // Mocking mongoose-like chaining or just returning rows
    })
  };
};

exports.getLogs = async () => {
  const query = `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`;
  const res = await pool.query(query);
  return res.rows;
}
