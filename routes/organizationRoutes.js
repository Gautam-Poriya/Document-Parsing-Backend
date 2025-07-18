const express = require("express");
const router = express.Router();
const organizationController = require("../controllers/organizationController");

// POST /api/organizations
router.post("/api/organizations", organizationController.createOrganization);
// GET /api/organizations
router.get("/api/organizations", organizationController.getOrganizations);

module.exports = router; 