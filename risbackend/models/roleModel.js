// models/roleModel.js
const { pool } = require('../config/postgres');

exports.getRoleById = async (id) => {
  const r = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
  return r.rows[0];
};

exports.getRoleByName = async (name) => {
  const r = await pool.query('SELECT * FROM roles WHERE name = $1', [name]);
  return r.rows[0];
};
