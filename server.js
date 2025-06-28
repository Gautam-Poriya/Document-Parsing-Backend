const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const admin = require("./firebaseAdmin");
const prismaclient = require("@prisma/client");

// file parsing
const multer = require("multer");
const pdfParse = require("pdf-parse");
const showDown = require("showdown");
const xlsx = require("xlsx");
const MarkDownIt = require("markdown-it");
const FormData = require("form-data");
const fs = require("fs");
const axios = require("axios");

const app = express();
const prisma = new prismaclient.PrismaClient();
// const upload = multer({ dest: "uploads/" });
// Multer configuration for handling file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const JWT_SECRET = process.env.JWT_SECRET;

app.post("/signin", async (req, res) => {
  try {
    const { token } = req.body;
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { email, name, picture } = decodedToken;

    let user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    console.log("the existing user data is:", user);
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          picture,
        },
      });
    }
    console.log("user created and his data is:", user.data);
    const jwtToken = jwt.sign({ id: user.id, email }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token: jwtToken, user });
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Invalid token" });
  }
});

//Protected route example

app.get("/home", async (req, res) => {
  try {
    const authHeader = req.header.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
    });
    if (!user) {
      return res.status(401).json({ error: "user not found" });
    }
    res.json({ message: "welcome", user });
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: "Invalid token" });
  }
});

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

      console.log("Job Status Response:", response.data);
      status = response.data.status;
      jobData = response.data;
    }
    console.log("jobData is:", jobData);
    return jobData; // Returns once job is completed
  } catch (error) {
    console.error("Error fetching job status:", error.message);
    throw error;
  }
};

//  API endpoint for file upload and parsing

app.post("/parse-pdf", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileName = req.file.originalname;
  // const user = await prisma.User.findUnique({
  //   where: { email:  }, // Replace with actual user email
  // });
  // const userId = user?.id;
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
  // const userId = user;
  console.log("👤 User ID:", user.id);
  // const userId=localStorage.getItem(data.token);
  // console.log("userId is",userId);
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
        console.log("xlsxResponse respponse is:", xlsxResponse.data);

        // const xlsxData = Buffer.isBuffer(xlsxResponse.data)
        //   ? xlsxResponse.data.toString("base64") // Convert to Base64
        //   : xlsxResponse.data; // Keep as is if already a string

        // const cleanText = (text) =>
        //   text ? text.replace(/\0/g, "") : null;

        // console.log("xlsx respponse is:", xlsxData.data);
        // 🛠️ Store data in Prisma SQLite database
        // let existOrg = await prisma.organization.findUnique({
        //   where: {
        //     organization,
        //     userId: user.id,

        //   },
        // });
        // if (!existOrg) {

        //   const org = await prisma.organization.create({
        //     data: {
        //       Oragnization_Name: organization,
        //       userId: user.id, // Linking to an existing user
        //     },
        //   });
        //   console.log("✅ Organization stored successfully:", org);
        // }
        const organizationId = await prisma.organization.findUnique({
          where: { Oragnization_Name: organization },
        });

        const fileInfo = await prisma.fileInformation.create({
          data: {
            // userId: userId.id, // Ensure userId is available

            uuid: crypto.randomUUID(), // Generate a unique UUID
            jobId: jobId, // Store Job ID
            file_Name: fileName, // File name from parameter
            parseMode: parseMode, // Parse mode (e.g., "Fast", "Accurate")
            markDown: JSON.stringify(markdownResponse.data) ?? null,
            text: JSON.stringify(textResponse.data) ?? null,
            json: JSON.stringify(jsonResponse.data) ?? null,
            organizationId: organizationId.Organization_Id,

            // markDown:null,
            // text:null,
            // json:null,

            // markDown: cleanText(markdownResponse.data),
            // text: cleanText(textResponse.data),
            // json: cleanText(jsonResponse),

            // json: jsonResponse.data ? JSON.stringify(jsonResponse.data) : null,

            images: null,
            layout: null,
            xlsx: null,
          },
        });

        console.log("✅ File information stored successfully:", fileInfo);
        // Organize all responses
        const result = {
          markdown: markdownResponse.data,
          text: textResponse.data,
          json: jsonResponse.data,
          // structured: structuredResponse.data,
          xlsx: xlsxResponse.data,
           job_id:jobId
        };

        // console.log("All API Responses:", result);
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

        // 🛠️ Store data in Prisma SQLite database

        // const fileInfo = await prisma.File_Information.create({
        //   data: {
        //     uuid: crypto.randomUUID(), // Generate a unique UUID
        //     jobId: jobId, // Store Job ID
        //     file_Name: fileName, // File name from parameter
        //     parseMode: parseMode, // Parse mode (e.g., "Fast", "Accurate")
        //     markDown: markdownResponse.data ?? null,
        //     text: textResponse.data ?? null,
        //     json: jsonResponse.data ?? null,
        //     images: null,
        //     layout: null,
        //     xlsx: xlsxResponse.data ?? null,
        //     //  userId: userId, // Ensure userId is available
        //   },
        // });

        // console.log("✅ File information stored successfully:", fileInfo);
        // Organize all responses
        const result = {
          text: textResponse.data,
          json: jsonResponse.data,
          job_id:jobId
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
        // 🛠️ Store data in Prisma SQLite database

        // const fileInfo = await prisma.File_Information.create({
        //   data: {
        //     uuid: crypto.randomUUID(), // Generate a unique UUID
        //     jobId: jobId, // Store Job ID
        //     file_Name: fileName, // File name from parameter
        //     parseMode: parseMode, // Parse mode (e.g., "Fast", "Accurate")
        //     markDown: markdownResponse.data ?? null,
        //     text: textResponse.data ?? null,
        //     json: jsonResponse.data ?? null,
        //     images: null,
        //     layout: null,
        //     xlsx: xlsxResponse.data ?? null,
        //     //  userId: userId, // Ensure userId is available
        //   },
        // });

        // console.log("✅ File information stored successfully:", fileInfo);
        // Organize all responses
        const result = {
          markdown: markdownResponse.data,
          text: textResponse.data,
          json: jsonResponse.data,
         // structured: structuredResponse.data,
          xlsx: xlsxResponse.data,
           job_id:jobId
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
});



app.post("/api/organizations", async (req, res) => {
  const { token, organizationName } = req.body;
  console.log("Received Token:", token); // Log token for debugging

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    console.log("Decoded Token:", decodedToken); // Log decoded token
    const user = await prisma.user.findUnique({
      where: {
        email: decodedToken.email,
      },
    });
    const organization = await prisma.organization.create({
      data: {
        Oragnization_Name: organizationName,
        userId: user.id,
      },
    });
    console.log("Organization created successfully:", organization);
    res.json(organization);
  } catch (error) {
    console.error("Error creating organization:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//history

app.get("/history", async (req, res) => {
  const token = req.body.token;
  console.log("token recieved in history section:", token);
  const organization = req.body.organization;
  console.log("organization recieved in history section:", organization);
  const decodedToken = jwt.verify(token, JWT_SECRET);
  // ✅ Fetch userId from DB
  const user = await prisma.user.findUnique({
    where: { id: decodedToken.id },
  });
  console.log("iser from hisory with the help of user id:", user);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
  const organizationObject = await prisma.organization.findUnique({
    where: { Oragnization_Name: organization },
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
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});

//another method if lamma take time to resolve particular API
// let retries = 3;
// let delay = 2000; // Start with 2 seconds
// for (let i = 0; i < retries; i++){
// try {
//  }catch(error){
//   console.error(`Attempt ${i + 1} failed:`, error.response?.status);
//   if (i < retries - 1) {
//     await new Promise((resolve) => setTimeout(resolve, delay));
//     delay *= 2; // Increase wait time
//   } else {
//     console.error('All attempts failed');
//   }
//  }

// }
// const structuredResponse = await axios.get(
//  // `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/structured`,
//  `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/structured`,

//   { headers }
// );
// console.log("structured respponse is:",structuredResponse.data);

//Another way of API calling
//markdown API Call
//   let MarkDownConfig = {
//     method: "get",
//     maxBodyLength: Infinity,
//     url: `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/markdown`,
//     headers: {
//       Accept: "application/json",
//       Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY} `,
//     },
//   };

//   axios
//     .request(MarkDownConfig)
//     .then((MarkDownCongifResponse) => {
//       console.log(
//         "job detail response is this:",
//         JSON.stringify(MarkDownCongifResponse.data)
//       );
//       res.json({ markdown: MarkDownCongifResponse.data });
//     })
//     .catch((error) => {
//       console.log("error avi che:", error);
//     });

//   // Row Text API Call

// let TextConfig = {
//   method: "get",
//   maxBodyLength: Infinity,
//   url: `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/text`,
//   headers: {
//     Accept: "application/json",
//     Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
//   },
// };

// axios
//   .request(TextConfig)
//   .then((TextConfigResponse) => {
//     console.log(JSON.stringify(TextConfigResponse.data));
//     res.json({ Text: TextConfigResponse.data });
//   })
//   .catch((error) => {
//     console.log(error);
//   });

//   // Job JSON API Call
//   let JsonConfig = {
//     method: "get",
//     maxBodyLength: Infinity,
//     url: `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/json`,
//     headers: {
//       Accept: "application/json",
//       Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
//     },
//   };

//   axios
//     .request(JsonConfig)
//     .then((JsonConfigResponse) => {
//       console.log(JSON.stringify(JsonConfigResponse.data));
//       res.json({ JSON: JsonConfigResponse.data });
//     })
//     .catch((error) => {
//       console.log(error);
//     });

//   // Job Structured API Call

//   let StructuredConfig = {
//     method: "get",
//     maxBodyLength: Infinity,
//     url: `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/structured`,
//     headers: {
//       Accept: "application/json",
//       Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
//     },
//   };

//   axios
//     .request(StructuredConfig)
//     .then((StructuredConfigResponse) => {
//       console.log(JSON.stringify(StructuredConfigResponse.data));
//       res.json({ Structured: StructuredConfigResponse.data });
//     })
//     .catch((error) => {
//       console.log(error);
//     });

//   // job XLSX API Call

//   let XlsxConfig = {
//     method: "get",
//     maxBodyLength: Infinity,
//     url: `https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/raw/xlsx`,
//     headers: {
//       Accept: "application/json",
//       Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
//     },
//   };

//   axios
//     .request(XlsxConfig)
//     .then((XlsxConfigResponse) => {
//       console.log(JSON.stringify(XlsxConfigResponse.data));
//       res.json({ Xlsx: XlsxConfigResponse.data });
//     })
//     .catch((error) => {
//       console.log(error);
//     });
//     console.log("XLSX IS:",XlsxConfig)

// }}

//testing ohter API method to get response

//all API Call response in One Object
// try {
// Use Promise.all to wait for all API calls to finish
// const [
//   MarkDownCongifResponse,
//   TextConfigResponse,
//   JsonConfigResponse,
//   StructuredConfigResponse,
//   XlsxConfigResponse,
// ]
// const response= await Promise.allSettled([
//   axios.request(MarkDownConfig),
//   axios.request(TextConfig),
//   axios.request(JsonConfig),
//   axios.request(StructuredConfig),
//   axios.request(XlsxConfig),
// ]);

// Combine all the responses into one object
// const combinedResponse = {
//   markdown: MarkDownCongifResponse.data,
//   text: TextConfigResponse.data,
//   json: JsonConfigResponse.data,
//   structured: StructuredConfigResponse.data,
//   xlsx: XlsxConfigResponse.data,
// };
// response.forEach((response, index) => {
//   if (response.status === "rejected") {
//     console.error(`Request ${index + 1} failed:`, response.reason);
//   } else {
//     console.log(`Request ${index + 1} succeeded:`, response.value.data);
//   }
// });

// Print each response one by one in the terminal
// console.log('Markdown Response:', JSON.stringify(combinedResponse.markdown.data, null, 2));
// console.log('Text Response:', JSON.stringify(combinedResponse.text.data, null, 2));
// console.log('JSON Response:', JSON.stringify(combinedResponse.json.data, null, 2));
// console.log('Structured Response:', JSON.stringify(combinedResponse.structured.data, null, 2));
// console.log('XLSX Response:', JSON.stringify(combinedResponse.xlsx.data, null, 2));

// Send the combined response to the frontend

// } catch (error) {
//   console.error("Error in API calls:", error);
//   res
//     .status(500)
//     .json({ error: "An error occurred while processing the request" });
// }

// parse the pdf to extract here
// const pdfBuffer=require('fs').readFileSync(filePath)
// const pdfData=await pdfParse(pdfBuffer)

// // convert text into markdown
// const md=MarkDownIt();
// // const converter=new showDown.Converter()
// const markDown=md.render(pdfData.text)

// const wb=xlsx.utils.book_new()
// const ws=xlsx.utils.aoa_to_sheet([[pdfData.text]])
// xlsx.utils.book_append_sheet(wb,ws,'Sheet1')
// const xlsxData=xlsx.write(wb,{type:'buffer',bookType:'xlsx'})

//save the file meta data parse content to DB

//API call to the Llamma-Cloud endpoint

//31 jan Lamma-CLoud SDK usage

// try {
//   // Make a GET request to the API
//   const get_Job_id_response_in_Mark_Down = await axios.get(
//     `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`,
//     {
//       headers: {
//         accept: "application/json",
//         Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`, // Use environment variable for API key
//       },
//     }
//   );

//   // Send back the response data from the API
//   console.log("Job id response is:", get_Job_id_response_in_Mark_Down);

//   res.json(get_Job_id_response_in_Mark_Down.data);
// } catch (error) {
//   console.error("Error fetching job status:", error.message);

//   // Handle errors gracefully
//   if (error.get_Job_id_response) {
//     // If there's a response from the API, send that back
//     res
//       .status(error.get_Job_id_response.status)
//       .json({ error: error.get_Job_id_response.data });
//   } else {
//     // For other errors (like network issues)
//     res.status(500).json({ error: "An unexpected error occurred" });
//   }
// }
//  return res.json(get_Job_id_response.data);
// Clean up uploaded file
// require("fs").unlinkSync(filePath);

//storing parse file information inside file table
// const file = await prisma.file_Information.create({
//   data: {
//     uuid: req.file.filename,
//     file_Name: req.file.originalname,
//     parseMode,
//     markDown: markDown,
//     text: pdfData.text,
//     json: JSON.stringify(pdfData), // may be alternative way json:pdfData if pdfData is already json
//     xlsx: Buffer.isBuffer(xlsxData) ? xlsxData.toString("base64") : null, // Ensure safe conversion another way---->xlsxData.toString("base64"),
//   },
// });

// send response
// res.status(200).json({
//   message: "PDF parsed sucessfully",
//   file: {
//     id: file.id,
//     uuid: file.uuid,
//     filename: file.file_Name,
//     markdown: file.markdown,
//     text: file.text,
//     json: file.json,
//     xlsx: file.xlsx,
//   },
// });
//   console.log("Upload Success!", await response.data);
