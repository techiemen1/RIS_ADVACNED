// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const multer = require("multer");
const path = require("path");
const { verifyToken } = require("../middleware/authMiddleware");
const { requireBranchContext } = require("../middleware/branchMiddleware");

// Configure avatar uploads
const fs = require("fs");
const uploadDirAvatars = path.join(__dirname, "../uploads/avatars");
if (!fs.existsSync(uploadDirAvatars)) {
  fs.mkdirSync(uploadDirAvatars, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirAvatars),
  filename: (req, file, cb) =>
    cb(null, `user_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// Apply authentication to all user routes
router.use(verifyToken);
router.use(requireBranchContext);

// CRUD routes
router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

// Avatar upload
router.post("/:id/avatar", upload.single("profile_picture"), userController.uploadAvatar);

// Signature upload
// Signature upload
const uploadDirSignatures = path.join(__dirname, "../uploads/signatures");
if (!fs.existsSync(uploadDirSignatures)) {
  fs.mkdirSync(uploadDirSignatures, { recursive: true });
}

const sigStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirSignatures),
  filename: (req, file, cb) => cb(null, `sig_${Date.now()}${path.extname(file.originalname)}`)
});
const uploadSig = multer({ storage: sigStorage });
router.post("/:id/signature", uploadSig.single("signature"), userController.uploadSignature);

module.exports = router;
