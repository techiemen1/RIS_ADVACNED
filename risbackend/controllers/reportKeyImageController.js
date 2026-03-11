// controllers/reportKeyImageController.js
const { pool } = require("../config/postgres");

/* =========================
   UPLOAD IMAGE FILE
========================= */
exports.uploadKeyImage = async (req, res) => {
  try {
    const { studyUID } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const r = await pool.query(
      `
      INSERT INTO report_key_images
        (study_instance_uid, file_path, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *
      `,
      [studyUID, req.file.filename]
    );

    res.status(201).json({
      success: true,
      data: r.rows[0],
    });
  } catch (err) {
    console.error("uploadKeyImage:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================
   LIST
========================= */
exports.listKeyImages = async (req, res) => {
  try {
    const { studyUID } = req.params;

    const r = await pool.query(
      `
      SELECT id, file_path, created_at
      FROM report_key_images
      WHERE study_instance_uid = $1
      ORDER BY created_at ASC
      `,
      [studyUID]
    );

    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error("listKeyImages:", err);
    res.status(500).json({ success: false });
  }
};

/* =========================
   DELETE
========================= */
exports.deleteKeyImage = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "DELETE FROM report_key_images WHERE id = $1",
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("deleteKeyImage:", err);
    res.status(500).json({ success: false });
  }
};

