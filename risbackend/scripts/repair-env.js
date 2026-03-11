// scripts/repair-env.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { pool } = require("../config/postgres");
// Using a simple check to see if we need to require bcrypt or if it's already there
// Assuming the backend has bcrypt or bcryptjs installed.
let bcrypt;
try {
    bcrypt = require("bcryptjs");
} catch (e) {
    bcrypt = require("bcrypt");
}

async function repair() {
    try {
        console.log("🛠️ Starting Environment Repair...");

        // 1. Create Admin User
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash("adminpass", salt);

        await pool.query(`
      INSERT INTO users (username, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO UPDATE SET password_hash = $2, is_active = true
    `, ['admin1', hash, 'admin', true]);

        console.log("✅ Admin user 'admin1' created/updated with password 'adminpass'");

        // 2. Synchronize Clinical Schema (Forcing columns use by prefetch/orders)
        await pool.query(`
      ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS report_status TEXT DEFAULT 'draft';
      ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'draft';
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS id_number TEXT;
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS mrn TEXT;
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
    `);
        console.log("✅ Clinical schema standardized.");

        // 3. Verify Table State
        const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log("📦 Active Tables:", tables.rows.map(r => r.table_name).join(", "));

        process.exit(0);
    } catch (err) {
        console.error("❌ Repair Failed:", err.message);
        process.exit(1);
    }
}

repair();
