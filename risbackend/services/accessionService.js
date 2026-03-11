// services/accessionService.js
const { pool } = require("../config/postgres");

/**
 * Simple accession generator using Postgres sequence ipacx_accession_seq
 * create sequence if not exists in migration.
 */
async function generate(prefix = "") {
  const seqName = "ipacx_accession_seq";
  const r = await pool.query(`SELECT nextval('${seqName}') AS v`);
  const num = r.rows[0].v;
  const accession = `${prefix}${String(num).padStart(6, "0")}`;
  return accession;
}

/**
 * Reserve accession (generate and insert into reservation table)
 */
async function reserve(prefix = "") {
  const accession = await generate(prefix);
  try {
    await pool.query("INSERT INTO accession_reservations (accession_number, reserved_at) VALUES ($1,NOW())", [accession]);
  } catch (e) {
    // ignore unique errors
  }
  return accession;
}

module.exports = { generate, reserve };
