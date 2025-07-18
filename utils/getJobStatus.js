const axios = require("axios");

exports.getJobStatus = async (jobId) => {
  const jobUrl = `https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}`;
  try {
    let status = "PENDING";
    let jobData = null;
    while (status === "PENDING") {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const response = await axios.get(jobUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${process.env.LAMMA_CLOUD_API_KEY}`,
        },
      });
      status = response.data.status;
      jobData = response.data;
    }
    return jobData;
  } catch (error) {
    throw error;
  }
}; 