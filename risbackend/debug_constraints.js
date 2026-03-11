require("dotenv").config();
const { pool } = require("./config/postgres");

async function run() {
    try {
        // Check for constraints on study_metadata
        const res = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'study_metadata'::regclass;
    `);
        console.log("Constraints:", res.rows);

        // Check indexes
        const res2 = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'study_metadata';
    `);
        console.log("Indexes:", res2.rows);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
