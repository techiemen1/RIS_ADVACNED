require("dotenv").config();
const { pool } = require("./config/postgres");

async function run() {
    try {
        console.log("Adding file_path column...");
        await pool.query(`
      ALTER TABLE report_key_images ADD COLUMN IF NOT EXISTS file_path TEXT;
    `);
        console.log("Done.");
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
