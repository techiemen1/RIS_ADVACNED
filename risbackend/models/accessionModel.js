// models/accessionModel.js
const { pool } = require("../config/postgres");

async function insert(accession, modality, createdBy) {
  const q = `INSERT INTO accession_numbers (accession, modality, created_by, created_at) VALUES ($1,$2,$3,NOW()) RETURNING *`;
  const r = await pool.query(q, [accession, modality || null, createdBy || "system"]);
  return r.rows[0];
}

async function preview(prefix = "ACC") {
  // non-reserving preview (unique-ish)
  const accession = `${prefix}${Date.now().toString(36)}`;
  return { accession };
}

module.exports = { insert, preview };
