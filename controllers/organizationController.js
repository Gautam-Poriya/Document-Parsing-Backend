const jwt = require("jsonwebtoken");
const prismaclient = require("@prisma/client");
const prisma = new prismaclient.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/organizations
exports.createOrganization = async (req, res) => {
  const { token, organizationName } = req.body;
  console.log("Received Token:", token); // Log token for debugging
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    console.log("Decoded Token:", decodedToken); // Log decoded token
    const user = await prisma.user.findUnique({
      where: { email: decodedToken.email },
    });
    const organization = await prisma.organization.create({
      data: {
        Organization_Name: organizationName,
        userId: user.id,
      },
    });
    console.log("Organization created successfully:", organization);
    res.json(organization);
  } catch (error) {
    console.error("Error creating organization:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// GET /api/organizations
exports.getOrganizations = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findFirst({
      where: { id: decodedToken.id },
    });
    console.log("the User data:", user);
    const allOrg = await prisma.organization.findMany({
      where: { userId: user.id },
    });
    console.log("Org Table Data for user:", allOrg);
    res.status(200).json(allOrg);
  } catch (error) {
    console.log("Error Occure While Fetching the all Organization");
    res.status(500).json({
      message: "Internal Server Error Please Try Later",
    });
  }
}; 