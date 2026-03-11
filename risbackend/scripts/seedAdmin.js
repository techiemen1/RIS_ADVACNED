// scripts/seedAdmin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/postgres');

(async () => {
  try {
    const username = 'admin';
    const password = 'ChangeMe@123!'; // Change immediately after first login
    const hash = await bcrypt.hash(password, parseInt(process.env.PASSWORD_SALT_ROUNDS || '10'));

    // Get admin role ID or create
    const r = await pool.query('SELECT id FROM roles WHERE name=$1', ['admin']);
    let roleId = r.rows[0] ? r.rows[0].id : null;
    if (!roleId) {
      const created = await pool.query(
        'INSERT INTO roles (name, description) VALUES ($1,$2) RETURNING id',
        ['admin', 'System Administrator']
      );
      roleId = created.rows[0].id;
    }

    // Check if admin user exists
    const exists = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
    if (exists.rows.length) {
      console.log('✅ Admin user already exists');
      process.exit(0);
    }

    // Insert admin user
    const res = await pool.query(
      `INSERT INTO users (username,password_hash,role_id,full_name,email,created_by,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
      [username, hash, roleId, 'Site Admin', 'admin@example.com', 'system']
    );

    console.log('✅ Admin created id:', res.rows[0].id, 'password:', password);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
