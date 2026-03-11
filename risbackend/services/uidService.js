// services/uidService.js
const { pool } = require("../config/postgres");
const crypto = require("crypto");

function generateStudyUID() {
  const hex = crypto.randomBytes(16).toString("hex");
  const big = BigInt("0x" + hex);
  return "2.25." + big.toString();
}

async function reserveUID({ requested = null, reservedBy = "system" }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const uid = requested || generateStudyUID();

    await client.query(
      `INSERT INTO uid_reservations (study_instance_uid, reserved_by)
       VALUES ($1,$2)`,
      [uid, reservedBy]
    );

    await client.query("COMMIT");
    return { uid };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { generateStudyUID, reserveUID };
