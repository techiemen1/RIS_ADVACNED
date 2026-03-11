// routes/accessionRoutes.js
const express = require("express");
const router = express.Router();
const accessionController = require("../controllers/accessionController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/next", verifyToken, accessionController.next);
router.post("/reserve", verifyToken, accessionController.reserve);

module.exports = router;
