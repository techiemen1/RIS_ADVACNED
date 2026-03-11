const Worklist = require('../models/worklistModel');
const Patient = require('../models/patientModel');
const dicomService = require('../utils/dicomService');

// Fetch worklist for a user or all
exports.getWorklist = async (req, res) => {
  try {
    const role = req.user.role;
    const username = req.user.username;

    const assignedTo = role === 'radiologist' || role === 'technologist' ? username : null;
    const worklist = await Worklist.getWorklist(assignedTo);

    res.json(worklist);
  } catch (err) {
    console.error('Worklist fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch worklist' });
  }
};

// Sync PACS studies to worklist
exports.syncPacsStudies = async (req, res) => {
  try {
    const { patientId, source } = req.body;
    let studies = [];

    if (source === 'orthanc') {
      studies = await dicomService.fetchOrthancStudies(patientId);
    } else if (source === 'dcm4chee') {
      studies = await dicomService.fetchDcm4cheeStudies(patientId);
    } else {
      return res.status(400).json({ error: 'Invalid PACS source' });
    }

    // Convert to worklist entries
    const entries = [];
    for (const study of studies) {
      const patient = await Patient.getPatientById(patientId);
      const entry = await Worklist.createWorklistEntry({
        patient_id: patient.id,
        study_instance_uid: study.ID || study.StudyInstanceUID,
        modality: study.Modality || 'UNKNOWN',
        study_date: study.StudyDate || new Date(),
        status: 'pending',
        assigned_to: null
      });
      entries.push(entry);
    }

    res.json({ success: true, entries });
  } catch (err) {
    console.error('Sync PACS error:', err);
    res.status(500).json({ error: 'Failed to sync PACS studies' });
  }
};
