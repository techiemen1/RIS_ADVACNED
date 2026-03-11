const router = require("express").Router();
const ctrl = require("../controllers/templateController");
const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");

/* ================= ADMIN ================= */
router.post("/", auth, requireAdmin, ctrl.createTemplate);
router.get("/all", auth, requireAdmin, ctrl.listTemplates);
router.put("/:id", auth, requireAdmin, ctrl.updateTemplate);
router.delete("/:id", auth, requireAdmin, ctrl.deleteTemplate);

/* ============== RADIOLOGIST ============== */
/**
 * GET /api/templates/match?modality=CT&bodyPart=CHEST
 */
router.get("/match", auth, ctrl.matchTemplates);

module.exports = router;

