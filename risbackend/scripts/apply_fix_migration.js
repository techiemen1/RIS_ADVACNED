const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { pool } = require("../config/postgres");
const fs = require("fs");

const runMigration = async () => {
    try {
        const migrationFile = path.join(__dirname, "../migrations/20260207_fix_users_schema.sql");
        const sql = fs.readFileSync(migrationFile, "utf8");

        console.log("Applying migration: 20260207_fix_users_schema.sql...");

        await pool.query("BEGIN");
        await pool.query(sql);
        await pool.query("COMMIT");

        console.log("✅ Migration applied successfully.");
        process.exit(0);
    } catch (err) {
        await pool.query("ROLLBACK");
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
};

runMigration();
