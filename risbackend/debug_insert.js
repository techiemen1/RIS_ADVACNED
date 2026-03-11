require("dotenv").config();
const { pool } = require("./config/postgres");

async function run() {
    const uid = '1.2.392.200036.9125.2.448818514585232.65119727480.1752217';
    try {
        console.log("Inserting...");
        const res = await pool.query(
            `INSERT INTO study_metadata 
       (study_instance_uid, patient_name)
       VALUES ($1, 'DIRECT INSERT')
       ON CONFLICT (study_instance_uid) 
       DO UPDATE SET patient_name = 'DIRECT UPDATE'
       RETURNING *`,
            [uid]
        );
        console.log("Insert res:", res.rows[0]);

        console.log("Selecting...");
        const sel = await pool.query(`SELECT * FROM study_metadata WHERE study_instance_uid = $1`, [uid]);
        console.log("Select res:", sel.rows[0]);

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
