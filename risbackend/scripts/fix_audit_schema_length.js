require("dotenv").config();
const { pool } = require("../config/postgres");

async function run() {
    try {
        console.log("🛠️ Fixing 'audit_logs' schema length...");

        // Resize entity_id to support long DICOM UIDs (max 64 chars standard, but sometimes longer in wild)
        await pool.query(`ALTER TABLE audit_logs ALTER COLUMN entity_id TYPE VARCHAR(255);`);
        console.log("Resized 'entity_id' to VARCHAR(255).");

        console.log("✅ Schema patch successful.");
    } catch (err) {
        console.error("❌ Patch validation failed:", err);
    } finally {
        pool.end();
    }
}

run();
