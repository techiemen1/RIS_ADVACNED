const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/token", verifyToken, (req, res) => {
  return res.json({
    success: true,
    message: "Token OK",
    user: req.user
  });
});

module.exports = router;
