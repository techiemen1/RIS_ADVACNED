/**
 * PACS Server Model (PostgreSQL)
 * Author: iPacx Tech | 2025
 * Description: Stores all PACS server configurations (Orthanc, DCM4CHEE, Conquest, etc.)
 */

// models/pacsModel.js
const { pool } = require('../config/postgres');

const createTable = async () => {
  const query = `
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
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
};

const PACSModel = {
  async init() { await createTable(); },

  async getAll() {
    const res = await pool.query('SELECT * FROM pacs_servers ORDER BY id ASC');
    return res.rows;
  },

  async getById(id) {
    const res = await pool.query('SELECT * FROM pacs_servers WHERE id=$1', [id]);
    return res.rows[0];
  },

  async create(data) {
    const { name, type, host, port, aetitle, username, password, base_url, is_active } = data;
    const res = await pool.query(
      `INSERT INTO pacs_servers (name,type,host,port,aetitle,username,password,base_url,is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, type, host, port, aetitle || null, username || null, password || null, base_url || null, is_active ?? true]
    );
    return res.rows[0];
  },

  async add(data) { return this.create(data); },

  async update(id, data) {
    const { name, type, host, port, aetitle, username, password, base_url, is_active } = data;
    const res = await pool.query(
      `UPDATE pacs_servers SET name=$1,type=$2,host=$3,port=$4,aetitle=$5,username=$6,password=$7,base_url=$8,is_active=$9
       WHERE id=$10 RETURNING *`,
      [name, type, host, port, aetitle || null, username || null, password || null, base_url || null, is_active ?? true, id]
    );
    return res.rows[0];
  },

  async remove(id) {
    const res = await pool.query('DELETE FROM pacs_servers WHERE id=$1 RETURNING *', [id]);
    return res.rows[0];
  },
};

module.exports = PACSModel;
