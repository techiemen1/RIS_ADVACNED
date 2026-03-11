const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://ipacx:ipacx@localhost:5432/ris_advanced_db'
});

async function check() {
  try {
    console.log('--- Orders Table ---');
    const ordersRes = await pool.query('SELECT * FROM orders LIMIT 2');
    console.log('Count:', ordersRes.rowCount);
    console.log('Sample:', JSON.stringify(ordersRes.rows, null, 2));

    console.log('--- Appointments Table ---');
    const apptsRes = await pool.query('SELECT * FROM appointments LIMIT 2');
    console.log('Count:', apptsRes.rowCount);
    console.log('Sample:', JSON.stringify(apptsRes.rows, null, 2));

    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

check();
