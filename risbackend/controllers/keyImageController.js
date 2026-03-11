const { pool } = require("../config/postgres");

/* =========================================
   LIST KEY IMAGES
========================================= */
exports.list = async (req, res) => {
  try {
    const { studyUID } = req.params;

    const r = await pool.query(
      `
      SELECT id,
             sop_instance_uid,
             series_instance_uid,
             file_path,
             created_at
      FROM report_key_images
      WHERE study_instance_uid = $1
      ORDER BY created_at ASC
      `,
      [studyUID]
    );

    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error("list key images", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================
   ADD DICOM KEY IMAGE (OHIF / METADATA)
========================================= */
exports.addDicom = async (req, res) => {
  try {
    const { studyUID } = req.params;
    const { sopInstanceUID, seriesInstanceUID } = req.body;

    if (!sopInstanceUID) {
      return res.status(400).json({
        success: false,
        message: "sopInstanceUID required",
      });
    }

    const r = await pool.query(
      `
      INSERT INTO report_key_images
        (study_instance_uid, sop_instance_uid, series_instance_uid, created_by_username)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
      RETURNING *
      `,
      [
        studyUID,
        sopInstanceUID,
        seriesInstanceUID || null,
        req.user?.username || "system",
      ]
    );

    res.status(201).json({ success: true, data: r.rows[0] || null });
  } catch (err) {
    console.error("add dicom key image", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================
   UPLOAD IMAGE FILE (SCREENSHOT / FALLBACK)
========================================= */
exports.uploadFile = async (req, res) => {
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
        (study_instance_uid, file_path, created_by_username)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [studyUID, req.file.filename, req.user?.username || "system"]
    );

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error("upload key image", err);
    res.status(500).json({ success: false });
  }
};

/* =========================================
   DELETE KEY IMAGE
========================================= */
exports.remove = async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM report_key_images WHERE id = $1",
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("delete key image", err);
    res.status(500).json({ success: false });
  }
};

