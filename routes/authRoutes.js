const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// POST /signin
router.post("/signin", authController.signIn);
// GET /home
router.get("/home", authController.home);

module.exports = router; 