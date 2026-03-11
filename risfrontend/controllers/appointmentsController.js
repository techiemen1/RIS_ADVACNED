// controllers/appointmentsController.js (snippet)
const accessionService = require('../services/accessionService');

exports.create = async (req, res) => {
  try {
    const body = req.body;

    // reserve accession if not provided
    if (!body.accession_number) {
      const user = req.user?.username || 'system';
      const row = await accessionService.generate({ prefix: 'ACC', modality: body.modality, createdBy: user });
      body.accession_number = row.accession;
    }

    // now continue saving appointment as before
    // ...
  } catch (err) { ... }
}
