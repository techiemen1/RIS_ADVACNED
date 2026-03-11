// config/postgres.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING,
  connectionTimeoutMillis: 10000, // Increased to 10s
  idleTimeoutMillis: 10000,
  max: 20
});

pool.on('error', (err) => {
  console.error('❌ Unexpected Postgres Client Error:', err.message);
  // Do not exit process; let it recover
});

module.exports = { pool };
