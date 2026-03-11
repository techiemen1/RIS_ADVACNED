const { Pool } = require('pg');

const OLD_DB_URL = 'postgresql://ipacx:xcap1@localhost:5432/ipacx_user_db';
const NEW_DB_URL = 'postgresql://ipacx:xcap1@localhost:5432/ris_advanced_db';

const oldPool = new Pool({ connectionString: OLD_DB_URL });
const newPool = new Pool({ connectionString: NEW_DB_URL });

async function migrate() {
    try {
        console.log('🚀 Starting Universal Migration...');

        // 1. PATIENTS
        console.log('--- Migrating Patients ---');
        const oldPatients = await oldPool.query('SELECT * FROM patients');
        for (const p of oldPatients.rows) {
            await newPool.query(
                `INSERT INTO patients (
                    id, first_name, last_name, dob, gender, phone, email, address, 
                    insurance_id, mrn, id_number, aadhaar_number, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO UPDATE SET 
                    mrn = EXCLUDED.mrn, 
                    aadhaar_number = EXCLUDED.aadhaar_number`,
                [
                    p.id, p.first_name, p.last_name, p.dob, p.gender, p.phone, p.email, p.address,
                    p.insurance_id, p.mrn, p.id_number, p.aadhaar_number, p.created_at, p.updated_at || new Date()
                ]
            );
        }
        console.log(`✅ Migrated ${oldPatients.rowCount} Patients.`);

        // 2. MODALITIES
        console.log('--- Migrating Modalities ---');
        const oldModalities = await oldPool.query('SELECT * FROM modalities');
        for (const m of oldModalities.rows) {
            await newPool.query(
                `INSERT INTO modalities (id, name, ae_title, ip_address, port, description, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO NOTHING`,
                [m.id, m.name, m.ae_title || 'N/A', m.ip_address || '127.0.0.1', m.port || 104, m.description, m.created_at, m.updated_at]
            );
        }
        console.log(`✅ Migrated ${oldModalities.rowCount} Modalities.`);

        // 3. WORKLIST (Pre-requisite for Reports)
        console.log('--- Migrating Worklist ---');
        const oldWorklist = await oldPool.query('SELECT * FROM worklist');
        for (const w of oldWorklist.rows) {
            await newPool.query(
                `INSERT INTO worklist (
                    id, patient_id, study_instance_uid, modality, study_date, status, assigned_to, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (id) DO NOTHING`,
                [w.id, w.patient_id, w.study_instance_uid, w.modality, w.study_date, w.status, w.assigned_to, w.created_at]
            );
        }
        console.log(`✅ Migrated ${oldWorklist.rowCount} Worklist entries.`);

        // 4. ORDERS
        console.log('--- Migrating Orders ---');
        const oldOrders = await oldPool.query('SELECT * FROM orders');
        for (const o of oldOrders.rows) {
            await newPool.query(
                `INSERT INTO orders (
                    id, patient_id, accession_number, study_instance_uid, modality, 
                    procedure_code, procedure_description, ordering_physician, 
                    clinical_indication, status, scheduled_time, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (id) DO NOTHING`,
                [
                    o.id, o.patient_id, o.accession_number, o.study_instance_uid, o.modality,
                    o.procedure_code, o.procedure_description, o.ordering_physician,
                    o.clinical_indication, o.status, o.scheduled_time, o.created_at, o.updated_at
                ]
            );
        }
        console.log(`✅ Migrated ${oldOrders.rowCount} Orders.`);

        // 5. REPORTS
        console.log('--- Migrating Reports ---');
        const oldReports = await oldPool.query('SELECT * FROM reports');
        for (const r of oldReports.rows) {
            await newPool.query(
                `INSERT INTO reports (
                    id, worklist_id, patient_id, radiologist, report_text, findings, 
                    impression, status, workflow_status, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (id) DO NOTHING`,
                [
                    r.id, r.worklist_id, r.patient_id, r.radiologist, r.report_text,
                    r.findings, r.impression, r.status, r.workflow_status, r.created_at, r.updated_at
                ]
            );
        }
        console.log(`✅ Migrated ${oldReports.rowCount} Reports.`);

        // 6. UPDATE ADMIN1 METADATA
        console.log('--- Patching Admin Meta ---');
        await newPool.query(
            "UPDATE users SET full_name = 'System Administrator' WHERE username = 'admin1' AND (full_name IS NULL OR full_name = '')"
        );

        // 7. RESET SEQUENCES
        console.log('--- Normalizing ID Sequences ---');
        const tables = ['users', 'patients', 'orders', 'reports', 'modalities', 'worklist'];
        for (const table of tables) {
            await newPool.query(`SELECT setval('${table}_id_seq', (SELECT MAX(id) FROM ${table}))`);
        }

        console.log('🎯 ALL SYSTEMS SYNCHRONIZED.');
    } catch (err) {
        console.error('❌ Migration Critical Failure:', err);
    } finally {
        await oldPool.end();
        await newPool.end();
    }
}

migrate();
