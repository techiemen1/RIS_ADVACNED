/**
 * risbackend/scripts/fix_admin.js
 * 
 * Ensures a default admin user exists with the correct schema:
 * - username: admin
 * - password: ChangeMe@123!
 * - role: admin
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../config/postgres');

async function fixAdmin() {
    try {
        console.log('🚀 Checking Admin User...');
        
        const username = 'admin';
        const rawPassword = 'ChangeMe@123!';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        
        // 1. Check if users table exists and has correct columns
        const tableCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role'
        `);
        
        if (tableCheck.rowCount === 0) {
            console.error('❌ Error: users table does not have a "role" column. Schema might be corrupted.');
            process.exit(1);
        }

        // 2. Upsert Admin User
        // Note: Using DO UPDATE to ensure we fix any existing broken admin
        await pool.query(`
            INSERT INTO users (username, password_hash, role, full_name, email, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (username) 
            DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role,
                is_active = TRUE,
                updated_at = NOW()
        `, [username, hashedPassword, 'admin', 'System Administrator', 'admin@example.com', true]);

        console.log('✅ Admin user "admin" is now active.');
        console.log('🔑 Password: ' + rawPassword);
        console.log('📍 Login at: http://192.168.1.34:3000');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to fix admin:', err.message);
        process.exit(1);
    }
}

fixAdmin();
