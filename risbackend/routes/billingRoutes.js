const express = require('express');
const router = express.Router();
const {
  createBill,
  getInvoiceHistory,
  getBillsByPatient,
  updateBill,
  deleteBill
} = require('../controllers/billingController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Create bill (admin or staff)
router.post('/', verifyToken, authorize(['admin', 'staff']), createBill);

// Get Invoice History (All)
router.get('/', verifyToken, authorize(['admin', 'staff']), getInvoiceHistory);


// Get bills for a patient
router.get('/patient/:patient_id', verifyToken, authorize(['admin', 'staff', 'radiologist']), getBillsByPatient);

// Update bill
router.put('/:id', verifyToken, authorize(['admin', 'staff']), updateBill);

// Delete bill
router.delete('/:id', verifyToken, authorize(['admin']), deleteBill);

module.exports = router;
