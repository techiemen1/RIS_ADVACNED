// Simulating DICOM C-FIND response format or JSON MWL
const orderModel = require('../models/orderModel');

exports.getWorklist = async (req, res) => {
  try {
    // Modality or Station Name typically query by 'modality' or 'scheduled_date'
    const { modality, date } = req.query;
    // Default to today if date not provided? Or all? Let's generic list for now.
    const orders = await orderModel.getOrders({ modality, scheduled_date: date });

    // Transform to DICOM-JSON friendly format if needed, 
    // OR just return clean JSON for our custom RIS MWL Client.
    // Standard DICOM tags mapping:
    const mwlItems = orders.map(o => ({
      "00100010": { "vr": "PN", "Value": [o.patient_name] }, // Patient Name
      "00100020": { "vr": "LO", "Value": [o.patient_id.toString()] }, // Patient ID
      "00100040": { "vr": "CS", "Value": [o.gender ? o.gender.charAt(0).toUpperCase() : 'O'] }, // Sex
      "00101000": { "vr": "LO", "Value": [o.id_number || o.aadhaar_number] }, // Other Patient IDs
      "00080050": { "vr": "SH", "Value": [o.accession_number] }, // Accession Number
      "0020000D": { "vr": "UI", "Value": [o.study_instance_uid] }, // Study Instance UID
      "00400001": { "vr": "AE", "Value": [o.modality] }, // Scheduled Station AE Title
      "00400002": { "vr": "DA", "Value": [o.scheduled_time ? new Date(o.scheduled_time).toISOString().slice(0, 10).replace(/-/g, '') : ''] }, // Sched Date
      "00400003": { "vr": "TM", "Value": [o.scheduled_time ? new Date(o.scheduled_time).toISOString().slice(11, 19).replace(/:/g, '') : ''] }, // Sched Time
      "00321060": { "vr": "LO", "Value": [o.procedure_description] },
      "00080060": { "vr": "CS", "Value": [o.modality] }, // Modality

      // Custom JSON fields for our UI
      id: o.id,
      patient_id: o.patient_id,
      patient_name: o.patient_name,
      accession_number: o.accession_number,
      status: o.status
    }));

    res.json({ success: true, data: mwlItems });
  } catch (err) {
    console.error("MWL Query Error:", err);
    res.status(500).json({ error: "MWL Error" });
  }
};
