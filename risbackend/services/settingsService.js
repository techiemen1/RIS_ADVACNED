// services/settingsService.js
const { pool } = require('../config/postgres');

async function getSetting(key) {
  const r = await pool.query('SELECT value FROM app_settings WHERE key=$1', [key]);
  return r.rows[0] ? r.rows[0].value : null;
}

async function setSetting(key, value) {
  await pool.query(`INSERT INTO app_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [key, value]);
  return true;
}

module.exports = { getSetting, setSetting };
