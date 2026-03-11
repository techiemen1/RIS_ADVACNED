const { pool } = require("../config/postgres");

/**
 * Simple key/value JSON settings storage using `settings` table.
 * key: text (primary), value: jsonb
 */

async function getSetting(key, fallback = null) {
  const r = await pool.query("SELECT value FROM settings WHERE key=$1", [key]);
  if (r.rows.length === 0) return fallback;
  return r.rows[0].value;
}

async function upsertSetting(key, value) {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1,$2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [key, value]
  );
}

exports.getModalities = async (req, res) => {
  try {
    const data = await getSetting("modalities", ["CR","CT","MR","US","DX","MG","NM"]);
    res.json({ success: true, data });
  } catch (err) {
    console.error("getModalities", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveModalities = async (req, res) => {
  try {
    const modalities = req.body?.modalities ?? req.body ?? [];
    await upsertSetting("modalities", modalities);
    res.json({ success: true });
  } catch (err) {
    console.error("saveModalities", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPacs = async (req, res) => {
  try {
    const data = await getSetting("pacs", []);
    res.json({ success: true, data });
  } catch (err) {
    console.error("getPacs", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.savePacs = async (req, res) => {
  try {
    const cfg = req.body;
    // Expect object OR array — keep as is
    await upsertSetting("pacs", cfg);
    res.json({ success: true });
  } catch (err) {
    console.error("savePacs", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReportHeader = async (req, res) => {
  try {
    const data = await getSetting("report_header", {});
    res.json({ success: true, data });
  } catch (err) {
    console.error("getReportHeader", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveReportHeader = async (req, res) => {
  try {
    const data = req.body || {};
    await upsertSetting("report_header", data);
    res.json({ success: true });
  } catch (err) {
    console.error("saveReportHeader", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSystemInfo = async (req, res) => {
  try {
    // Minimal checks (expandable)
    const r = await pool.query("SELECT current_database() as db");
    res.json({
      success: true,
      data: {
        database: r.rows[0]?.db ?? null,
        server_time: new Date(),
        hostname: require("os").hostname()
      }
    });
  } catch (err) {
    console.error("getSystemInfo", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
