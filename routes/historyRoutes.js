const express = require("express");
const router = express.Router();
const historyController = require("../controllers/historyController");

// GET /history
router.get("/history", historyController.getHistory);

module.exports = router; 