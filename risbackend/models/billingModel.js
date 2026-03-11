const { pool } = require('../db');

// Create a new billing entry with GST support
exports.createBill = async (data) => {
  const {
    patient_id, order_id,
    hsn_code, taxable_amount,
    cgst_rate, sgst_rate, igst_rate,
    cgst_amount, sgst_amount, igst_amount,
    total_amount, discount,
    payment_status, payment_method, created_by
  } = data;

  // Generate simple invoice number: INV-YYYYMMDD-XXXX
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // 20260110
  const rand = Math.floor(1000 + Math.random() * 9000);
  const invoice_number = `INV-${date}-${rand}`;

  const result = await pool.query(
    `INSERT INTO billing 
      (patient_id, order_id, invoice_number, hsn_code, taxable_amount, 
       cgst_rate, sgst_rate, igst_rate, 
       cgst_amount, sgst_amount, igst_amount, 
       total_amount, discount, 
       payment_status, payment_method, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      patient_id, order_id, invoice_number, hsn_code, taxable_amount,
      cgst_rate || 0, sgst_rate || 0, igst_rate || 0,
      cgst_amount || 0, sgst_amount || 0, igst_amount || 0,
      total_amount, discount || 0,
      payment_status || 'pending', payment_method, created_by
    ]
  );

  return result.rows[0];
};

// Get all bills for history
exports.getAllBills = async () => {
  const result = await pool.query(
    `SELECT b.*, 
            p.first_name || ' ' || p.last_name as patient_name, 
            p.mrn,
            o.procedure_description, 
            o.modality
     FROM billing b
     LEFT JOIN patients p ON b.patient_id = p.id
     LEFT JOIN orders o ON b.order_id = o.id
     ORDER BY b.created_at DESC`
  );
  return result.rows;
};

// Get all bills for a patient
exports.getBillsByPatient = async (patient_id) => {
  const result = await pool.query(
    `SELECT b.*, p.first_name, p.last_name, w.study_instance_uid
     FROM billing b
     JOIN patients p ON b.patient_id = p.id
     JOIN worklist w ON b.worklist_id = w.id
     WHERE b.patient_id=$1
     ORDER BY b.created_at DESC`,
    [patient_id]
  );
  return result.rows;
};

// Update a bill
exports.updateBill = async (id, data) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, i) => `${key}=$${i + 1}`).join(', ');

  const result = await pool.query(
    `UPDATE billing SET ${setClause}, updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length + 1} RETURNING *`,
    [...values, id]
  );

  return result.rows[0];
};

// Delete a bill
exports.deleteBill = async (id) => {
  const result = await pool.query(`DELETE FROM billing WHERE id=$1 RETURNING *`, [id]);
  return result.rows[0];
};
