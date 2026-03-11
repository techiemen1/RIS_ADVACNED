const { pool } = require('../config/postgres');

const init = async () => {
  try {
    // 1. Create Base Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        dob DATE,
        gender VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        insurance_id VARCHAR(100),
        clinical_info JSONB DEFAULT '{}',
        portal_access BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Ensure Sequences exist (Crucial for MRN generation)
    await pool.query('CREATE SEQUENCE IF NOT EXISTS patient_mrn_seq START WITH 100001');

    // 3. Add all Missing Columns (Self-Healing)
    const columns = [
      ['mrn', 'VARCHAR(50) UNIQUE'],
      ['aadhaar_number', 'VARCHAR(20)'],
      ['abha_id', 'VARCHAR(100)'],
      ['abha_number', 'VARCHAR(20)'],
      ['abha_address', 'VARCHAR(100)'],
      ['preferred_language', "VARCHAR(10) DEFAULT 'en'"],
      ['id_type', "VARCHAR(50) DEFAULT 'AADHAAR'"],
      ['id_number', 'VARCHAR(100)'],
      ['insurance_provider', 'VARCHAR(100)'],
      ['policy_type', 'VARCHAR(50)'],
      ['policy_validity', 'DATE'],
      ['patient_type', "VARCHAR(20) DEFAULT 'OPD'"],
      ['billing_category', "VARCHAR(50) DEFAULT 'Self-Pay'"],
      ['admission_date', 'TIMESTAMP'],
      ['discharge_date', 'TIMESTAMP'],
      ['identifiers', "JSONB DEFAULT '[]'"],
      ['relationship_type', 'VARCHAR(50)'],
      ['relationship_name', 'VARCHAR(100)'],
      ['marital_status', 'VARCHAR(20)'],
      ['occupation', 'VARCHAR(100)'],
      ['nationality', "VARCHAR(50) DEFAULT 'Indian'"],
      ['emergency_contact_name', 'VARCHAR(100)'],
      ['emergency_contact_phone', 'VARCHAR(20)'],
      ['emergency_contact_relation', 'VARCHAR(50)'],
      ['blood_group', 'VARCHAR(10)'],
      ['height_cm', 'NUMERIC(5,2)'],
      ['weight_kg', 'NUMERIC(5,2)'],
      ['allergies', 'TEXT'],
      ['current_medications', 'TEXT'],
      ['medical_history', 'TEXT'],
      ['pregnancy_status', 'VARCHAR(20)'],
      ['provisional_diagnosis', 'TEXT'],
      ['surgeries', 'TEXT'],
      ['voter_id', 'VARCHAR(50)'],
      ['biometric_flag', 'BOOLEAN DEFAULT false'],
      ['registration_channel', "VARCHAR(20) DEFAULT 'DESK'"],
      ['registered_by_device', 'VARCHAR(100)'],
      ['photo_url', 'TEXT'],
      ['visit_type', "VARCHAR(20) DEFAULT 'NEW'"],
      ['department', 'VARCHAR(100)'],
      ['attending_physician', 'VARCHAR(100)'],
      ['ward_room_bed', 'VARCHAR(100)'],
      ['lmp_date', 'DATE'],
      ['creatinine_level', 'NUMERIC(5,2)'],
      ['contrast_safety_flag', 'BOOLEAN DEFAULT true'],
      ['consent_artifact', "JSONB DEFAULT '{}'"],
      ['consent_image_sharing', 'BOOLEAN DEFAULT false'],
      ['consent_research_ai', 'BOOLEAN DEFAULT false'],
      ['consent_telemedicine', 'BOOLEAN DEFAULT false'],
      ['data_privacy_accepted', 'BOOLEAN DEFAULT true'],
      ['digital_signature', 'TEXT'],
      ['branch_id', 'INTEGER DEFAULT 1']
    ];

    for (const [col, type] of columns) {
      try {
        await pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      } catch (e) {
        console.warn(`[PatientModel] Column check failed for ${col}:`, e.message);
      }
    }

    console.log('✅ Patient Model Schema Verified');
  } catch (err) {
    console.error('❌ PatientModel init error:', err.message);
  }
};

exports.init = init;

exports.createPatient = async (data) => {
  const {
    first_name, last_name, dob, gender, phone, email,
    address, insurance_id, clinical_info = {}, portal_access = false,
    aadhaar_number, abha_id, preferred_language = 'en', consent_artifact = {},
    id_type = 'AADHAAR', id_number = '', insurance_provider = '', policy_type = '', policy_validity = null,
    mrn, 
    patient_type = 'OPD', billing_category = 'Self-Pay', admission_date, discharge_date,
    abha_number, abha_address, identifiers = [],
    relationship_type, relationship_name, marital_status, occupation, nationality = 'Indian',
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    blood_group, height_cm, weight_kg, allergies, current_medications, medical_history, pregnancy_status, provisional_diagnosis, surgeries,
    voter_id, biometric_flag = false, registration_channel = 'DESK', registered_by_device, photo_url,
    visit_type = 'NEW', department, attending_physician, ward_room_bed,
    lmp_date, creatinine_level, contrast_safety_flag = true,
    consent_image_sharing = false, consent_research_ai = false, consent_telemedicine = false, data_privacy_accepted = true, digital_signature
  } = data;

  // --- Data Sanitization ---
  const toDate = (val) => (val && val.toString().trim() !== "" ? val : null);
  const toNum  = (val) => (val !== undefined && val !== null && val.toString().trim() !== "" ? parseFloat(val) : null);
  const toBool = (val) => (val === true || val === "true");
  const toJson = (val) => {
    if (val === undefined || val === null || val === '') return null;
    return (typeof val === 'object' ? JSON.stringify(val) : val);
  };

  const h_cm    = toNum(height_cm);
  const w_kg    = toNum(weight_kg);
  const c_level = toNum(creatinine_level);

  const d_dob        = toDate(dob);
  const d_admission  = toDate(admission_date);
  const d_discharge  = toDate(discharge_date);
  const d_policy_val = toDate(policy_validity);
  const d_lmp        = toDate(lmp_date);

  // 1. Duplicate Checks
  if (abha_number && abha_number.trim() !== "") {
    const abhaCheck = await pool.query(`SELECT id FROM patients WHERE abha_number = $1`, [abha_number]);
    if (abhaCheck.rows.length > 0) throw new Error(`Patient with ABHA ${abha_number} already exists.`);
  }

  // 2. Insert with explicit mapping
  const query = `
    INSERT INTO patients (
      first_name, last_name, dob, gender, phone, email, address, insurance_id, clinical_info, portal_access,
      aadhaar_number, abha_id, preferred_language, consent_artifact,
      id_type, id_number, insurance_provider, policy_type, policy_validity,
      mrn,
      patient_type, billing_category, admission_date, discharge_date,
      abha_number, abha_address, identifiers,
      relationship_type, relationship_name, marital_status, occupation, nationality,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      blood_group, height_cm, weight_kg, allergies, current_medications, medical_history, pregnancy_status, provisional_diagnosis, surgeries,
      voter_id, biometric_flag, registration_channel, registered_by_device, photo_url,
      visit_type, department, attending_physician, ward_room_bed,
      lmp_date, creatinine_level, contrast_safety_flag,
      consent_image_sharing, consent_research_ai, consent_telemedicine, data_privacy_accepted, digital_signature,
      branch_id, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19,
      COALESCE($20, 'IPX' || nextval('patient_mrn_seq')),
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
      $51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
      $61, $62, CURRENT_TIMESTAMP
    ) RETURNING *
  `;

  const values = [
    first_name, last_name, d_dob, gender, phone, email, address, insurance_id, toJson(clinical_info), toBool(portal_access),
    aadhaar_number, abha_id, preferred_language, toJson(consent_artifact),
    id_type, id_number, insurance_provider, policy_type, d_policy_val,
    mrn || null,
    patient_type, billing_category, d_admission, d_discharge,
    abha_number, abha_address, toJson(identifiers),
    relationship_type, relationship_name, marital_status, occupation, nationality,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    blood_group, h_cm, w_kg, allergies, current_medications, medical_history, pregnancy_status, provisional_diagnosis, surgeries,
    voter_id, toBool(biometric_flag), registration_channel, registered_by_device, photo_url,
    visit_type, department, attending_physician, toJson(ward_room_bed),
    d_lmp, c_level, toBool(contrast_safety_flag),
    toBool(consent_image_sharing), toBool(consent_research_ai), toBool(consent_telemedicine), toBool(data_privacy_accepted), digital_signature,
    data.branch_id || 1
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
};



exports.getPatientById = async (id) => {
  const result = await pool.query(`SELECT * FROM patients WHERE id=$1`, [id]);
  return result.rows[0];
};

exports.getPatients = async (filters = {}) => {
  const { page = 1, limit = 20, branchScope = '' } = filters;
  const offset = (page - 1) * limit;
  const result = await pool.query(
    `SELECT * FROM patients WHERE 1=1 ${branchScope} ORDER BY id DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
};

/**
 * Update a patient's MRN.
 * Validates:
 *  - New MRN must match format MRN-YYMM-NNNNNN or be a custom alphanumeric string
 *  - Must not already be in use by another patient (enforced by DB UNIQUE constraint)
 *
 * @param {number|string} patientId
 * @param {string}        newMrn - the validated MRN string
 * @returns {object} Updated patient row
 */
exports.updateMrn = async (patientId, newMrn) => {
  if (!newMrn || typeof newMrn !== 'string' || newMrn.trim().length < 3) {
    throw new Error('Invalid MRN: must be at least 3 characters');
  }
  if (newMrn.length > 50) {
    throw new Error('Invalid MRN: must not exceed 50 characters');
  }

  // Only allow safe characters: uppercase letters, digits, hyphens, underscores
  if (!/^[A-Z0-9\-_]+$/i.test(newMrn.trim())) {
    throw new Error('Invalid MRN: only letters, digits, hyphens, and underscores allowed');
  }

  try {
    const result = await pool.query(
      `UPDATE patients SET mrn = $1 WHERE id = $2 RETURNING id, mrn, first_name, last_name`,
      [newMrn.trim().toUpperCase(), patientId]
    );
    if (result.rowCount === 0) throw new Error(`Patient ID ${patientId} not found`);
    return result.rows[0];
  } catch (err) {
    // Translate DB unique violation to a readable error
    if (err.code === '23505') {  // PostgreSQL unique_violation
      throw new Error(`MRN '${newMrn}' is already assigned to another patient`);
    }
    throw err;
  }
};

/**
 * Update patient record (general fields).
 *
 * @param {number|string} patientId
 * @param {object}        fields - partial patient fields to update
 * @returns {object} Updated patient row
 */
exports.updatePatient = async (patientId, fields) => {
  // Build dynamic SET clause from provided fields
  const allowed = [
    'first_name', 'last_name', 'dob', 'gender', 'phone', 'email', 'address',
    'blood_group', 'allergies', 'current_medications', 'medical_history',
    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
    'insurance_provider', 'policy_type', 'policy_validity',
    'attending_physician', 'department', 'ward_room_bed',
  ];

  const updates = Object.entries(fields)
    .filter(([key]) => allowed.includes(key))
    .filter(([, val]) => val !== undefined);

  if (updates.length === 0) throw new Error('No valid fields to update');

  const setClauses = updates.map(([key], i) => `${key} = $${i + 2}`).join(', ');
  const values     = updates.map(([, val]) => val);

  const result = await pool.query(
    `UPDATE patients SET ${setClauses} WHERE id = $1 RETURNING *`,
    [patientId, ...values]
  );

  if (result.rowCount === 0) throw new Error(`Patient ID ${patientId} not found`);
  return result.rows[0];
};

