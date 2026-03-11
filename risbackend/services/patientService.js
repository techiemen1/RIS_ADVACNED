const patientModel = require('../models/patientModel');

exports.registerPatient = async (data) => {
  return await patientModel.createPatient(data);
};

exports.getPatient = async (id) => {
  return await patientModel.getPatientById(id);
};

exports.updatePatient = async (id, data) => {
  return await patientModel.updatePatient(id, data);
};

exports.listPatients = async (limit, offset) => {
  return await patientModel.getPatients({ limit, offset });
};
