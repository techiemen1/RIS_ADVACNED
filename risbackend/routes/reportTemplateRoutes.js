const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/reportTemplateController");

/* ADMIN (Settings) */
router.get("/", auth, ctrl.listTemplates);
router.post("/", auth, ctrl.createTemplate);
router.put("/:id", auth, ctrl.updateTemplate);
router.delete("/:id", auth, ctrl.disableTemplate);

/* RADIOLOGIST (Editor) */
router.get("/match", auth, ctrl.matchTemplates);

module.exports = router;

