// models/reportModel.js
const { pool } = require("../config/postgres");

exports.getReport = async (studyUID) => {
  const q = `
    SELECT *
    FROM reports
    WHERE study_uid = $1
    ORDER BY version DESC
    LIMIT 1
  `;
  const r = await pool.query(q, [studyUID]);
  return r.rows[0] || null;
};

exports.getAllVersions = async (studyUID) => {
  const q = `
    SELECT *
    FROM reports
    WHERE study_uid = $1
    ORDER BY version DESC
  `;
  const r = await pool.query(q, [studyUID]);
  return r.rows;
};

exports.saveReport = async (data) => {
  const {
    studyUID,
    patientName,
    patientID,
    accessionNumber,
    modality,
    studyDate,
    content,
    status,
  } = data;

  // determine next version
  const versionQ = `SELECT COALESCE(MAX(version), 0) + 1 AS v FROM reports WHERE study_uid=$1`;
  const versionR = await pool.query(versionQ, [studyUID]);
  const nextVersion = versionR.rows[0].v;

  const q = `
    INSERT INTO reports
    (study_uid, version, patient_name, patient_id, accession_number,
     modality, study_date, content, status, created_at)
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    RETURNING *
  `;
  const params = [
    studyUID,
    nextVersion,
    patientName,
    patientID,
    accessionNumber,
    modality,
    studyDate,
    content,
    status,
  ];

  const r = await pool.query(q, params);
  return r.rows[0];
};
