require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
});

// Test endpoint
app.get("/", (req, res) => {
  res.json({
    message: "IPFS server is running",
  });
});

// Upload certificate to Pinata
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const formData = new FormData();

    const blob = new Blob(
      [req.file.buffer],
      { type: req.file.mimetype }
    );

    formData.append(
      "file",
      blob,
      req.file.originalname
    );

    const response = await fetch(
      "https://uploads.pinata.cloud/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Pinata error:", data);

      return res.status(response.status).json({
        error: "Pinata upload failed",
        details: data,
      });
    }

    console.log("Uploaded to IPFS:");
    console.log(data);

    const cid =
      data?.data?.cid ||
      data?.cid;

    if (!cid) {
      return res.status(500).json({
        error: "CID not returned by Pinata",
        pinataResponse: data,
      });
    }

    const ipfsUrl =
      `https://gateway.pinata.cloud/ipfs/${cid}`;

    res.json({
      success: true,
      cid,
      ipfsUrl,
      fileName: req.file.originalname,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`IPFS server running on http://localhost:${PORT}`);
});