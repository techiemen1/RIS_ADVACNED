const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');
const fs = require('fs');

const runMigrations = async () => {
    try {
        console.log('📦 Connecting to database...');
        await pool.connect();

        const migrationsDir = path.join(__dirname, '../../migrations');
        const files = fs.readdirSync(migrationsDir).sort(); // Ensure order

        for (const file of files) {
            if (file.endsWith('.sql')) {
                console.log(`▶ Running migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                await pool.query(sql);
                console.log(`✅ Completed: ${file}`);
            }
        }

        console.log('🎉 All migrations applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

runMigrations();
