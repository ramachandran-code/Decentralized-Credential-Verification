require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());
app.use(express.json());

// ========================================
// MULTER CONFIGURATION
// ========================================

const upload = multer({
  storage: multer.memoryStorage(),
});

// ========================================
// OTP STORAGE
// ========================================

const otpStore = new Map();

const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

// ========================================
// TEST ENDPOINT
// ========================================

app.get("/", (req, res) => {
  res.json({
    message: "IPFS server is running",
  });
});

// ========================================
// SEND OTP
// ========================================

app.post("/send-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    // ----------------------------------------
    // Validate email
    // ----------------------------------------

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email address is required.",
      });
    }

    // Basic email validation
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // ----------------------------------------
    // Generate 6-digit OTP
    // ----------------------------------------

    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    // ----------------------------------------
    // Hash OTP before storing
    // ----------------------------------------

    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // ----------------------------------------
    // Store OTP
    // ----------------------------------------

    otpStore.set(email, {
      otpHash,
      expiresAt: Date.now() + OTP_EXPIRY,
      attempts: 0,
      verified: false,
    });

    // ----------------------------------------
    // Send OTP using Resend
    // ----------------------------------------

    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.RESEND_API_KEY}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          from:
            "Credential Verification <onboarding@resend.dev>",

          to: [email],

          subject:
            "Student Email Verification OTP",

          html: `
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8" />
</head>

<body
  style="
    font-family: Arial, sans-serif;
    background: #f4f7fb;
    padding: 30px;
  "
>

  <div
    style="
      max-width: 500px;
      margin: auto;
      background: #ffffff;
      padding: 30px;
      border-radius: 15px;
      border: 1px solid #e2e8f0;
    "
  >

    <h2
      style="
        color: #172554;
        text-align: center;
      "
    >
      🎓 Student Email Verification
    </h2>

    <p
      style="
        color: #475569;
        font-size: 15px;
      "
    >
      Your OTP for verifying your student email is:
    </p>

    <div
      style="
        text-align: center;
        margin: 25px 0;
      "
    >

      <span
        style="
          display: inline-block;
          padding: 15px 25px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
          color: #1d4ed8;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
        "
      >
        ${otp}
      </span>

    </div>

    <p
      style="
        color: #64748b;
        font-size: 13px;
      "
    >
      This OTP is valid for
      <strong>5 minutes</strong>.
    </p>

    <p
      style="
        color: #94a3b8;
        font-size: 12px;
      "
    >
      If you did not request this OTP,
      you can safely ignore this email.
    </p>

  </div>

</body>
</html>
          `,
        }),
      }
    );

    const data =
      await response.json();

    // ----------------------------------------
    // Resend error
    // ----------------------------------------

    if (!response.ok) {
      console.error(
        "Resend OTP error:",
        data
      );

      // Remove OTP if email failed
      otpStore.delete(email);

      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email.",
        details: data,
      });
    }

    console.log(
      `OTP sent to ${email}`
    );

    res.json({
      success: true,
      message: "OTP sent successfully.",
    });

  } catch (error) {

    console.error(
      "Send OTP error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while sending OTP.",
    });
  }
});

// ========================================
// VERIFY OTP
// ========================================

app.post("/verify-otp", (req, res) => {
  try {
    const email = String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

    const otp = String(
      req.body.otp || ""
    ).trim();

    // ----------------------------------------
    // Validate request
    // ----------------------------------------

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required.",
      });
    }

    // ----------------------------------------
    // Find OTP record
    // ----------------------------------------

    const record =
      otpStore.get(email);

    if (!record) {
      return res.status(400).json({
        success: false,
        message:
          "OTP not found. Please request a new OTP.",
      });
    }

    // ----------------------------------------
    // Check expiration
    // ----------------------------------------

    if (
      Date.now() >
      record.expiresAt
    ) {

      otpStore.delete(email);

      return res.status(400).json({
        success: false,
        message:
          "OTP has expired. Please request a new OTP.",
      });
    }

    // ----------------------------------------
    // Check maximum attempts
    // ----------------------------------------

    if (
      record.attempts >=
      MAX_ATTEMPTS
    ) {

      otpStore.delete(email);

      return res.status(400).json({
        success: false,
        message:
          "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    // ----------------------------------------
    // Hash entered OTP
    // ----------------------------------------

    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // ----------------------------------------
    // Compare hashes
    // ----------------------------------------

    if (
      otpHash !==
      record.otpHash
    ) {

      record.attempts += 1;

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP.",
      });
    }

    // ----------------------------------------
    // OTP verified
    // ----------------------------------------

    record.verified = true;

    console.log(
      `Email verified: ${email}`
    );

    res.json({
      success: true,
      message:
        "Email verified successfully.",
      email,
    });

  } catch (error) {

    console.error(
      "Verify OTP error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error while verifying OTP.",
    });
  }
});

// ========================================
// UPLOAD CERTIFICATE TO PINATA
// ========================================

app.post(
  "/upload",
  upload.single("file"),
  async (req, res) => {

    try {

      // ----------------------------------------
      // Check file
      // ----------------------------------------

      if (!req.file) {

        return res.status(400).json({
          error:
            "No file uploaded",
        });
      }

      // ----------------------------------------
      // Create FormData
      // ----------------------------------------

      const formData =
        new FormData();

      const blob =
        new Blob(
          [req.file.buffer],
          {
            type:
              req.file.mimetype,
          }
        );

      formData.append(
        "network",
        "public"
      );

      formData.append(
        "file",
        blob,
        req.file.originalname
      );

      // ----------------------------------------
      // Upload to Pinata
      // ----------------------------------------

      console.log("");
      console.log(
        "Uploading certificate to Pinata..."
      );

      const response =
        await fetch(
          "https://uploads.pinata.cloud/v3/files",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${process.env.PINATA_JWT}`,
            },

            body: formData,
          }
        );

      const data =
        await response.json();

      // ----------------------------------------
      // Pinata error
      // ----------------------------------------

      if (!response.ok) {

        console.error(
          "Pinata error:",
          data
        );

        return res.status(
          response.status
        ).json({
          error:
            "Pinata upload failed",

          details:
            data,
        });
      }

      console.log(
        "Uploaded to IPFS:"
      );

      console.log(data);

      // ----------------------------------------
      // Get CID
      // ----------------------------------------

      const cid =
        data?.data?.cid ||
        data?.cid;

      if (!cid) {

        return res.status(500).json({
          error:
            "CID not returned by Pinata",

          pinataResponse:
            data,
        });
      }

      // ----------------------------------------
      // Build IPFS URL
      // ----------------------------------------

      const ipfsUrl =
        `https://gateway.pinata.cloud/ipfs/${cid}`;

      console.log(
        "Certificate CID:",
        cid
      );

      console.log(
        "Certificate URL:",
        ipfsUrl
      );

      // ----------------------------------------
      // Response
      // ----------------------------------------

      res.json({
        success: true,
        cid,
        ipfsUrl,
        fileName:
          req.file.originalname,
      });

    } catch (error) {

      console.error(
        "Certificate upload error:",
        error
      );

      res.status(500).json({
        error:
          "Server error",

        message:
          error.message,
      });
    }
  }
);

// ========================================
// SEND CREDENTIAL EMAIL
// ========================================

app.post(
  "/send-credential-email",
  async (req, res) => {

    try {

      const {
        studentEmail,
        studentName,
        credentialId,
        verificationUrl,
        ipfsUrl,
      } = req.body;

      // ----------------------------------------
      // Validate request
      // ----------------------------------------

      if (
        !studentEmail ||
        !studentName ||
        !credentialId ||
        !verificationUrl
      ) {

        return res.status(400).json({
          success: false,

          message:
            "Student email, student name, credential ID and verification URL are required.",
        });
      }

      // ----------------------------------------
      // Generate QR image URL
      // ----------------------------------------

      const qrImageUrl =
        `https://quickchart.io/qr?text=${encodeURIComponent(
          verificationUrl
        )}&size=600&margin=3&ecLevel=H`;

      console.log("");
      console.log(
        "========================================"
      );

      console.log(
        "GENERATING CREDENTIAL QR CODE"
      );

      console.log(
        "========================================"
      );

      console.log(
        "Credential ID:",
        credentialId
      );

      console.log(
        "Verification URL:",
        verificationUrl
      );

      console.log(
        "QR Image URL:",
        qrImageUrl
      );

      console.log(
        "========================================"
      );

      console.log("");

      // ----------------------------------------
      // Send email through Resend
      // ----------------------------------------

      const response =
        await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${process.env.RESEND_API_KEY}`,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({

              from:
                "Decentralized Credential Verification <onboarding@resend.dev>",

              to: [
                studentEmail,
              ],

              subject:
                `Academic Credential Issued - ${credentialId}`,

              html: `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

</head>


<body
  style="
    margin: 0;
    padding: 0;
    background: #f4f7fb;
    font-family: Arial, Helvetica, sans-serif;
  "
>

  <!-- MAIN CONTAINER -->

  <div
    style="
      max-width: 650px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    "
  >

    <!-- ================================= -->
    <!-- HEADER -->
    <!-- ================================= -->

    <div
      style="
        padding: 32px 25px;
        text-align: center;
        background: linear-gradient(
          135deg,
          #2563eb,
          #4f46e5
        );
        color: #ffffff;
      "
    >

      <div
        style="
          font-size: 42px;
          margin-bottom: 10px;
        "
      >
        🎓
      </div>


      <h1
        style="
          margin: 0;
          font-size: 26px;
        "
      >
        Credential Issued Successfully
      </h1>


      <p
        style="
          margin: 10px 0 0;
          font-size: 14px;
          opacity: 0.9;
        "
      >
        Decentralized Credential Verification
      </p>

    </div>


    <!-- ================================= -->
    <!-- CONTENT -->
    <!-- ================================= -->

    <div
      style="
        padding: 30px;
        color: #334155;
      "
    >

      <!-- GREETING -->

      <p
        style="
          margin-top: 0;
          font-size: 17px;
        "
      >
        Hello
        <strong>${studentName}</strong>,
      </p>


      <!-- INTRODUCTION -->

      <p
        style="
          font-size: 14px;
          line-height: 1.7;
          color: #64748b;
        "
      >
        Your academic credential has been
        successfully issued and recorded
        on the blockchain.
      </p>


      <!-- ================================= -->
      <!-- CREDENTIAL DETAILS -->
      <!-- ================================= -->

      <div
        style="
          margin: 22px 0;
          padding: 20px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        "
      >

        <h2
          style="
            margin: 0 0 15px;
            font-size: 17px;
            color: #172554;
          "
        >
          📄 Credential Details
        </h2>


        <p
          style="
            margin: 8px 0;
            font-size: 14px;
          "
        >
          <strong>
            Credential ID:
          </strong>

          ${credentialId}

        </p>


        <p
          style="
            margin: 8px 0;
            font-size: 14px;
          "
        >
          <strong>
            Student:
          </strong>

          ${studentName}

        </p>

      </div>


      <!-- ================================= -->
      <!-- QR CODE -->
      <!-- ================================= -->

      <div
        style="
          text-align: center;
          margin: 30px 0;
        "
      >

        <h2
          style="
            margin: 0 0 10px;
            font-size: 19px;
            color: #172554;
          "
        >
          📱 Verification QR Code
        </h2>


        <p
          style="
            margin: 0 0 20px;
            font-size: 13px;
            color: #64748b;
          "
        >
          Scan this QR code to verify your
          academic credential.
        </p>


        <!-- QR IMAGE -->

        <div
          style="
            display: inline-block;
            padding: 15px;
            background: #ffffff;
            border: 1px solid #dbe3ef;
            border-radius: 14px;
          "
        >

          <img
            src="${qrImageUrl}"
            alt="Credential Verification QR Code"
            width="280"
            height="280"
            style="
              display: block;
              width: 280px;
              height: 280px;
              border: 0;
            "
          />

        </div>


        <!-- QR LINK FALLBACK -->

        <p
          style="
            margin-top: 15px;
            font-size: 11px;
            color: #94a3b8;
          "
        >
          If the QR code does not appear,
          use the verification link below.
        </p>

      </div>


      <!-- ================================= -->
      <!-- VERIFICATION LINK -->
      <!-- ================================= -->

      <div
        style="
          margin-top: 25px;
          padding: 20px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
        "
      >

        <h3
          style="
            margin: 0 0 10px;
            font-size: 15px;
            color: #1e40af;
          "
        >
          🔗 Verification Link
        </h3>


        <a
          href="${verificationUrl}"
          style="
            color: #2563eb;
            font-size: 13px;
            word-break: break-all;
          "
        >
          ${verificationUrl}
        </a>

      </div>


      <!-- ================================= -->
      <!-- IPFS CERTIFICATE -->
      <!-- ================================= -->

      ${
        ipfsUrl
          ? `

      <div
        style="
          margin-top: 15px;
          padding: 18px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        "
      >

        <p
          style="
            margin: 0;
            font-size: 12px;
            color: #64748b;
          "
        >
          📄 Certificate stored securely
          on IPFS
        </p>


        <a
          href="${ipfsUrl}"
          style="
            display: inline-block;
            margin-top: 8px;
            color: #2563eb;
            font-size: 12px;
            word-break: break-all;
          "
        >
          View Certificate
        </a>

      </div>

      `
          : ""
      }


      <!-- ================================= -->
      <!-- INFORMATION -->
      <!-- ================================= -->

      <p
        style="
          margin-top: 28px;
          font-size: 12px;
          line-height: 1.6;
          color: #94a3b8;
        "
      >
        Keep this email for your records.
        You can use the QR code or verification
        link whenever your credential needs
        to be verified.
      </p>

    </div>


    <!-- ================================= -->
    <!-- FOOTER -->
    <!-- ================================= -->

    <div
      style="
        padding: 18px;
        text-align: center;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
      "
    >

      <p
        style="
          margin: 0;
          color: #94a3b8;
          font-size: 10px;
        "
      >
        Secure • Transparent • Verifiable
      </p>

    </div>

  </div>

</body>

</html>
              `,
            }),
          }
        );

      // ----------------------------------------
      // Read Resend response
      // ----------------------------------------

      const data =
        await response.json();

      // ----------------------------------------
      // Resend error
      // ----------------------------------------

      if (!response.ok) {

        console.error(
          "Resend credential email error:",
          data
        );

        return res.status(500).json({
          success: false,

          message:
            "Failed to send credential email.",

          details:
            data,
        });
      }

      // ----------------------------------------
      // Email successfully sent
      // ----------------------------------------

      console.log(
        `Credential email sent to ${studentEmail}`
      );

      console.log(
        "Credential email completed successfully."
      );

      // ----------------------------------------
      // Response
      // ----------------------------------------

      res.json({
        success: true,

        message:
          "Credential email sent successfully.",

        qrImageUrl,
      });

    } catch (error) {

      console.error(
        "Send credential email error:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          "Server error while sending credential email.",

        error:
          error.message,
      });
    }
  }
);

// ========================================
// START SERVER
// ========================================

const PORT =
  process.env.PORT || 5050;

app.listen(
  PORT,
  () => {

    console.log(
      `IPFS server running on http://localhost:${PORT}`
    );

  }
);