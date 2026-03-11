const axios = require('axios');

const ORTHANC_URL = process.env.ORTHANC_URL || 'http://localhost:8042';
const DCM4CHEE_URL = process.env.DCM4CHEE_URL || 'http://localhost:8080';

exports.fetchOrthancStudies = async (patientId) => {
  const response = await axios.get(`${ORTHANC_URL}/patients/${patientId}/studies`);
  return response.data;
};

exports.fetchDcm4cheeStudies = async (patientId) => {
  const response = await axios.get(`${DCM4CHEE_URL}/dcm4chee-arc/aets/DCM4CHEE/rs/studies?PatientID=${patientId}`);
  return response.data;
};
