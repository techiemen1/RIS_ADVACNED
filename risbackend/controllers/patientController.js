const patientService = require('../services/patientService');
const { createSchedule, getSchedules, getScheduleById, updateSchedule, deleteSchedule } = require('../models/scheduleModel');
const { sendEmail, sendSMS, sendWhatsApp } = require('../utils/notifications');
const { logAction } = require('./auditController');
const { verifyAadhaar, verifyPAN, verifyHealthId } = require('../services/verificationService');
const patientSearchService = require('../services/patientSearchService');

// --- Patient CRUD ---
exports.addPatient = async (req, res) => {
  try {
    const created_by = req.user.username;

    // Identity Verification (Simulated)
    const { id_type, id_number, abha_id } = req.body;

    if (id_type === 'AADHAAR' && id_number) {
      const v = await verifyAadhaar(id_number);
      if (!v.valid) return res.status(400).json({ error: v.message });
    } else if (id_type === 'PAN' && id_number) {
      const v = await verifyPAN(id_number);
      if (!v.valid) return res.status(400).json({ error: v.message });
    }

    if (abha_id) {
      const v = await verifyHealthId(abha_id);
      if (!v.valid) {
        // allowing soft warning for now or just log? 
        // for strict compliance we might block, but let's just log and allow if it's length issue
        console.warn(`ABHA Validation warning: ${v.message}`);
      }
    }

    const branch_id = req.branchId || req.user.branch_id || 1;

    const patient = await patientService.registerPatient({ ...req.body, created_by, branch_id });
    await logAction(created_by, req.user.role, `Created patient ${patient.first_name} ${patient.last_name} [MRN: ${patient.mrn}]`);
    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create patient' });
  }
};

exports.getPatient = async (req, res) => {
  try {
    const patient = await patientService.getPatient(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const patient = await patientService.updatePatient(req.params.id, req.body);
    await logAction(req.user.username, req.user.role, `Updated patient ID ${req.params.id}`);
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update patient' });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    await deletePatient(req.params.id);
    await logAction(req.user.username, req.user.role, `Deleted patient ID ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete patient' });
  }
};

exports.listPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const patients = await patientService.listPatients(limit, offset);
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
};

exports.searchPatients = async (req, res) => {
  try {
    const { q, dob } = req.query;
    const branch_id = req.branchId; 
    const patients = await patientSearchService.searchPatients({ q, dob, branch_id });
    res.json(patients);
  } catch (err) {
    console.error('searchPatients controller error:', err);
    res.status(500).json({ error: 'Failed to search patients' });
  }
};

// --- Schedule CRUD & Notifications ---
exports.addSchedule = async (req, res) => {
  try {
    const created_by = req.user.username;
    const schedule = await createSchedule({ ...req.body, created_by });

    // Send reminders (example)
    const msg = `Dear ${req.body.patient_name}, your ${req.body.modality} is scheduled at ${req.body.scheduled_time}`;
    if (req.body.phone) await sendSMS(req.body.phone, msg);
    if (req.body.email) await sendEmail(req.body.email, 'Appointment Reminder', msg);

    await logAction(created_by, req.user.role, `Scheduled patient ID ${req.body.patient_id}`);
    res.json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to schedule patient' });
  }
};

exports.listSchedules = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const schedules = await getSchedules(limit, offset);
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const schedule = await updateSchedule(req.params.id, req.body);
    await logAction(req.user.username, req.user.role, `Updated schedule ID ${req.params.id}`);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    await deleteSchedule(req.params.id);
    await logAction(req.user.username, req.user.role, `Deleted schedule ID ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
};
