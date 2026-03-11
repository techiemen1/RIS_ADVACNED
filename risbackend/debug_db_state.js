require("dotenv").config();
const { pool } = require("./config/postgres");

async function run() {
    try {
        console.log("--- Checking Patients Columns ---");
        const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'patients';`);
        console.log("Patients columns:", cols.rows.map(c => c.column_name).sort());

        console.log("\n--- Checking Sequences ---");
        const seqs = await pool.query(`SELECT sequence_name FROM information_schema.sequences;`);
        console.log("Sequences:", seqs.rows.map(s => s.sequence_name).sort());

        pool.end();
    } catch (err) {
        console.error(err);
    }
}

run();
