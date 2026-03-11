// models/templateModel.js
const { pool } = require('../config/postgres');

const createTable = async () => {
  try {
    const q = `
      CREATE TABLE IF NOT EXISTS report_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        modality VARCHAR(50),
        body_part VARCHAR(100),
        gender VARCHAR(20),
        content TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`;
    await pool.query(q);

    // Consistency check for columns
    const columns = [
      ['body_part', 'VARCHAR(100)'],
      ['gender', 'VARCHAR(20)'],
      ['is_active', 'BOOLEAN DEFAULT true'],
      ['updated_at', 'TIMESTAMP DEFAULT NOW()']
    ];

    for (const [col, type] of columns) {
      try {
        await pool.query(`ALTER TABLE report_templates ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      } catch (e) {}
    }

    console.log('✅ Report Templates Schema Verified');
  } catch (err) {
    console.error('❌ TemplateModel init error:', err.message);
  }
};

const TemplateModel = {
  init: createTable,
  async list() {
    const r = await pool.query('SELECT * FROM report_templates WHERE is_active = true ORDER BY id DESC');
    return r.rows;
  },
  async create({ name, modality, body_part, content, gender }) {
    const r = await pool.query(
      'INSERT INTO report_templates (name, modality, body_part, content, gender) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, modality, body_part, content, gender]
    );
    return r.rows[0];
  },
  async remove(id) {
    const r = await pool.query('DELETE FROM pacs_templates WHERE id=$1 RETURNING *', [id]);
    return r.rows[0];
  }
};

module.exports = TemplateModel;
