// models/uidModel.js
const { pool } = require("../config/postgres");
const crypto = require("crypto");

function generateStudyUID() {
  const hex = crypto.randomBytes(16).toString("hex");
  const big = BigInt("0x" + hex);
  return "2.25." + big.toString();
}

async function reserve(studyUID, reservedBy) {
  const uid = studyUID || generateStudyUID();
  await pool.query("INSERT INTO uid_reservations (study_instance_uid, reserved_by, created_at) VALUES ($1,$2,NOW())", [uid, reservedBy || "system"]);
  return uid;
}

module.exports = { generateStudyUID, reserve };
