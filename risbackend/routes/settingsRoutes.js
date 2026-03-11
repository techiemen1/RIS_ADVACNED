const express = require("express");
const router = express.Router();
const { pool } = require("../config/postgres");
const { verifyToken, authorize } = require("../middleware/authMiddleware");

// Get all settings (namespaced by key)
router.get("/", verifyToken, async (req, res) => {
  try {
    const r = await pool.query("SELECT key, value FROM system_settings");
    const obj = {};
    r.rows.forEach(row => obj[row.key] = row.value);
    res.json({ success: true, data: obj });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Upsert a setting
router.post("/", verifyToken, authorize(["admin"]), async (req, res) => {
  const { key, value } = req.body;
  try {
    const v = typeof value === "object" ? JSON.stringify(value) : value;
    await pool.query(`
      INSERT INTO system_settings(key, value) VALUES($1,$2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [key, v]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
