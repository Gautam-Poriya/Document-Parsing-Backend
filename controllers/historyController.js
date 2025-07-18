const jwt = require("jsonwebtoken");
const prismaclient = require("@prisma/client");
const prisma = new prismaclient.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// GET /history
exports.getHistory = async (req, res) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
  // Get organization from query params
  const organization = req.query.organization;
  console.log("token recieved in history section:", token);
  console.log("organization recieved in history section:", organization);
  // ✅ Fetch userId from DB
  const user = await prisma.user.findUnique({
    where: { id: decodedToken.id },
  });
  console.log("iser from hisory with the help of user id:", user);
  if (!user) return res.status(404).json({ error: "User not found" });
  const organizationObject = await prisma.organization.findUnique({
    where: { Organization_Name: organization },
  });
  console.log("organizationObject is:", organizationObject);
  if (!organizationObject)
    return res.status(404).json({ error: "Organization not found" });
  const organizationId = organizationObject.Organization_Id;
  console.log("organizationId is:", organizationId);
  try {
    const files = await prisma.fileInformation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
    console.log("Files fetched successfully:", files);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: "Error fetching files" });
  }
}; 