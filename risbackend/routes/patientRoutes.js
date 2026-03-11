const express = require('express');
const router = express.Router();
const Patient = require('../models/patientModel');
const patientController = require('../controllers/patientController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');
const { requireBranchContext } = require('../middleware/branchMiddleware');
const { logAction } = require('../controllers/auditController');

// Create new patient
router.post('/', verifyToken, requireBranchContext, authorize(['admin', 'staff', 'receptionist']), patientController.addPatient);

// Search patients (Intelligent Identity Search)
router.get('/search', verifyToken, requireBranchContext, authorize(['admin', 'staff', 'doctor', 'receptionist']), patientController.searchPatients);

// Get patient by ID
router.get('/:id', verifyToken, requireBranchContext, authorize(['admin', 'staff', 'doctor', 'receptionist']), patientController.getPatient);

// Get all patients (with search + pagination)
// List all patients
router.get('/', verifyToken, requireBranchContext, authorize(['admin', 'staff', 'doctor', 'receptionist']), patientController.listPatients);

// ── PATCH /api/patients/:id/mrn ─────────────────────────────────────────────
// Update MRN for a specific patient.
// Restricted to admin + staff — sensitive clinical identifier.
// Validates format, checks uniqueness (DB constraint), logs the action.
//
// Body: { mrn: "MRN-2603-000099" }
// Returns: { id, mrn, first_name, last_name }
router.patch('/:id/mrn', verifyToken, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { mrn } = req.body;
    if (!mrn) return res.status(400).json({ error: 'MRN value is required' });

    const updated = await Patient.updateMrn(req.params.id, mrn);
    await logAction(
      req.user.username,
      req.user.role,
      `Updated MRN for patient ID ${req.params.id} → ${updated.mrn}`
    );

    res.json({
      success: true,
      message: `MRN updated to ${updated.mrn}`,
      patient: updated,
    });
  } catch (err) {
    console.error('MRN update error:', err.message);
    const status = err.message?.includes('already assigned') ? 409
                 : err.message?.includes('not found')        ? 404
                 : err.message?.includes('Invalid MRN')      ? 400
                 : 500;
    res.status(status).json({ error: err.message || 'Failed to update MRN' });
  }
});

// ── PUT /api/patients/:id ────────────────────────────────────────────────────
// General patient record update (demographics, contacts, clinical fields)
router.put('/:id', verifyToken, authorize(['admin', 'staff', 'receptionist']), async (req, res) => {
  try {
    const updated = await Patient.updatePatient(req.params.id, req.body);
    await logAction(req.user.username, req.user.role, `Updated patient ID ${req.params.id}`);
    res.json(updated);
  } catch (err) {
    console.error('Patient update error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to update patient' });
  }
});

module.exports = router;

