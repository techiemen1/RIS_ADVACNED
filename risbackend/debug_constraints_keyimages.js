require("dotenv").config();
const { pool } = require("./config/postgres");

async function run() {
    try {
        // Check columns and their nullability
        const res = await pool.query(`
      SELECT column_name, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'report_key_images';
    `);
        console.log("Columns:", res.rows);
        pool.end();
    } catch (err) {
        console.error(err);
    }
}
run();
