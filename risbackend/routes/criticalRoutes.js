const router = require("express").Router();
const ctrl = require("../controllers/criticalController");
const auth = require("../middleware/auth");

router.post("/mark", auth, ctrl.markCritical);
router.post("/acknowledge", auth, ctrl.acknowledge);

module.exports = router;

