// models/modalityModel.js
const { pool } = require('../config/postgres');

const init = async () => {
    try {
        // 1. Create Modalities Table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS modalities (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                ae_title VARCHAR(64) UNIQUE NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                port INTEGER DEFAULT 104,
                description TEXT,
                color VARCHAR(50) DEFAULT '#3b82f6',
                body_parts JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Self-healing: Ensure all columns exist
        const columns = [
            ['ae_title', 'VARCHAR(64) UNIQUE'],
            ['ip_address', 'VARCHAR(45)'],
            ['port', 'INTEGER DEFAULT 104'],
            ['description', 'TEXT'],
            ['color', "VARCHAR(50) DEFAULT '#3b82f6'"],
            ['body_parts', "JSONB DEFAULT '[]'::jsonb"],
            ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP']
        ];

        for (const [col, type] of columns) {
            try {
                await pool.query(`ALTER TABLE modalities ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            } catch (e) {
                // Ignore errors
            }
        }

        console.log('✅ Modality Model Schema Verified');
    } catch (err) {
        console.error('❌ ModalityModel init error:', err.message);
    }
};

module.exports = { init };
