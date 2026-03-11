// controllers/utilsController.js
const { v4: uuidv4 } = require('uuid');

let accessionCounter = 0; // For demo; replace with DB-backed sequence in production

exports.previewAccession = async (req, res) => {
  const prefix = (req.query.prefix || 'ACC').toUpperCase();
  const next = `${prefix}-${(Date.now() % 1000000).toString().padStart(6, '0')}`;
  res.json({ accession: next });
};

exports.nextAccession = async (req, res) => {
  accessionCounter += 1;
  const acc = `ACC-${new Date().getFullYear()}-${String(accessionCounter).padStart(6, '0')}`;
  res.json({ accession: acc });
};

exports.reserveUIDs = async (req, res) => {
  const count = Number(req.body.count || 1);
  const reserved = [];
  for (let i = 0; i < count; i++) {
    reserved.push({
      StudyInstanceUID: uuidv4(),
      SeriesInstanceUID: uuidv4(),
      SOPInstanceUID: uuidv4()
    });
  }
  res.json({ reserved });
};
