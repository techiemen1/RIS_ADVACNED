// scripts/apply_migration.js
require("dotenv").config();
const { pool } = require("../config/postgres");
const fs = require("fs");
const path = require("path");

const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error("Usage: node scripts/apply_migration.js <migration_file>");
    process.exit(1);
}

const runMigration = async () => {
    const filePath = path.resolve(migrationFile);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(filePath, "utf8");

    try {
        console.log(`🚀 Executing migration: ${migrationFile}`);
        await pool.query(sql);
        console.log("✅ Migration applied successfully.");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    } finally {
        pool.end();
    }
};

runMigration();
