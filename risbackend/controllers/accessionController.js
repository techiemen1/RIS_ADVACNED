// controllers/accessionController.js
const accessionService = require("../services/accessionService");

exports.next = async (req, res) => {
  try {
    const { prefix } = req.body || {};
    const acc = await accessionService.generate(prefix || "");
    res.json({ success: true, data: { accession: acc } });
  } catch (err) {
    console.error("accession.next", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reserve = async (req, res) => {
  try {
    const { prefix } = req.body || {};
    const acc = await accessionService.reserve(prefix || "");
    res.json({ success: true, data: { accession: acc } });
  } catch (err) {
    console.error("accession.reserve", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
