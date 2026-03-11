const { pool } = require("../config/postgres");

exports.upload = async (req, res) => {
  try {
    const { studyUID } = req.body;
    if (!studyUID || !req.file) {
      return res.status(400).json({ success: false });
    }

    const r = await pool.query(
      `
      INSERT INTO report_key_images
        (study_instance_uid, file_path, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [studyUID, req.file.filename, req.user?.id || null]
    );

    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error("upload screenshot key image", err);
    res.status(500).json({ success: false });
  }
};

