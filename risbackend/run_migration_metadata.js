require("dotenv").config();
const { pool } = require("./config/postgres");

async function run() {
    try {
        console.log("Expanding study_metadata...");
        const qs = [
            "ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS patient_sex TEXT;",
            "ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS patient_age TEXT;",
            "ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS referring_physician TEXT;",
            "ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS body_part TEXT;"
        ];

        for (const q of qs) {
            await pool.query(q);
        }
        console.log("Done.");
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

run();
