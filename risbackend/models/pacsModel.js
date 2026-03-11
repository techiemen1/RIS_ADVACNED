// models/pacsModel.js
const { pool } = require('../config/postgres');

const createTable = async () => {
  try {
    const q = `
      CREATE TABLE IF NOT EXISTS pacs_servers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL,
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL,
        aetitle VARCHAR(100),
        username VARCHAR(100),
        password VARCHAR(100),
        base_url VARCHAR(1024),
        protocol VARCHAR(20) DEFAULT 'DICOMWEB',
        description TEXT,
        wado_uri VARCHAR(255),
        wado_rs VARCHAR(255),
        qido_rs VARCHAR(255),
        stow_rs VARCHAR(255),
        last_connected TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`;

    await pool.query(q);

    // Ensure ALL columns exist if table was created earlier without them
    const columns = [
      ['aetitle', "VARCHAR(100)"],
      ['username', "VARCHAR(100)"],
      ['password', "VARCHAR(100)"],
      ['base_url', "VARCHAR(1024)"],
      ['protocol', "VARCHAR(20) DEFAULT 'DICOMWEB'"],
      ['description', "TEXT"],
      ['wado_uri', "VARCHAR(255)"],
      ['wado_rs', "VARCHAR(255)"],
      ['qido_rs', "VARCHAR(255)"],
      ['stow_rs', "VARCHAR(255)"],
      ['viewer_url', "VARCHAR(1024)"],
      ['viewer_type', "VARCHAR(50) DEFAULT 'ohif'"],
      ['last_connected', "TIMESTAMP"],
      ['created_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"],
      ['updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"]
    ];

    for (const [col, type] of columns) {
      try {
        await pool.query(`ALTER TABLE pacs_servers ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      } catch (e) {
        console.warn(`[PACSModel] Failed to add/check column ${col}:`, e.message);
      }
    }

    // Ensure system_settings exists too (fixing /api/settings 500)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ PACS & Settings Schemas Verified');

  } catch (err) {
    console.error('❌ PACSModel/Settings init error:', err);
  }
};

const PACSModel = {
  async init() { await createTable(); },

  async getAll(filters = {}) {
    const { branchScope = '' } = filters;
    const res = await pool.query(`SELECT * FROM pacs_servers WHERE 1=1 ${branchScope} ORDER BY id ASC`);
    return res.rows;
  },

  async getById(id) {
    const res = await pool.query('SELECT * FROM pacs_servers WHERE id=$1', [id]);
    return res.rows[0];
  },

  async create(data) {
    const { name, type, host, port, aetitle, username, password, base_url, is_active, protocol, description, wado_uri, wado_rs, qido_rs, stow_rs, viewer_url, viewer_type } = data;
    const res = await pool.query(
      `INSERT INTO pacs_servers (name,type,host,port,aetitle,username,password,base_url,is_active,protocol,description,wado_uri,wado_rs,qido_rs,stow_rs,viewer_url,viewer_type,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW()) RETURNING *`,
      [name, type, host, port, aetitle || null, username || null, password || null, base_url || null, is_active ?? true, protocol || 'DICOMWEB', description || null, wado_uri, wado_rs, qido_rs, stow_rs, viewer_url || null, viewer_type || 'ohif']
    );
    return res.rows[0];
  },

  async update(id, data) {
    const { name, type, host, port, aetitle, username, password, base_url, is_active, protocol, description, wado_uri, wado_rs, qido_rs, stow_rs, viewer_url, viewer_type } = data;
    const res = await pool.query(
      `UPDATE pacs_servers SET name=$1,type=$2,host=$3,port=$4,aetitle=$5,username=$6,password=$7,base_url=$8,is_active=$9,protocol=$10,description=$11,wado_uri=$12,wado_rs=$13,qido_rs=$14,stow_rs=$15,viewer_url=$16,viewer_type=$17,updated_at=NOW()
       WHERE id=$18 RETURNING *`,
      [name, type, host, port, aetitle || null, username || null, password || null, base_url || null, is_active ?? true, protocol || 'DICOMWEB', description || null, wado_uri, wado_rs, qido_rs, stow_rs, viewer_url || null, viewer_type || 'ohif', id]
    );
    return res.rows[0];
  },

  async remove(id) {
    const res = await pool.query('DELETE FROM pacs_servers WHERE id=$1 RETURNING *', [id]);
    return res.rows[0];
  },
};

module.exports = PACSModel;
