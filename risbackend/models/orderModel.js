const { pool } = require('../config/postgres');
const { v4: uuidv4 } = require('uuid');

const init = async () => {
    try {
        // 1. Create Sequence for Accession Numbers
        await pool.query("CREATE SEQUENCE IF NOT EXISTS accession_seq START WITH 500001");

        // 2. Create Orders Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                patient_id INTEGER REFERENCES patients(id),
                accession_number VARCHAR(100) UNIQUE NOT NULL,
                study_instance_uid VARCHAR(255) UNIQUE,
                modality VARCHAR(50),
                procedure_code VARCHAR(100),
                procedure_description TEXT,
                ordering_physician VARCHAR(255),
                clinical_indication TEXT,
                scheduled_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(50) DEFAULT 'SCHEDULED',
                priority VARCHAR(50) DEFAULT 'ROUTINE',
                referral_source VARCHAR(255),
                is_tele_radiology BOOLEAN DEFAULT false,
                branch_id INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Self-healing: Ensure all columns exist
        const columns = [
            ['patient_id', 'INTEGER REFERENCES patients(id)'],
            ['accession_number', 'VARCHAR(100) UNIQUE'],
            ['study_instance_uid', 'VARCHAR(255) UNIQUE'],
            ['modality', 'VARCHAR(50)'],
            ['procedure_code', 'VARCHAR(100)'],
            ['procedure_description', 'TEXT'],
            ['ordering_physician', 'VARCHAR(255)'],
            ['clinical_indication', 'TEXT'],
            ['scheduled_time', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
            ['status', "VARCHAR(50) DEFAULT 'SCHEDULED'"],
            ['priority', "VARCHAR(50) DEFAULT 'ROUTINE'"],
            ['referral_source', 'VARCHAR(255)'],
            ['is_tele_radiology', 'BOOLEAN DEFAULT false'],
            ['body_part', 'VARCHAR(100)'],
            ['scan_type', 'VARCHAR(100)'],
            ['branch_id', 'INTEGER DEFAULT 1'],
            ['created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
            ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP']
        ];

        for (const [col, type] of columns) {
            try {
                await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col} ${type}`);
            } catch (e) {
                // Ignore errors if column already exists with different but compatible constraints
            }
        }

        console.log('✅ Order Model Schema Verified');
    } catch (err) {
        console.error('❌ OrderModel init error:', err.message);
    }
};

exports.init = init;

async function generateAccessionNumber() {
    const { rows } = await pool.query("SELECT 'ACC' || nextval('accession_seq') as acc");
    return rows[0].acc;
}

exports.createOrder = async (data) => {
    const {
        patient_id,
        modality,
        procedure_code,
        procedure_description,
        ordering_physician,
        clinical_indication,
        scheduled_time,
        priority = 'ROUTINE',
        referral_source = '',
        is_tele_radiology = false,
        accession_number: manualAccession
    } = data;

    const accession_number = manualAccession || await generateAccessionNumber();
    const study_instance_uid = `1.2.826.0.1.3680043.2.${Date.now()}.${Math.floor(Math.random() * 1000)}`;

    const res = await pool.query(
        `INSERT INTO orders 
      (patient_id, accession_number, study_instance_uid, modality, procedure_code, procedure_description, ordering_physician, clinical_indication, scheduled_time, status, priority, referral_source, is_tele_radiology, body_part, scan_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SCHEDULED', $10, $11, $12, $13, $14)
      RETURNING *`,
        [patient_id, accession_number, study_instance_uid, modality, procedure_code, procedure_description, ordering_physician, clinical_indication, scheduled_time || new Date(), priority, referral_source, is_tele_radiology, data.body_part || null, data.scan_type || null]
    );
    return res.rows[0];
};

exports.getOrders = async (filters = {}) => {
    const { branchScope = '' } = filters;
    let query = `SELECT 
       o.*, 
       COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') as patient_name,
       p.mrn, p.id_number, p.aadhaar_number
     FROM orders o
     LEFT JOIN patients p ON o.patient_id = p.id
     WHERE 1=1 ${branchScope}`;
    const params = [];
    const conditions = [];

    // Filter by modality (MWL use case)
    if (filters.modality) {
        conditions.push(`o.modality = $${conditions.length + 1} `);
        params.push(filters.modality);
    }
    // Filter by date (MWL use case) - assume filtering by today or specific date
    if (filters.scheduled_date) {
        conditions.push(`DATE(o.scheduled_time) = $${conditions.length + 1} `);
        params.push(filters.scheduled_date);
    }
    // Filter by patient_id
    if (filters.patient_id) {
        conditions.push(`o.patient_id = $${conditions.length + 1} `);
        params.push(filters.patient_id);
    }

    if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
    }

    query += ' ORDER BY o.scheduled_time DESC';

    const res = await pool.query(query, params);
    return res.rows;
};

exports.updateOrderStatus = async (id, status) => {
    const res = await pool.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
    );
    return res.rows[0];
};
