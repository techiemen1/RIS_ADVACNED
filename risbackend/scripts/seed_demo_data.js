const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');
const bcrypt = require('bcryptjs');

async function seed() {
    const client = await pool.connect();
    try {
        console.log('🌱 Starting Demo Data Seed...');
        await client.query('BEGIN');

        // 1. Create Users
        const hashedPassword = await bcrypt.hash('password123', 10);
        const users = [
            { user: 'admin', role: 'admin', name: 'Super Admin' },
            { user: 'dr_ai', role: 'radiologist', name: 'Dr. A.I. Radiologist' },
            { user: 'tech_bob', role: 'technician', name: 'Bob Technician' },
            { user: 'nurse_alice', role: 'nurse', name: 'Alice Nurse' },
            { user: 'desk_clerk', role: 'receptionist', name: 'Front Desk' }
        ];

        for (const u of users) {
            await client.query(`
        INSERT INTO users (username, password_hash, email, full_name, role, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW())
        ON CONFLICT (username) DO NOTHING
      `, [u.user, hashedPassword, `${u.user}@ipacx.com`, u.name, u.role]);
        }
        // Seed Reference Data if empty
        await client.query(`
        INSERT INTO system_settings (key, value)
        VALUES 
        ('hierarchy.departments', '["Radiology", "Cardiology", "Neurology", "Orthopedics", "Emergency", "Oncology"]'),
        ('hierarchy.designations', '["Senior Consultant", "Junior Resident", "Senior Resident", "Technician Lead", "Staff Nurse", "Receptionist"]')
        ON CONFLICT (key) DO NOTHING
    `);
        console.log('✅ Users seeded');

        // 2. Create Patients
        const patients = [
            { f: 'Rajesh', l: 'Kumar', ag: 45, g: 'Male', phone: '9876543210' },
            { f: 'Priya', l: 'Sharma', ag: 32, g: 'Female', phone: '9876500001' },
            { f: 'Amit', l: 'Patel', ag: 67, g: 'Male', phone: '9876500002' },
            { f: 'Sneha', l: 'Reddy', ag: 28, g: 'Female', phone: '9876500003' },
            { f: 'Vikram', l: 'Singh', ag: 55, g: 'Male', phone: '9876500004' },
            { f: 'Anjali', l: 'Gupta', ag: 12, g: 'Female', phone: '9876500005' },
        ];

        const insertedPatients = [];
        for (const p of patients) {
            const yr = new Date().getFullYear().toString().slice(-2);
            const rand = Math.floor(1000 + Math.random() * 9000);
            const mrn = `MRN-${yr}01-${rand}`;
            const dob = new Date();
            dob.setFullYear(dob.getFullYear() - p.ag);

            const res = await client.query(`
        INSERT INTO patients 
        (first_name, last_name, dob, gender, phone, mrn, id_type, id_number, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'AADHAAR', '0000-0000-0000', NOW())
        RETURNING id, first_name, last_name, mrn
      `, [p.f, p.l, dob.toISOString().split('T')[0], p.g, p.phone, mrn]);
            insertedPatients.push(res.rows[0]);
        }
        console.log('✅ Patients seeded');

        // 3. Create Orders & Appointments
        const modalities = ['CT', 'MR', 'XR', 'US'];
        const exams = ['Chest', 'Brain', 'Abdomen', 'Spine', 'Knee'];

        for (const p of insertedPatients) {
            const numOrders = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numOrders; i++) {
                const mod = modalities[Math.floor(Math.random() * modalities.length)];
                const bodyPart = exams[Math.floor(Math.random() * exams.length)];
                const acc = `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const desc = `${mod} ${bodyPart} Scan`;
                const uid = `1.2.826.0.1.3680043.2.${Date.now()}.${Math.floor(Math.random() * 1000)}`;

                const orderRes = await client.query(`
                INSERT INTO orders 
                (patient_id, accession_number, modality, procedure_description, status, scheduled_time, created_at, study_instance_uid)
                VALUES ($1, $2, $3, $4, 'SCHEDULED', NOW(), NOW(), $5)
                RETURNING id
            `, [p.id, acc, mod, desc, uid]);

                // WORKLIST INSERTION (CRITICAL FIX)
                const worklistRes = await client.query(`
                    INSERT INTO worklist
                    (patient_id, study_instance_uid, modality, study_date, status, assigned_to, created_at)
                    VALUES ($1, $2, $3, NOW(), 'COMPLETED', 'dr_ai', NOW())
                    RETURNING id
                `, [p.id, uid, mod]);
                const worklistId = worklistRes.rows[0].id;

                await client.query(`
                INSERT INTO appointments
                (patient_id, patient_name, modality, accession_number, scheduled_start, status, created_at)
                VALUES ($1, $2, $3, $4, NOW() + interval '${i} hour', 'SCHEDULED', NOW())
            `, [p.id, `${p.first_name} ${p.last_name}`, mod, acc]);

                if (Math.random() > 0.5) {
                    await client.query(`
                        INSERT INTO reports
                        (worklist_id, patient_id, radiologist, report_text, findings, impression, status, workflow_status, finalized_by, finalized_at, created_at)
                        VALUES ($1, $2, 'dr_ai', $3, $4, $5, 'FINALIZED', 'COMPLETED', 'dr_ai', NOW(), NOW())
                    `, [worklistId, p.id, `<p><strong>Study:</strong> ${desc}</p><p><strong>Findings:</strong> No significant abnormality detected.</p><p><strong>Impression:</strong> Normal Study.</p>`, 'No significant abnormality detected.', 'Normal Study']);
                }

                // Consents
                await client.query(`
                    INSERT INTO patient_consents
                    (patient_id, consent_type, status, signed_by, signed_at, ip_address, consent_text, created_at)
                    VALUES ($1, 'General Consent', 'SIGNED', 'Nurse Alice', NOW(), '127.0.0.1', 'I hereby consent to procedure...', NOW())
                 `, [p.id]);
            }
        }
        console.log('✅ Orders, Appointments, Reports & Consents seeded');

        // 6. Templates
        await client.query(`DELETE FROM pacs_templates WHERE name LIKE 'Demo %'`);
        const templates = [
            { n: 'Demo Normal CXR', m: 'XR', c: '<h1>Chest X-Ray</h1><p>Lungs are clear.</p>' },
            { n: 'Demo CT Brain', m: 'CT', c: '<h1>CT Brain</h1><p>No hemorrhage.</p>' },
            { n: 'Demo MRI Knee', m: 'MR', c: '<h1>MRI Knee</h1><p>ACL intact.</p>' }
        ];
        for (const t of templates) {
            await client.query(`INSERT INTO pacs_templates (name, modality, content) VALUES ($1, $2, $3)`, [t.n, t.m, t.c]);
        }
        console.log('✅ Templates seeded');

        // 7. Inventory
        await client.query(`DELETE FROM inventory WHERE name LIKE 'Demo %'`);
        const inventory = [
            { n: 'Demo Syringe 10ml', c: 'Consumables', q: 500, p: 5.0 },
            { n: 'Demo Contrast 50ml', c: 'Contrast', q: 50, p: 1500.0 },
            { n: 'Demo Gloves M', c: 'Consumables', q: 1000, p: 2.0 },
            { n: 'Demo X-Ray Film Blue', c: 'Films', q: 200, p: 45.0 },
            { n: 'Demo Printer Paper', c: 'Stationery', q: 50, p: 500.0 },
            { n: 'Demo IV Cannula 20G', c: 'Consumables', q: 300, p: 25.0 },
            { n: 'Demo MRI Coil Cover', c: 'Accessories', q: 20, p: 1500.0 },
            { n: 'Demo Ultrasound Gel', c: 'Consumables', q: 40, p: 800.0 },
        ];
        for (const i of inventory) {
            await client.query(`
                INSERT INTO inventory (name, category, quantity, unit_price, created_by, created_at)
                VALUES ($1, $2, $3, $4, 'system', NOW())
            `, [i.n, i.c, i.q, i.p]);
        }
        console.log('✅ Inventory seeded');

        // 8. Billing
        console.log('💰 Seeding Billing...');
        await client.query("DELETE FROM billing WHERE created_by = 'system'");
        const allOrders = await client.query('SELECT id, patient_id FROM orders');

        for (const order of allOrders.rows) {
            // 70% chance an order has an invoice
            if (Math.random() > 0.3) {
                const total = Math.floor(Math.random() * 5000) + 1000;
                const tax = total * 0.18;
                const rand = Math.floor(1000 + Math.random() * 9000);
                const invNum = `INV-20260110-${rand}`;

                await client.query(`
                   INSERT INTO billing 
                   (patient_id, order_id, invoice_number, hsn_code, taxable_amount, 
                    cgst_rate, sgst_rate, igst_rate, 
                    cgst_amount, sgst_amount, igst_amount, 
                    total_amount, discount, 
                    payment_status, payment_method, created_by, created_at)
                   VALUES ($1, $2, $3, '999333', $4, 9, 9, 0, $5, $5, 0, $6, 0, $7, $8, 'system', NOW())
                `, [
                    order.patient_id,
                    order.id,
                    invNum,
                    (total - tax).toFixed(2),
                    (tax / 2).toFixed(2),
                    total.toFixed(2),
                    Math.random() > 0.5 ? 'paid' : 'pending',
                    Math.random() > 0.5 ? 'cash' : 'card'
                ]);
            }
        }
        console.log('✅ Billing seeded');

        await client.query('COMMIT');
        console.log('🚀 DB Seeding Complete (with scalable, deletable demo data)!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding failed:', e);
    } finally {
        if (client) client.release();
        process.exit();
    }
}

seed();
