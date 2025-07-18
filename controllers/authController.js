// Authentication controller
const jwt = require("jsonwebtoken");
const admin = require("../firebaseAdmin");
const prismaclient = require("@prisma/client");
const prisma = new prismaclient.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// POST /signin
exports.signIn = async (req, res) => {
  try {
    const { token } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { email, name, picture } = decodedToken;

    let user = await prisma.user.findUnique({
      where: { email },
    });
    console.log("the existing user data is:", user);
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          picture,
          Organizations: {
            create: {
              Organization_Name: "Test-Org",
            },
          },
        },
        include: {
          Organizations: true,
        },
      });
    }
    console.log("user created and his data is:", user);

    const jwtToken = jwt.sign({ id: user.id, email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token: jwtToken, user });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Invalid token" });
  }
};

// GET /home (protected route example)
exports.home = async (req, res) => {
  try {
    const authHeader = req.header.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    if (!user) {
      return res.status(401).json({ error: "user not found" });
    }
    res.json({ message: "welcome", user });
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "Invalid token" });
  }
}; 