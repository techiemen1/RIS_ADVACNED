const router = require("express").Router();
const { processAudio } = require("../services/sttService");

router.post("/stream", async (req, res) => {
  try {
    const text = await processAudio(req);
    return res.json({ text });
  } catch (err) {
    console.error("STT ERROR:", err);
    return res.status(500).json({ text: "" });
  }
});

module.exports = router;
