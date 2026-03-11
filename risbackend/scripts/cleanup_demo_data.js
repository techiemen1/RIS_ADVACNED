const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');

async function cleanup() {
    const client = await pool.connect();
    try {
        console.log('🧹 Starting Database Cleanup...');
        await client.query('BEGIN');

        // Deleting in order of foreign key dependencies
        console.log('- Cleaning billing...');
        await client.query('DELETE FROM billing');
        
        console.log('- Cleaning reports...');
        await client.query('DELETE FROM reports');
        
        console.log('- Cleaning pacs_studies...');
        await client.query('DELETE FROM pacs_studies');
        
        console.log('- Cleaning worklist...');
        await client.query('DELETE FROM worklist');
        
        console.log('- Cleaning appointments...');
        await client.query('DELETE FROM appointments');
        
        console.log('- Cleaning patient_consents...');
        await client.query('DELETE FROM patient_consents');
        
        console.log('- Cleaning orders...');
        await client.query('DELETE FROM orders');
        
        console.log('- Cleaning patients...');
        await client.query('DELETE FROM patients');

        // Reset Sequences
        console.log('🔄 Resetting Sequences...');
        await client.query("ALTER SEQUENCE patient_mrn_seq RESTART WITH 100001");
        await client.query("ALTER SEQUENCE accession_seq RESTART WITH 100001");

        await client.query('COMMIT');
        console.log('✨ Cleanup Complete! Database is fresh for workflow demo.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Cleanup failed:', e);
    } finally {
        if (client) client.release();
        process.exit();
    }
}

cleanup();
