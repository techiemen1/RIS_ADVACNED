require("dotenv").config();
const { pool } = require("./config/postgres");

async function run() {
    try {
        const t1 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'report_key_images';`);
        console.log("report_key_images columns:", t1.rows.map(c => c.column_name));
        pool.end();
    } catch (err) {
        console.error(err);
    }
}

run();
