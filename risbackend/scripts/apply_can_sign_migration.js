const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { pool } = require("../config/postgres");
const fs = require("fs");

async function applyMigration() {
    const client = await pool.connect();
    try {
        console.log("Applying 'can_sign' migration...");

        const migrationPath = path.join(__dirname, "../migrations/20260207_add_can_sign_permission.sql");
        const migrationSql = fs.readFileSync(migrationPath, "utf-8");

        await client.query("BEGIN");
        await client.query(migrationSql);
        await client.query("COMMIT");

        console.log("✅ Migration applied successfully: Added 'can_sign' column.");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed:", error);
    } finally {
        client.release();
        pool.end();
    }
}

applyMigration();
