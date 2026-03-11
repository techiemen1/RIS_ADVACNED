// risbackend/services/patientSearchService.js
const { pool } = require('../config/postgres');

/**
 * Intelligent Patient Search
 * Logic:
 * 1. If input looks like MRN, Phone, ABHA, or KYC ID, search exact matches.
 * 2. Support fuzzy name search combined with DOB.
 */
exports.searchPatients = async (criteria) => {
  const { q, dob, branch_id } = criteria;
  if (!q && !dob) return [];

  const results = [];
  const params = [];
  let paramIdx = 1;

  // We'll build a query that looks for the string in multiple fields
  // or specific fields if they are identifiable.
  // For simplicity and broadness, we'll check MRN, Phone, ABHA, ID Number, and Name.
  
  let query = `
    SELECT 
      id, mrn, first_name, last_name, (first_name || ' ' || last_name) as name, phone, dob, 
      gender, abha_number, id_type, id_number, address
    FROM patients
    WHERE 1=1
  `;

  if (branch_id) {
    query += ` AND branch_id = $${paramIdx++}`;
    params.push(branch_id);
  }

  const searchConditions = [];

  if (q) {
    const searchVal = `%${q}%`;
    const exactVal = q.trim();
    
    // Exact matches for identifiers
    searchConditions.push(`mrn = $${paramIdx}`);
    searchConditions.push(`phone = $${paramIdx}`);
    searchConditions.push(`abha_number = $${paramIdx}`);
    searchConditions.push(`id_number = $${paramIdx}`);
    
    // Fuzzy/Partial matches
    searchConditions.push(`(first_name || ' ' || last_name) ILIKE $${paramIdx + 1}`);
    searchConditions.push(`first_name ILIKE $${paramIdx + 1}`);
    searchConditions.push(`last_name ILIKE $${paramIdx + 1}`);
    searchConditions.push(`mrn ILIKE $${paramIdx + 1}`);
    
    params.push(exactVal);
    params.push(searchVal);
    paramIdx += 2;
  }

  if (dob) {
    searchConditions.push(`dob = $${paramIdx++}`);
    params.push(dob);
  }

  if (searchConditions.length > 0) {
    query += ` AND (${searchConditions.join(' OR ')})`;
  }

  query += ` ORDER BY first_name ASC, last_name ASC LIMIT 50`;

  try {
    const { rows } = await pool.query(query, params);
    return rows;
  } catch (err) {
    console.error('patientSearchService error:', err);
    throw err;
  }
};
