// controllers/signatureController.js
const { pool } = require("../config/postgres");
const fs = require("fs");
const path = require("path");

const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_signatures (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
};

exports.getSignature = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    await ensureTable();
    const r = await pool.query("SELECT * FROM user_signatures WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1", [userId]);
    if (r.rowCount === 0) return res.json({ success: true, data: null });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error("getSignature error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadSignature = async (req, res) => {
  try {
    const userId = Number(req.body.user_id || req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: "Missing user_id" });
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "Missing file" });

    await ensureTable();
    const filePath = `/uploads/${file.filename}`;
    const r = await pool.query("INSERT INTO user_signatures (user_id, file_path) VALUES ($1,$2) RETURNING *", [userId, filePath]);
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error("uploadSignature error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
