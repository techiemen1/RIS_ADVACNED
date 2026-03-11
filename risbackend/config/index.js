const { pool } = require('./postgres');

const initDBConnections = async () => {
    let client;
    try {
        client = await pool.connect(); // PostgreSQL pool check
        console.log('✅ PostgreSQL connected successfully');

        // Initialize Models (Self-Healing Schemas)
        const PACSModel = require('../models/pacsModel');
        const PatientModel = require('../models/patientModel');
        const TemplateModel = require('../models/templateModel');
        const KeyImageModel = require('../models/keyImageModel');
        const OrderModel = require('../models/orderModel');
        const AppointmentsModel = require('../models/appointmentsModel');
        const ModalityModel = require('../models/modalityModel');

        await PACSModel.init();
        await PatientModel.init();
        await TemplateModel.init();
        await KeyImageModel.init();
        await OrderModel.init();
        await AppointmentsModel.init();
        await ModalityModel.init();

        // 5. Special initialization for study_metadata (no formal model yet)
        await pool.query(`
          CREATE TABLE IF NOT EXISTS study_metadata (
            id SERIAL PRIMARY KEY,
            study_instance_uid VARCHAR(255) UNIQUE NOT NULL,
            patient_name VARCHAR(255),
            patient_id VARCHAR(100),
            modality VARCHAR(50),
            accession_number VARCHAR(100),
            study_date VARCHAR(20),
            patient_sex VARCHAR(20),
            patient_age VARCHAR(50),
            referring_physician VARCHAR(255),
            body_part VARCHAR(100),
            report_status TEXT DEFAULT 'draft',
            workflow_status TEXT DEFAULT 'draft',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        // Add specific columns for study_metadata
        const smColumns = [
          ['patient_sex', 'VARCHAR(20)'],
          ['patient_age', 'VARCHAR(50)'],
          ['referring_physician', 'VARCHAR(255)'],
          ['body_part', 'VARCHAR(100)'],
          ['report_status', "TEXT DEFAULT 'draft'"],
          ['workflow_status', "TEXT DEFAULT 'draft'"]
        ];
        for (const [col, type] of smColumns) {
          try { await pool.query(`ALTER TABLE study_metadata ADD COLUMN IF NOT EXISTS ${col} ${type}`); } catch(e){}
        }

        console.log('✅ All Database Models initialized');

    } catch (err) {
        console.error('❌ Database initialization failed:', err.message);
    } finally {
        if (client) client.release();
    }
};

module.exports = initDBConnections;
