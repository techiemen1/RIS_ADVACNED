const { pool } = require('../db');

exports.getConfig = async () => {
  const res = await pool.query('SELECT * FROM system_config');
  return res.rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
};

exports.setConfig = async (key, value) => {
  await pool.query(
    `INSERT INTO system_config(key, value) VALUES($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = $2`,
    [key, value]
  );
};
