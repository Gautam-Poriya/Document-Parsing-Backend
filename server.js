const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/", require("./routes/authRoutes"));
app.use("/", require("./routes/organizationRoutes"));
app.use("/", require("./routes/fileRoutes"));
app.use("/", require("./routes/historyRoutes"));

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
