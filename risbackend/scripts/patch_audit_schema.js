require("dotenv").config();
const { pool } = require("../config/postgres");

async function run() {
    try {
        console.log("🛠️ Patching 'audit_logs' table schema...");

        // Add 'entity' column
        await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity VARCHAR(50);`);
        console.log("Added 'entity' column.");

        // Add 'entity_id' column
        await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(50);`);
        console.log("Added 'entity_id' column.");

        // Add 'payload' column
        await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS payload TEXT;`);
        console.log("Added 'payload' column.");

        console.log("✅ Schema patch successful.");
    } catch (err) {
        console.error("❌ Patch validation failed:", err);
    } finally {
        pool.end();
    }
}

run();
