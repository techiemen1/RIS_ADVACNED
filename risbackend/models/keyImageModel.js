const { pool } = require('../config/postgres');

const init = async () => {
  try {
    const q = `
      CREATE TABLE IF NOT EXISTS report_key_images (
        id SERIAL PRIMARY KEY,
        study_instance_uid VARCHAR(128) NOT NULL,
        sop_instance_uid VARCHAR(128),
        series_instance_uid VARCHAR(128),
        file_path TEXT,
        created_by_username VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );`;
    await pool.query(q);

    // Consistency check for unique constraint on DICOM key images
    try {
      await pool.query(`
        ALTER TABLE report_key_images 
        ADD CONSTRAINT idx_dicom_unique UNIQUE (study_instance_uid, sop_instance_uid)
      `);
    } catch (e) {
      // Constraint might already exist
    }

    console.log('✅ KeyImage Model Schema Verified');
  } catch (err) {
    console.error('❌ KeyImage Model init error:', err.message);
  }
};

const KeyImageModel = {
  init,
  async list(studyUID) {
    const r = await pool.query(
      `SELECT * FROM report_key_images WHERE study_instance_uid = $1 ORDER BY created_at ASC`,
      [studyUID]
    );
    return r.rows;
  },
  async addDicom({ studyUID, sopInstanceUID, seriesInstanceUID, username }) {
    const r = await pool.query(
      `INSERT INTO report_key_images (study_instance_uid, sop_instance_uid, series_instance_uid, created_by_username)
       VALUES ($1, $2, $3, $4) ON CONFLICT ON CONSTRAINT idx_dicom_unique DO NOTHING RETURNING *`,
      [studyUID, sopInstanceUID, seriesInstanceUID, username]
    );
    return r.rows[0];
  },
  async addFile({ studyUID, filePath, username }) {
    const r = await pool.query(
      `INSERT INTO report_key_images (study_instance_uid, file_path, created_by_username)
       VALUES ($1, $2, $3) RETURNING *`,
      [studyUID, filePath, username]
    );
    return r.rows[0];
  },
  async remove(id) {
    const r = await pool.query('DELETE FROM report_key_images WHERE id = $1 RETURNING *', [id]);
    return r.rows[0];
  }
};

module.exports = KeyImageModel;
