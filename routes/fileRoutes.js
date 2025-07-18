const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const fileController = require("../controllers/fileController");

// POST /parse-pdf
router.post("/parse-pdf", upload.single("file"), fileController.parsePdf);
// GET /file-info
router.get("/file-info", fileController.getFileInfo);

module.exports = router; 