const Billing = require('../models/billingModel');
const { logAction } = require('./auditController');

// Create a new billing entry
// Create a new billing entry
exports.createBill = async (req, res) => {
  try {
    const {
      patient_id, order_id,
      hsn_code, taxable_amount,
      cgst_rate, sgst_rate, igst_rate,
      cgst_amount, sgst_amount, igst_amount,
      total_amount, discount,
      payment_status, payment_method
    } = req.body;

    const created_by = req.user.username;

    const bill = await Billing.createBill({
      patient_id, order_id,
      hsn_code, taxable_amount,
      cgst_rate, sgst_rate, igst_rate,
      cgst_amount, sgst_amount, igst_amount,
      total_amount, discount,
      payment_status, payment_method, created_by
    });

    await logAction(created_by, req.user.role, `Created bill ID ${bill.id} for patient ID ${patient_id}`);
    res.json(bill);
  } catch (err) {
    console.error('Create bill error:', err);
    res.status(500).json({ error: 'Failed to create bill' });
  }
};

// Get all invoices (History)
exports.getInvoiceHistory = async (req, res) => {
  try {
    const bills = await Billing.getAllBills();
    res.json({ success: true, data: bills });
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ error: 'Failed to fetch invoice history' });
  }
};

// Get bills by patient
exports.getBillsByPatient = async (req, res) => {
  try {
    const { patient_id } = req.params;
    const bills = await Billing.getBillsByPatient(patient_id);
    res.json(bills);
  } catch (err) {
    console.error('Fetch bills error:', err);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
};

// Update a bill
exports.updateBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Billing.updateBill(id, req.body);
    await logAction(req.user.username, req.user.role, `Updated bill ID ${id}`);
    res.json(bill);
  } catch (err) {
    console.error('Update bill error:', err);
    res.status(500).json({ error: 'Failed to update bill' });
  }
};

// Delete a bill
exports.deleteBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Billing.deleteBill(id);
    await logAction(req.user.username, req.user.role, `Deleted bill ID ${id}`);
    res.json({ success: true, bill });
  } catch (err) {
    console.error('Delete bill error:', err);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
};
