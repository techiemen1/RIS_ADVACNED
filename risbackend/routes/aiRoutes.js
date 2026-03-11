// routes/aiRoutes.js
const router = require("express").Router();
const aiController = require("../controllers/aiController");

const upload = require("../middleware/upload");

// ALWAYS check this:
if (!aiController.generate || !aiController.transcribe) {
  console.error("❌ aiController missing methods");
}

const { verifyToken } = require("../middleware/authMiddleware");

router.post("/generate", verifyToken, aiController.generate);
router.post("/transcribe", verifyToken, upload.single("audio"), aiController.transcribe);
router.get("/study-context/:studyUID", verifyToken, aiController.getStudyContext);

module.exports = router;
