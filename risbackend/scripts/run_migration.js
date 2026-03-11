const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Resolve path to db.js
const dbPath = path.resolve(__dirname, '../db');
const { pool } = require(dbPath);

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, '../migrations/20260110_add_mrn_to_patients.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration applied successfully.');
        process.exit(0);
    } catch (err) {
        if (err.code === '42701') { // duplicate_column
            console.log('Columns already exist. Skipping.');
            process.exit(0);
        }
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
