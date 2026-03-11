const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('reports', 'pacs_templates', 'inventory', 'patient_consents', 'orders', 'worklist')
            ORDER BY table_name, ordinal_position;
        `);
        console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
inspect();
