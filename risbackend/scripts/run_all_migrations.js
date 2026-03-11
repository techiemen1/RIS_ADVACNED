const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');

async function runAll() {
    const client = await pool.connect();
    try {
        const files = [
            '20260110_create_orders_mwl.sql',
            '20260110_create_pacs_audit_tables.sql',
            '20260110_billing_gst.sql'
        ];

        for (const f of files) {
            console.log(`Running ${f}...`);
            const sql = fs.readFileSync(path.join(__dirname, '../migrations', f), 'utf8');
            await client.query(sql);
            console.log(`✅ ${f} applied.`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}

runAll();
