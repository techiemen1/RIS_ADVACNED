// utils/mwlExporter.js
const axios = require('axios');

/**
 * Send MWL-like JSON to a PACS worklist ingestion endpoint.
 * pacs: pacs record from DB
 * appointment: appointment row
 */
async function sendMWL(pacs, appointment) {
  const base = pacs.base_url || `${pacs.host}:${pacs.port}`;
  let baseUrl = base;
  if (!/^https?:\/\//i.test(baseUrl)) baseUrl = `http://${baseUrl}`;

  // Decide endpoint heuristically
  let url;
  if (pacs.type && pacs.type.toLowerCase().includes('orthanc')) {
    url = `${baseUrl}/worklist`; // Orthanc worklist plugin endpoint (varies by setup)
  } else if (pacs.type && pacs.type.toLowerCase().includes('dcm4chee')) {
    url = `${baseUrl}/mwl`;
  } else {
    url = `${baseUrl}/mwl`;
  }

  const axiosConfig = { timeout: 10000 };
  if (pacs.username && pacs.password) axiosConfig.auth = { username: pacs.username, password: pacs.password };

  const mwlItem = buildMWL(appointment);
  // Many PACS expect XML/DICOM; some accept JSON. This function assumes PACS has REST ingestion for MWL JSON.
  const res = await axios.post(url, mwlItem, axiosConfig);
  return res.data;
}

function buildMWL(appt) {
  return {
    PatientName: appt.patient_name || '',
    PatientID: appt.patient_id || '',
    AccessionNumber: appt.accession_number || '',
    RequestedProcedureID: appt.requested_procedure_id || '',
    ScheduledProcedureStepSequence: [{
      Modality: appt.modality,
      ScheduledProcedureStepStartDateTime: appt.scheduled_start,
      ScheduledStationAETITLE: appt.station_aet || ''
    }]
  };
}

module.exports = { sendMWL, buildMWL };
