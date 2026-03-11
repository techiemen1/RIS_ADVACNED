const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');

async function check() {
    const client = await pool.connect();
    try {
        const resP = await client.query('SELECT count(*) FROM patients');
        const resO = await client.query('SELECT count(*) FROM orders');
        const resB = await client.query('SELECT count(*) FROM billing');
        const resR = await client.query('SELECT count(*) FROM reports');
        console.log(`Patients: ${resP.rows[0].count}`);
        console.log(`Orders: ${resO.rows[0].count}`);
        console.log(`Billing: ${resB.rows[0].count}`);
        console.log(`Reports: ${resR.rows[0].count}`);
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit();
    }
}
check();
