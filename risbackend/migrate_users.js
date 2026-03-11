const { Pool } = require('pg');

const OLD_DB_URL = 'postgresql://ipacx:xcap1@localhost:5432/ipacx_user_db';
const NEW_DB_URL = 'postgresql://ipacx:xcap1@localhost:5432/ris_advanced_db';

const oldPool = new Pool({ connectionString: OLD_DB_URL });
const newPool = new Pool({ connectionString: NEW_DB_URL });

async function migrateUsers() {
    try {
        console.log('🚀 Starting User Migration...');

        // 1. Fetch users from OLD DB
        const oldUsers = await oldPool.query('SELECT * FROM users');
        console.log(`Found ${oldUsers.rowCount} users in old database.`);

        for (const user of oldUsers.rows) {
            console.log(`Migrating: ${user.username} (${user.role})...`);

            // 2. Insert into NEW DB
            // Matching schema: id, username, password_hash, role, full_name, email, phone, is_active, created_at, updated_at
            try {
                await newPool.query(
                    `INSERT INTO users (
                        username, password_hash, role, full_name, email, phone, is_active, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (username) DO NOTHING`,
                    [
                        user.username,
                        user.password_hash,
                        user.role,
                        user.full_name,
                        user.email,
                        user.phone_number || user.phone || null,
                        user.is_active ?? true,
                        user.created_at || new Date(),
                        user.updated_at || new Date()
                    ]
                );
            } catch (err) {
                console.warn(`⚠️ Failed to migrate ${user.username}:`, err.message);
            }
        }

        console.log('✅ User Migration Complete.');
    } catch (err) {
        console.error('❌ Migration Error:', err);
    } finally {
        await oldPool.end();
        await newPool.end();
    }
}

migrateUsers();
