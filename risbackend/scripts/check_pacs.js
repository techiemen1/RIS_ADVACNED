const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');

async function check() {
    try {
        const res = await pool.query('SELECT * FROM pacs_servers');
        console.log(`Found ${res.rows.length} PACS servers.`);
        if (res.rows.length > 0) console.table(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
