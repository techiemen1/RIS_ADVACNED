// middleware/permissionMiddleware.js
const { pool } = require('../config/postgres');

exports.verifyPermission = (module_name, permission) => {
  return async (req, res, next) => {
    try {
      // If no user in request (not authenticated)
      if (!req.user || !req.user.role_id) return res.status(401).json({ error: 'Unauthorized' });

      const roleId = req.user.role_id;
      const q = `SELECT 1 FROM role_permissions WHERE role_id = $1 AND module_name = $2 AND permission = $3 LIMIT 1`;
      const r = await pool.query(q, [roleId, module_name, permission]);
      if (r.rowCount > 0) return next();

      // fallback: if admin role id -> allow
      const isAdmin = await pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
      if (isAdmin.rows[0] && isAdmin.rows[0].name === 'admin') return next();

      return res.status(403).json({ error: 'Permission denied' });
    } catch (err) {
      console.error('verifyPermission error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  };
};
