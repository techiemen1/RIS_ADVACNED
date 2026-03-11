// models/rolePermissionModel.js
const { pool } = require('../config/postgres');

// ✅ Create role if not exists
exports.createRoleIfNotExists = async (name, description) => {
  const existing = await pool.query('SELECT * FROM roles WHERE name=$1', [name]);
  if (existing.rows.length) return existing.rows[0];

  const result = await pool.query(
    'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
    [name, description]
  );
  return result.rows[0];
};

// ✅ Set permission safely (matches your DB columns)
exports.setPermission = async (role_id, module_name, permission) => {
  const result = await pool.query(
    `INSERT INTO role_permissions (role_id, module_name, permission)
     VALUES ($1, $2, $3)
     ON CONFLICT (role_id, module_name, permission) DO NOTHING
     RETURNING *`,
    [role_id, module_name, permission]
  );
  return result.rows[0];
};
