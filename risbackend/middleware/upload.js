const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads/keyimages");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

module.exports = multer({ storage });

