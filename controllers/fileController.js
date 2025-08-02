const jwt = require("jsonwebtoken");
const prismaclient = require("@prisma/client");
const prisma = new prismaclient.PrismaClient();
const FormData = require("form-data");
const axios = require("axios");
const crypto = require("crypto");
const JWT_SECRET = process.env.JWT_SECRET;

// Helper function (move getJobStatus to utils if needed)
const getJobStatus = async (jobId) => {
  const jobUrl = `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`; // Corrected endpoint
  try {
    let status = "PENDING";
    let jobData = null;
    while (status === "PENDING") {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for 3 seconds
      const response = await axios.get(jobUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
        },
      });
      status = response.data.status;
      jobData = response.data;
    }
    return jobData; // Returns once job is completed
  } catch (error) {
    throw error;
  }
};

// POST /parse-pdf
exports.parsePdf = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const fileName = req.file.originalname;
  const parseMode = req.body.parseMode;
  const organization = req.body.Organization;
  const userEmail = req.body.userEmail;
  const currentUser = req.body.currentUser;
  const token = req.body.token;
  console.log("🔑 Token recieved in accurate mode:", token);
  const decodedToken = jwt.verify(token, JWT_SECRET);
  // ✅ Fetch userId from DB
  const user = await prisma.user.findUnique({
    where: { email: decodedToken.email },
  });
  console.log("👤 User ID:", user.id);
  console.log("parse mode:", parseMode);
  console.log("organization is:", organization);
  console.log("user Data is:", userEmail);
  console.log("current user is:", currentUser.email);
  try {
    // Log the incoming file and request
    console.log("File received from frontent:", req.file);
    console.log(
      "Parsing mode select and send from frontend:",
      req.body.parseMode
    );
    const form = new FormData();
    //parsing with accurate mode
    if (req.body.parseMode == "Accurate") {
      form.append("auto_mode", "true");
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      }); // Attach uploaded file
      //response return two thing 1:id,2:status
      const uploadResponse = await axios.post(
        "https://api.cloud.llamaindex.ai/api/parsing/upload",
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
          },
        }
      );
      console.log(
        "Upload Successful to llamma-cloud and get response:",
        uploadResponse.data
      );
      const jobId = uploadResponse.data.id; // Retrieve job ID from URL parameters
      console.log("Job_id is :", jobId);
      // Fetch job details after completion
      const jobDetails = await getJobStatus(jobId);
      console.log("jobDetail is:", jobDetails);
      // another method for api call for multiple request
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
      };
      try {
        // Perform API calls one by one
        const markdownResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/markdown`,
          { headers }
        );
        console.log("markdown respponse is:", markdownResponse.data);
        const textResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/text`,
          { headers }
        );
        console.log("textResponse  is:", textResponse.data);
        const jsonResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/json`,
          { headers }
        );
        console.log("json respponse is:", jsonResponse.data);
        const xlsxResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/xlsx`,
          { headers }
        );
        // Convert to base64
        const xlsxBase64 = Buffer.from(xlsxResponse.data, "binary").toString(
          "base64"
        );
        console.log("xlsxResponse respponse is:", xlsxResponse.data);
        const organizationId = await prisma.organization.findFirst({
          where: { Organization_Name: organization },
        });
        const fileInfo = await prisma.fileInformation.create({
          data: {
            uuid: crypto.randomUUID(), // Generate a unique UUID
            jobId: jobId, // Store Job ID
            file_Name: fileName, // File name from parameter
            parseMode: parseMode, // Parse mode (e.g., "Fast", "Accurate")
            markDown: JSON.stringify(markdownResponse.data) ?? null,
            text: JSON.stringify(textResponse.data) ?? null,
            json: JSON.stringify(jsonResponse.data) ?? null,
            images: null,
            layout: null,
            xlsx: null,
            user: {
              connect: {
                id: user.id,
              },
            },
            organization: {
              connect: {
                Organization_Id: organizationId.Organization_Id,
              },
            },
          },
        });
        console.log("✅ File information stored successfully:", fileInfo);
        // Organize all responses
        const result = {
          markdown: markdownResponse.data,
          text: textResponse.data,
          json: jsonResponse.data,
          xlsx: xlsxBase64,
          job_id: jobId,
        };
        res.json(result); // Send all responses as a single JSON object
      } catch (error) {
        console.error("Error fetching data in Accurate Mode:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
    //parsing with Fast Mode
    if (req.body.parseMode == "Fast") {
      form.append("fast_mode", "true");
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      }); // Attach uploaded file
      //response return two thing 1:id,2:status
      const uploadResponse = await axios.post(
        "https://api.cloud.llamaindex.ai/api/parsing/upload",
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
          },
        }
      );
      console.log(
        "Upload Successful to llamma-cloud and get response:",
        uploadResponse.data
      );
      const jobId = uploadResponse.data.id; // Retrieve job ID from URL parameters
      console.log("Job_id is :", jobId);
      // Fetch job details after completion
      const jobDetails = await getJobStatus(jobId);
      console.log("jobDetail is:", jobDetails);
      // another method for api call for multiple request
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
      };
      try {
        // Perform API calls one by one
        const textResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/text`,
          { headers }
        );
        console.log("textResponse  is:", textResponse.data);
        const jsonResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/json`,
          { headers }
        );
        console.log("json respponse is:", jsonResponse.data);
         const organizationId = await prisma.organization.findFirst({
          where: { Organization_Name: organization },
        });
        const fileInfo = await prisma.fileInformation.create({
          data: {
            uuid: crypto.randomUUID(), // Generate a unique UUID
            jobId: jobId, // Store Job ID
            file_Name: fileName, // File name from parameter
            parseMode: parseMode, // Parse mode (e.g., "Fast", "Accurate")
            markDown: null,
            text: JSON.stringify(textResponse.data) ?? null,
            json: JSON.stringify(jsonResponse.data) ?? null,
            images: null,
            layout: null,
            xlsx: null,
            user: {
              connect: {
                id: user.id,
              },
            },
            organization: {
              connect: {
                Organization_Id: organizationId.Organization_Id,
              },
            },
          },
        });
        console.log("✅ File information stored successfully:", fileInfo);
        // Organize all responses
        const result = {
          // markdown: markdownResponse.data,
          text: textResponse.data,
          json: jsonResponse.data,
          job_id: jobId,
        };
        console.log("All API Responses:", result);
        res.json(result); // Send all responses as a single JSON object
      } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
    //Primium mode parsing Logic
    //parsing with accurate mode
    if (req.body.parseMode == "Premium mode (our most accurate mode)") {
      form.append("premium_mode", "true");
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      }); // Attach uploaded file
      //response return two thing 1:id,2:status
      const uploadResponse = await axios.post(
        "https://api.cloud.llamaindex.ai/api/parsing/upload",
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
          },
        }
      );
      console.log(
        "Upload Successful to llamma-cloud and get response:",
        uploadResponse.data
      );
      const jobId = uploadResponse.data.id; // Retrieve job ID from URL parameters
      console.log("Job_id is :", jobId);
      // Fetch job details after completion
      const jobDetails = await getJobStatus(jobId);
      console.log("jobDetail is:", jobDetails);
      // another method for api call for multiple request
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
      };
      try {
        // Perform API calls one by one
        const markdownResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/markdown`,
          { headers }
        );
        console.log("markdown respponse is:", markdownResponse.data);
        const textResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/text`,
          { headers }
        );
        console.log("textResponse  is:", textResponse.data);
        const jsonResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/json`,
          { headers }
        );
        console.log("json respponse is:", jsonResponse.data);
        const xlsxResponse = await axios.get(
          `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/xlsx`,
          { headers }
        );
        console.log("xlsx respponse is:", xlsxResponse.data);
         const organizationId = await prisma.organization.findFirst({
          where: { Organization_Name: organization },
        });
        const fileInfo = await prisma.fileInformation.create({
          data: {
            uuid: crypto.randomUUID(), // Generate a unique UUID
            jobId: jobId, // Store Job ID
            file_Name: fileName, // File name from parameter
            parseMode: parseMode, // Parse mode (e.g., "Fast", "Accurate")
            markDown: JSON.stringify(markdownResponse.data) ?? null,
            text: JSON.stringify(textResponse.data) ?? null,
            json: JSON.stringify(jsonResponse.data) ?? null,
            images: null,
            layout: null,
            xlsx: null,
            user: {
              connect: {
                id: user.id,
              },
            },
            organization: {
              connect: {
                Organization_Id: organizationId.Organization_Id,
              },
            },
          },
        });
        console.log("✅ File information stored successfully:", fileInfo);
        // Organize all responses
        const result = {
          markdown: markdownResponse.data,
          text: textResponse.data,
          json: jsonResponse.data,
          xlsx: xlsxResponse.data,
          job_id: jobId,
        };
        console.log("All API Responses:", result);
        res.json(result); // Send all responses as a single JSON object
      } catch (error) {
        console.error("Error fetching data in Accurate Mode:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    }
  } catch (error) {
    console.error(
      "Error Uploading PDF In Fast Mode:",
      error.uploadResponse?.data || error.message
    );
  }
};

// GET /file-info
exports.getFileInfo = async (req, res) => {
  const jobId = req.query.jobId;
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }
  if (!jobId) {
    return res.status(400).json({ message: "Job ID is required" });
  }
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
  const user = await prisma.user.findFirst({
    where: { id: decodedToken.id },
  });
  if (!user) {
    return res.status(401).json({ message: "Authorization required" });
  }
  const fileHistory = await prisma.fileInformation.findFirst({
    where: { jobId },
  });
  if (!fileHistory) {
    return res.status(404).json({ message: "Invalid Job Id" });
  }
  console.log("The file data by Job id :", fileHistory);
  res.status(200).json(fileHistory);
}; 