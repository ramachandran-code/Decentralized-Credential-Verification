import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ethers } from "ethers";
import { uploadToIPFS } from "./utils/ipfs";
import {
  getContract,
  getReadOnlyContract,
  CONTRACT_ADDRESS,
} from "./utils/contract";
import "./App.css";

const ADMIN_ADDRESS =
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

const EXPECTED_CHAIN_ID = "31337";

function App() {
  // ==================================================
  // WALLET STATE
  // ==================================================

  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState("");
  const [balance, setBalance] = useState("");
  const [role, setRole] = useState("");
  const [activePage, setActivePage] = useState("");
  const [isQRVerification, setIsQRVerification] =
    useState(false);

  // ==================================================
  // ADMIN STATE
  // ==================================================

  const [universityAddress, setUniversityAddress] =
    useState("");
  const [authorizationStatus, setAuthorizationStatus] =
    useState("");

  // ==================================================
  // UNIVERSITY / CREDENTIAL STATE
  // ==================================================

  const [credentialId, setCredentialId] =
    useState("");

  const [studentName, setStudentName] =
    useState("");

  const [rollNumber, setRollNumber] =
    useState("");

  // Student Email
  const [studentEmail, setStudentEmail] =
    useState("");

  // OTP state
  const [otp, setOtp] =
    useState("");

  const [emailVerified, setEmailVerified] =
    useState(false);

  const [verifiedEmail, setVerifiedEmail] =
    useState("");

  const [sendingOTP, setSendingOTP] =
    useState(false);

  const [verifyingOTP, setVerifyingOTP] =
    useState(false);

  const [certificateHash, setCertificateHash] =
    useState("");

  const [ipfsCid, setIpfsCid] =
    useState("");

  const [ipfsUrl, setIpfsUrl] =
    useState("");

  const [selectedCertificate, setSelectedCertificate] =
    useState(null);

  const [uploadingToIPFS, setUploadingToIPFS] =
    useState(false);

  const [verificationUrl, setVerificationUrl] =
    useState("");

  const [showQRCode, setShowQRCode] =
    useState(false);

  // ==================================================
  // VERIFIER STATE
  // ==================================================

  const [verifyCredentialId, setVerifyCredentialId] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [calculatedHash, setCalculatedHash] =
    useState("");

  const [verificationResult, setVerificationResult] =
    useState(null);

  const [verifiedCredential, setVerifiedCredential] =
    useState(null);

  // ==================================================
  // GENERAL STATE
  // ==================================================

  const [status, setStatus] =
    useState("");

  const [error, setError] =
    useState("");

  // ==================================================
  // HELPERS
  // ==================================================

  function normalizeHash(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/^0x/, "");
  }

  function buildVerificationUrl(id) {
    const baseUrl =
      import.meta.env.VITE_PUBLIC_APP_URL ||
      window.location.origin;

    return `${baseUrl}/verify/${encodeURIComponent(
      String(id).trim()
    )}`;
  }

  function formatIssueDate(timestamp) {
    try {
      return new Date(
        Number(timestamp) * 1000
      ).toLocaleString();
    } catch {
      return "Unknown";
    }
  }

  function makeCredentialData(credential) {
    return {
      credentialId: credential.credentialId,
      studentName: credential.studentName,
      rollNumber: credential.rollNumber,

      // New field from smart contract
      studentEmailHash:
        credential.studentEmailHash,

      certificateHash:
        credential.certificateHash,

      ipfsCid:
        credential.ipfsCid,

      university:
        credential.university,

      issueDate:
        formatIssueDate(
          credential.issueDate
        ),

      revoked:
        Boolean(credential.revoked),

      exists:
        Boolean(credential.exists),
    };
  }

  // ==================================================
  // LOAD WALLET
  // ==================================================

  async function loadWallet(address) {
    try {
      setError("");
      setStatus("");

      if (!window.ethereum) {
        setError(
          "MetaMask is not installed."
        );
        return;
      }

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const network =
        await provider.getNetwork();

      const walletBalance =
        await provider.getBalance(address);

      const currentChainId =
        network.chainId.toString();

      setAccount(address);
      setChainId(currentChainId);
      setBalance(
        ethers.formatEther(walletBalance)
      );

      if (
        currentChainId !==
        EXPECTED_CHAIN_ID
      ) {
        setRole("");

        setError(
          `Wrong network. Please switch to Hardhat Local (Chain ID ${EXPECTED_CHAIN_ID}).`
        );

        return;
      }

      await detectRole(address);
    } catch (err) {
      console.error(
        "Wallet loading error:",
        err
      );

      setError(
        "Unable to load wallet information."
      );
    }
  }

  // ==================================================
  // DETECT USER ROLE
  // ==================================================

  async function detectRole(address) {
    try {
      if (
        address.toLowerCase() ===
        ADMIN_ADDRESS.toLowerCase()
      ) {
        setRole("ADMIN");
        setActivePage("ADMIN");
        return;
      }

      const contract =
        await getReadOnlyContract();

      const authorized =
        await contract.authorizedUniversities(
          address
        );

      if (authorized) {
        setRole("UNIVERSITY");
        setActivePage("UNIVERSITY");
      } else {
        setRole("VERIFIER");
        setActivePage("VERIFIER");
      }
    } catch (err) {
      console.error(
        "Role detection error:",
        err
      );

      setRole("VERIFIER");
      setActivePage("VERIFIER");
    }
  }

  // ==================================================
  // CONNECT METAMASK
  // ==================================================

  async function connectWallet() {
    try {
      setError("");
      setStatus("");

      if (!window.ethereum) {
        setError(
          "MetaMask is not installed. Please install MetaMask."
        );
        return;
      }

      const accounts =
        await window.ethereum.request({
          method: "eth_requestAccounts",
        });

      if (
        !accounts ||
        accounts.length === 0
      ) {
        setError(
          "No MetaMask account selected."
        );
        return;
      }

      await loadWallet(accounts[0]);
    } catch (err) {
      console.error(
        "Connect wallet error:",
        err
      );

      if (
        err?.code === 4001 ||
        err?.code ===
          "ACTION_REJECTED"
      ) {
        setError(
          "Connection request was rejected in MetaMask."
        );
      } else {
        setError(
          err?.message ||
            "Failed to connect MetaMask."
        );
      }
    }
  }

  // ==================================================
  // DISCONNECT
  // ==================================================

  function disconnectWallet() {
    setAccount("");
    setChainId("");
    setBalance("");
    setRole("");
    setActivePage("");

    setUniversityAddress("");
    setAuthorizationStatus("");

    setCredentialId("");
    setStudentName("");
    setRollNumber("");

    // Email / OTP reset
    setStudentEmail("");
    setOtp("");
    setEmailVerified(false);
    setVerifiedEmail("");
    setSendingOTP(false);
    setVerifyingOTP(false);

    setCertificateHash("");
    setIpfsCid("");
    setIpfsUrl("");
    setSelectedCertificate(null);
    setUploadingToIPFS(false);
    setVerificationUrl("");
    setShowQRCode(false);

    setVerifyCredentialId("");
    setSelectedFile(null);
    setCalculatedHash("");
    setVerificationResult(null);
    setVerifiedCredential(null);

    setStatus("");
    setError("");
  }

  // ==================================================
  // AUTHORIZE UNIVERSITY
  // ==================================================

  async function authorizeUniversity() {
    try {
      setError("");
      setStatus("");
      setAuthorizationStatus("");

      const rawAddress =
        universityAddress.trim();

      if (!rawAddress) {
        setError(
          "University wallet address is required."
        );
        return;
      }

      if (!ethers.isAddress(rawAddress)) {
        setError(
          "Invalid university wallet address. Please enter the complete 42-character Ethereum address."
        );
        return;
      }

      const university =
        ethers.getAddress(
          rawAddress
        );

      if (
        !account ||
        account.toLowerCase() !==
          ADMIN_ADDRESS.toLowerCase()
      ) {
        setError(
          "Only the Admin account can authorize universities."
        );
        return;
      }

      const contract =
        await getContract();

      const alreadyAuthorized =
        await contract.authorizedUniversities(
          university
        );

      if (alreadyAuthorized) {
        setAuthorizationStatus(
          "✅ University is already authorized."
        );
        return;
      }

      setStatus(
        "Waiting for MetaMask confirmation..."
      );

      const transaction =
        await contract.authorizeUniversity(
          university
        );

      setStatus(
        "Authorization transaction submitted. Waiting for confirmation..."
      );

      await transaction.wait();

      const confirmed =
        await contract.authorizedUniversities(
          university
        );

      if (confirmed) {
        setStatus(
          "University authorized successfully!"
        );

        setAuthorizationStatus(
          "✅ University is authorized"
        );
      } else {
        setError(
          "Transaction completed, but university authorization could not be confirmed."
        );

        setStatus("");
      }
    } catch (err) {
      console.error(
        "Authorization error:",
        err
      );

      setStatus("");

      if (
        err?.code === 4001 ||
        err?.code ===
          "ACTION_REJECTED"
      ) {
        setError(
          "Transaction rejected in MetaMask."
        );
      } else if (
        err?.code ===
        "INVALID_ARGUMENT"
      ) {
        setError(
          "Invalid Ethereum address. Enter the complete 42-character wallet address."
        );
      } else {
        setError(
          err?.reason ||
            err?.shortMessage ||
            err?.message ||
            "University authorization failed."
        );
      }
    }
  }

  // ==================================================
  // CHECK UNIVERSITY AUTHORIZATION
  // ==================================================

  async function checkUniversityAuthorization() {
    try {
      setError("");
      setStatus("");

      if (
        !universityAddress.trim()
      ) {
        setError(
          "Enter a university wallet address first."
        );
        return;
      }

      if (
        !ethers.isAddress(
          universityAddress.trim()
        )
      ) {
        setError(
          "Invalid university wallet address."
        );
        return;
      }

      const contract =
        await getReadOnlyContract();

      const authorized =
        await contract.authorizedUniversities(
          universityAddress.trim()
        );

      if (authorized) {
        setAuthorizationStatus(
          "✅ University is authorized"
        );
      } else {
        setAuthorizationStatus(
          "❌ University is NOT authorized"
        );
      }
    } catch (err) {
      console.error(
        "Authorization check error:",
        err
      );

      setError(
        err?.reason ||
          err?.shortMessage ||
          err?.message ||
          "Unable to check authorization."
      );
    }
  }

  // ==================================================
  // CALCULATE SHA-256 HASH
  // ==================================================

  async function calculateFileHash(file) {
    if (
    !file ||
    typeof file.arrayBuffer !== "function"
  ) {
    throw new Error(
      "Invalid certificate file."
    );
  }

  const buffer =
    await file.arrayBuffer();

  // ethers.sha256 works on HTTP LAN URLs too.
  const hash =
    ethers.sha256(
      new Uint8Array(buffer)
    );

  return normalizeHash(hash);
  }

  // ==================================================
  // AUTOMATIC CERTIFICATE HASH
  //
  // Calculates SHA-256 immediately when
  // university selects a PDF.
  // ==================================================

  async function handleCertificateSelection(
    file
  ) {
    setSelectedCertificate(file);
    setCertificateHash("");
    setError("");
    setStatus("");

    if (!file) {
      return;
    }

    if (
      file.type !==
      "application/pdf"
    ) {
      setError(
        "Please select a PDF certificate."
      );
      return;
    }

    try {
      setStatus(
        "Calculating certificate SHA-256 hash..."
      );

      const hash =
        normalizeHash(
          await calculateFileHash(
            file
          )
        );

      if (
        !/^[a-f0-9]{64}$/.test(
          hash
        )
      ) {
        throw new Error(
          "Unable to calculate a valid SHA-256 hash."
        );
      }

      setCertificateHash(
        hash
      );

      setStatus(
        "Certificate hash generated automatically."
      );
    } catch (err) {
      console.error(
        "Automatic certificate hash error:",
        err
      );

      setCertificateHash("");

      setError(
        err?.message ||
          "Unable to calculate the certificate SHA-256 hash."
      );

      setStatus("");
    }
  }

  // ==================================================
  // SEND EMAIL OTP
  // ==================================================

  async function sendEmailOTP() {
    try {
      setError("");
      setStatus("");

      const email =
        studentEmail
          .trim()
          .toLowerCase();

      if (!email) {
        setError(
          "Student email is required."
        );
        return;
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(email)
      ) {
        setError(
          "Please enter a valid student email address."
        );
        return;
      }

      setSendingOTP(true);

      setEmailVerified(false);
      setVerifiedEmail("");
      setOtp("");

      setStatus(
        "Sending OTP to student email..."
      );

      const response =
        await fetch(
          "http://localhost:5050/send-otp",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data?.message ||
            "Failed to send OTP."
        );
      }

      setStatus(
        "OTP sent successfully. Please check the student's email."
      );
    } catch (err) {
      console.error(
        "Send OTP error:",
        err
      );

      setError(
        err?.message ||
          "Unable to send OTP."
      );

      setStatus("");
    } finally {
      setSendingOTP(false);
    }
  }

  // ==================================================
  // VERIFY EMAIL OTP
  // ==================================================

  async function verifyEmailOTP() {
    try {
      setError("");
      setStatus("");

      const email =
        studentEmail
          .trim()
          .toLowerCase();

      const enteredOTP =
        otp.trim();

      if (!email) {
        setError(
          "Student email is required."
        );
        return;
      }

      if (!enteredOTP) {
        setError(
          "Please enter the OTP."
        );
        return;
      }

      if (
        !/^\d{6}$/.test(
          enteredOTP
        )
      ) {
        setError(
          "OTP must contain exactly 6 digits."
        );
        return;
      }

      setVerifyingOTP(true);

      setStatus(
        "Verifying OTP..."
      );

      const response =
        await fetch(
          "http://localhost:5050/verify-otp",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email,
              otp: enteredOTP,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        setEmailVerified(false);
        setVerifiedEmail("");

        setStatus("");

        setError(
          data?.message ||
          "OTP verification failed."
        );

        return;
      }

      setEmailVerified(true);
      setVerifiedEmail(email);

      setStatus(
        "✅ Student email verified successfully."
      );

      setError("");
    } catch (err) {
      console.error(
        "OTP verification error:",
        err
      );

      setEmailVerified(false);
      setVerifiedEmail("");

      setError(
        err?.message ||
          "Unable to verify OTP. Please check that the server is running."
      );

      setStatus("");
    } finally {
      setVerifyingOTP(false);
    }
  }

  // ==================================================
  // CREATE STUDENT EMAIL HASH
  // ==================================================

  async function calculateEmailHash(
    email
  ) {
    const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();

  const emailHash =
    ethers.sha256(
      ethers.toUtf8Bytes(
        normalizedEmail
      )
    );

  return normalizeHash(emailHash);
  }

  // ==================================================
  // ISSUE CREDENTIAL
  // ==================================================

  async function issueCredential() {
    try {
      setError("");
      setStatus("");
      setShowQRCode(false);

      // ------------------------------------------
      // Validate Credential ID
      // ------------------------------------------

      if (!credentialId.trim()) {
        setError(
          "Credential ID is required."
        );
        return;
      }

      // ------------------------------------------
      // Validate Student Name
      // ------------------------------------------

      if (!studentName.trim()) {
        setError(
          "Student name is required."
        );
        return;
      }

      // ------------------------------------------
      // Validate Roll Number
      // ------------------------------------------

      if (!rollNumber.trim()) {
        setError(
          "Roll number is required."
        );
        return;
      }

      // ------------------------------------------
      // Validate Student Email
      // ------------------------------------------

      if (!studentEmail.trim()) {
        setError(
          "Student email is required."
        );
        return;
      }

      // ------------------------------------------
      // Email must be OTP verified
      // ------------------------------------------

      if (!emailVerified) {
        setError(
          "Please verify the student email using OTP before issuing the credential."
        );
        return;
      }

      // ------------------------------------------
      // Make sure the verified email is
      // the same as the current email
      // ------------------------------------------

      if (
        verifiedEmail.toLowerCase() !==
        studentEmail
          .trim()
          .toLowerCase()
      ) {
        setError(
          "The verified email does not match the current student email."
        );
        return;
      }

      // ------------------------------------------
      // Validate certificate
      // ------------------------------------------

      if (!selectedCertificate) {
        setError(
          "Please select a certificate PDF."
        );
        return;
      }

      if (!certificateHash) {
        setError(
          "Please wait for the automatic SHA-256 hash to finish generating."
        );
        return;
      }

      if (
        selectedCertificate.type !==
        "application/pdf"
      ) {
        setError(
          "Please select a PDF certificate."
        );
        return;
      }

      // ------------------------------------------
      // Recalculate certificate hash
      // ------------------------------------------

      setStatus(
        "Calculating certificate SHA-256 hash..."
      );

      const calculatedCertificateHash =
        await calculateFileHash(
          selectedCertificate
        );

      const cleanHash =
        normalizeHash(
          calculatedCertificateHash
        );

      if (
        !/^[a-f0-9]{64}$/.test(
          cleanHash
        )
      ) {
        setError(
          "Unable to calculate a valid SHA-256 hash."
        );

        setStatus("");
        return;
      }

      setCertificateHash(
        cleanHash
      );

      console.log(
        "Certificate SHA-256:",
        cleanHash
      );

      // ------------------------------------------
      // Create SHA-256 hash of verified email
      // ------------------------------------------

      const studentEmailHash =
        await calculateEmailHash(
          studentEmail
        );

      console.log(
        "Student Email SHA-256:",
        studentEmailHash
      );

      // ------------------------------------------
      // Upload PDF to IPFS
      // ------------------------------------------

      setUploadingToIPFS(true);

      setStatus(
        "Uploading certificate to IPFS..."
      );

      const ipfsResult =
        await uploadToIPFS(
          selectedCertificate
        );

      setUploadingToIPFS(false);

      const cid =
        ipfsResult?.cid;

      const url =
        ipfsResult?.ipfsUrl ||
        "";

      if (!cid) {
        setError(
          "IPFS upload completed but no CID was returned."
        );

        setStatus("");
        return;
      }

      setIpfsCid(cid);
      setIpfsUrl(url);

      console.log(
        "IPFS CID:",
        cid
      );

      console.log(
        "IPFS URL:",
        url
      );

      // ------------------------------------------
      // Connect to blockchain
      // ------------------------------------------

      setStatus(
        "Connecting to blockchain..."
      );

      const contract =
        await getContract();

      const currentAccount =
        await contract.runner.getAddress();

      const authorized =
        await contract.authorizedUniversities(
          currentAccount
        );

      if (!authorized) {
        setError(
          "Connected wallet is not an authorized university."
        );

        setStatus("");
        return;
      }

      // ------------------------------------------
      // MetaMask confirmation
      // ------------------------------------------

      setStatus(
        "Waiting for MetaMask confirmation..."
      );

      const transaction =
        await contract.issueCredential(
          credentialId.trim(),
          studentName.trim(),
          rollNumber.trim(),
          studentEmailHash,
          cleanHash,
          cid
        );

      setStatus(
        "Transaction submitted. Waiting for blockchain confirmation..."
      );

      const receipt =
        await transaction.wait();

      console.log(
        "Credential transaction:",
        receipt
      );

      // ------------------------------------------
      // Generate QR verification URL
      // ------------------------------------------

      const generatedVerificationUrl =
        buildVerificationUrl(
          credentialId.trim()
        );

      setVerificationUrl(
        generatedVerificationUrl
      );

      setShowQRCode(true);

      console.log(
        "Verification URL:",
        generatedVerificationUrl
      );

      // ------------------------------------------
      // Send credential email to the student
      // ------------------------------------------
      // The blockchain transaction has already succeeded.
      // If email delivery fails, the credential remains issued.

      setStatus(
        "Credential issued on blockchain. Sending credential email..."
      );

      try {
        const credentialEmailResponse =
          await fetch(
            "http://localhost:5050/send-credential-email",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                studentEmail:
                  verifiedEmail ||
                  studentEmail.trim().toLowerCase(),

                studentName:
                  studentName.trim(),

                credentialId:
                  credentialId.trim(),

                verificationUrl:
                  generatedVerificationUrl,

                ipfsUrl:
                  url ||
                  `https://gateway.pinata.cloud/ipfs/${encodeURIComponent(
                    cid
                  )}`,
              }),
            }
          );

        const emailData =
          await credentialEmailResponse.json();

        if (
          !credentialEmailResponse.ok ||
          !emailData.success
        ) {
          throw new Error(
            emailData?.message ||
              "Credential email could not be sent."
          );
        }

        setStatus(
          `✅ Credential issued successfully and email sent to ${
            verifiedEmail ||
            studentEmail.trim().toLowerCase()
          }. Transaction: ${receipt.hash}`
        );
      } catch (emailError) {
        console.error(
          "Credential email error:",
          emailError
        );

        setStatus(
          `✅ Credential issued successfully. Transaction: ${receipt.hash}`
        );

        setError(
          `Credential was successfully issued, but the email could not be sent. ${
            emailError?.message ||
            "Please try sending the credential email again."
          }`
        );
      }

      // ------------------------------------------
      // Clear form after successful issuance
      // ------------------------------------------

      setCredentialId("");
      setStudentName("");
      setRollNumber("");

      setStudentEmail("");
      setOtp("");
      setEmailVerified(false);
      setVerifiedEmail("");

      setCertificateHash("");
      setIpfsCid("");
      setIpfsUrl("");
      setSelectedCertificate(null);

    } catch (err) {
      console.error(
        "Credential issuance error:",
        err
      );

      setUploadingToIPFS(false);
      setStatus("");

      if (
        err?.code === 4001 ||
        err?.code ===
          "ACTION_REJECTED"
      ) {
        setError(
          "Transaction rejected in MetaMask."
        );
      } else if (
        err?.reason ===
        "Credential already exists"
      ) {
        setError(
          "Credential already exists on the blockchain."
        );
      } else {
        setError(
          err?.reason ||
            err?.shortMessage ||
            err?.message ||
            "Credential issuance failed."
        );
      }
    }
  }

  // ==================================================
  // VERIFY FROM QR CODE
  //
  // No MetaMask required.
  // ==================================================

  async function verifyFromQRCode() {
    const id =
      verifyCredentialId.trim();

    if (!id) {
      return;
    }

    try {
      setError("");

      setStatus(
        "Reading credential from blockchain..."
      );

      setVerificationResult(
        null
      );

      setVerifiedCredential(
        null
      );

      setCalculatedHash("");

      const contract =
        await getReadOnlyContract();

      const credential =
        await contract.getCredential(
          id
        );

      const credentialData =
        makeCredentialData(
          credential
        );

      setVerifiedCredential(
        credentialData
      );

      if (
        !credentialData.exists
      ) {
        setVerificationResult(
          "INVALID"
        );

        setError(
          "Credential does not exist on the blockchain."
        );

        setStatus("");

        return;
      }

      if (
        credentialData.revoked
      ) {
        setVerificationResult(
          "REVOKED"
        );

        setStatus("");

        return;
      }

      const storedHash =
        normalizeHash(
          credentialData.certificateHash
        );

      if (
        !/^[a-f0-9]{64}$/.test(
          storedHash
        )
      ) {
        setVerificationResult(
          "INVALID"
        );

        setError(
          "The blockchain contains an invalid certificate hash."
        );

        setStatus("");

        return;
      }

      const cid =
        String(
          credentialData.ipfsCid ||
            ""
        ).trim();

      if (!cid) {
        setVerificationResult(
          "INVALID"
        );

        setError(
          "Certificate file is not available on IPFS."
        );

        setStatus("");

        return;
      }

      setStatus(
        "Retrieving the original certificate from IPFS..."
      );

      const ipfsUrl =
        `https://gateway.pinata.cloud/ipfs/${encodeURIComponent(
          cid
        )}`;

      const response =
        await fetch(
          ipfsUrl
        );

      if (!response.ok) {
        throw new Error(
          `Unable to retrieve the certificate from IPFS. HTTP ${response.status}.`
        );
      }

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      if (
        contentType &&
        !contentType
          .toLowerCase()
          .includes("pdf") &&
        !contentType
          .toLowerCase()
          .includes(
            "octet-stream"
          )
      ) {
        console.warn(
          "IPFS response content type:",
          contentType
        );
      }

      const certificateBlob =
        await response.blob();

      setStatus(
        "Calculating SHA-256 hash of the IPFS certificate..."
      );

      const downloadedHash =
        normalizeHash(
          await calculateFileHash(
            certificateBlob
          )
        );

      setCalculatedHash(
        downloadedHash
      );

      console.log(
        "Blockchain certificate hash:",
        storedHash
      );

      console.log(
        "IPFS certificate hash:",
        downloadedHash
      );

      setStatus(
        "Comparing certificate hash with blockchain..."
      );

      const valid =
        await contract.verifyCredential(
          id,
          downloadedHash
        );

      const hashesMatch =
        storedHash ===
        downloadedHash;

      if (
        valid &&
        hashesMatch
      ) {
        setVerificationResult(
          "VALID"
        );

        setError("");

        setStatus(
          "Certificate verified successfully."
        );
      } else {
        setVerificationResult(
          "INVALID"
        );

        setError(
          "Certificate hash does not match the hash stored on the blockchain."
        );

        setStatus("");
      }
    } catch (err) {
      console.error(
        "QR verification error:",
        err
      );

      setVerificationResult(
        "INVALID"
      );

      setStatus("");

      const message =
        err?.reason ||
        err?.shortMessage ||
        err?.message ||
        "";

      if (
        message
          .toLowerCase()
          .includes(
            "credential not found"
          )
      ) {
        setError(
          "Credential not found on the blockchain."
        );
      } else if (
        message
          .toLowerCase()
          .includes("ipfs")
      ) {
        setError(message);
      } else {
        setError(
          message ||
            "Unable to verify the certificate."
        );
      }
    }
  }

  // ==================================================
  // VERIFY MANUALLY UPLOADED CERTIFICATE
  // ==================================================

  async function verifyUploadedCertificate() {
    try {
      setError("");
      setStatus("");

      setVerificationResult(
        null
      );

      setVerifiedCredential(
        null
      );

      setCalculatedHash("");

      const id =
        verifyCredentialId.trim();

      if (!id) {
        setError(
          "Credential ID is required."
        );
        return;
      }

      if (!selectedFile) {
        setError(
          "Please upload a certificate PDF."
        );
        return;
      }

      if (
        selectedFile.type !==
        "application/pdf"
      ) {
        setError(
          "Please upload a PDF certificate."
        );
        return;
      }

      setStatus(
        "Calculating certificate SHA-256 hash..."
      );

      const uploadedHash =
        normalizeHash(
          await calculateFileHash(
            selectedFile
          )
        );

      setCalculatedHash(
        uploadedHash
      );

      setStatus(
        "Checking certificate against blockchain..."
      );

      const contract =
        await getReadOnlyContract();

      const credential =
        await contract.getCredential(
          id
        );

      const credentialData =
        makeCredentialData(
          credential
        );

      setVerifiedCredential(
        credentialData
      );

      if (
        !credentialData.exists
      ) {
        setVerificationResult(
          "INVALID"
        );

        setError(
          "Credential does not exist on the blockchain."
        );

        setStatus("");

        return;
      }

      if (
        credentialData.revoked
      ) {
        setVerificationResult(
          "REVOKED"
        );

        setStatus("");

        return;
      }

      const storedHash =
        normalizeHash(
          credentialData.certificateHash
        );

      const valid =
        await contract.verifyCredential(
          id,
          uploadedHash
        );

      if (
        valid &&
        storedHash ===
          uploadedHash
      ) {
        setVerificationResult(
          "VALID"
        );

        setError("");

        setStatus(
          "Certificate verified successfully."
        );

        const url =
          buildVerificationUrl(
            id
          );

        setVerificationUrl(
          url
        );

        setShowQRCode(
          true
        );
      } else {
        setVerificationResult(
          "INVALID"
        );

        setError(
          "Certificate hash does not match the hash stored on the blockchain."
        );

        setStatus("");
      }
    } catch (err) {
      console.error(
        "Manual verification error:",
        err
      );

      setStatus("");

      const message =
        err?.reason ||
        err?.shortMessage ||
        err?.message ||
        "";

      if (
        message
          .toLowerCase()
          .includes(
            "credential not found"
          )
      ) {
        setError(
          "Credential not found on blockchain."
        );
      } else {
        setError(
          message ||
            "Certificate verification failed."
        );
      }

      setVerificationResult(
        "INVALID"
      );
    }
  }

  // ==================================================
  // QR VERIFICATION URL
  // ==================================================

  useEffect(() => {
    const path =
      window.location.pathname;

    if (
      !path.startsWith(
        "/verify/"
      )
    ) {
      return;
    }

    const credentialIdFromUrl =
      decodeURIComponent(
        path.replace(
          "/verify/",
          ""
        )
      ).trim();

    if (
      credentialIdFromUrl
    ) {
      setVerifyCredentialId(
        credentialIdFromUrl
      );

      setIsQRVerification(
        true
      );

      setRole(
        "VERIFIER"
      );
    }
  }, []);

  // ==================================================
  // AUTOMATIC QR VERIFICATION
  // ==================================================

  useEffect(() => {
    if (
      isQRVerification &&
      verifyCredentialId.trim()
    ) {
      verifyFromQRCode();
    }
  }, [
    isQRVerification,
    verifyCredentialId,
  ]);

  // ==================================================
  // METAMASK EVENTS
  // ==================================================

  useEffect(() => {
    if (!window.ethereum) {
      return undefined;
    }

    function handleAccountsChanged(
      accounts
    ) {
      // QR verification remains public
      if (
        window.location.pathname.startsWith(
          "/verify/"
        )
      ) {
        return;
      }

      if (
        !accounts ||
        accounts.length === 0
      ) {
        disconnectWallet();
      } else {
        loadWallet(
          accounts[0]
        );
      }
    }

    function handleChainChanged() {
      window.location.reload();
    }

    window.ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );

    window.ethereum.on(
      "chainChanged",
      handleChainChanged
    );

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );

      window.ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };
  }, []);

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="app">
      <div className="card">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="app-header">

          {/* BRAND */}
          <div className="brand">
            <div className="brand-logo">
              🎓
            </div>

            <div className="brand-text">
              <div className="brand-title">
                Decentralized Credential Verification
              </div>

              <div className="brand-subtitle">
                Secure. Transparent. Verifiable.
              </div>
            </div>
          </div>

          {/* NAVIGATION */}
          {!isQRVerification && (
            <nav className="main-nav">

              <button
                type="button"
                className={`nav-button ${
                  activePage === "UNIVERSITY"
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  if (role === "UNIVERSITY") {
                    setActivePage("UNIVERSITY");
                    setError("");
                    setStatus("");
                  }
                }}
                disabled={role !== "UNIVERSITY"}
              >
                <span className="nav-icon">🏫</span>
                <span>University</span>
              </button>


              <button
                type="button"
                className={`nav-button ${
                  activePage === "ADMIN"
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  if (role === "ADMIN") {
                    setActivePage("ADMIN");
                    setError("");
                    setStatus("");
                  }
                }}
                disabled={role !== "ADMIN"}
              >
                <span className="nav-icon">🛡️</span>
                <span>Admin</span>
              </button>


              <button
                type="button"
                className={`nav-button ${
                  activePage === "VERIFIER"
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setActivePage("VERIFIER");
                  setError("");
                  setStatus("");
                }}
              >
                <span className="nav-icon">🔎</span>
                <span>Verifier</span>
              </button>

            </nav>
          )}

          {/* HEADER RIGHT */}
          <div className="header-right">

            {account && !isQRVerification && (
              <div className="wallet-pill">

                <span className="wallet-icon">
                  🦊
                </span>

                <span className="wallet-address">
                  {account.slice(0, 6)}...
                  {account.slice(-4)}
                </span>

                <span className="wallet-network">
                  <span className="network-dot"></span>
                  Hardhat Local
                </span>

                <span className="wallet-balance">
                  {balance
                    ? Number(balance).toFixed(2)
                    : "0.00"}{" "}
                  ETH
                </span>

              </div>
            )}

            {account && !isQRVerification && (
              <button
                className="header-disconnect"
                onClick={disconnectWallet}
              >
                ⎋ Disconnect
              </button>
            )}

          </div>

        </header>


        {/* =================================================
            PAGE CONTENT
        ================================================= */}

        <main className="page-content">

          {/* =================================================
              LANDING PAGE
          ================================================= */}

          {!account && !isQRVerification && (

            <div className="landing-card">

              <div className="landing-logo">
                🎓
              </div>

              <h1>
                Decentralized Credential Verification
              </h1>

              <p className="subtitle">
                Secure blockchain-based academic credential
                verification
              </p>

              <div className="feature-grid">

                <div className="feature-card">
                  <div className="feature-icon">
                    🛡️
                  </div>

                  <h3>
                    Tamper-Proof
                  </h3>

                  <p>
                    Certificates are securely stored using
                    blockchain and IPFS.
                  </p>
                </div>


                <div className="feature-card">
                  <div className="feature-icon">
                    🌐
                  </div>

                  <h3>
                    Instant Verification
                  </h3>

                  <p>
                    Verify credentials using QR codes and
                    certificate files.
                  </p>
                </div>


                <div className="feature-card">
                  <div className="feature-icon">
                    🔐
                  </div>

                  <h3>
                    Trusted & Transparent
                  </h3>

                  <p>
                    Eliminate fake certificates with
                    blockchain verification.
                  </p>
                </div>

              </div>


              <button
                className="connect-button"
                onClick={connectWallet}
              >
                🦊 Connect MetaMask
              </button>

              <p className="landing-footer">
                Built for a more trustworthy academic future.
              </p>

            </div>

          )}


          {/* =================================================
              CONNECTED APPLICATION
          ================================================= */}

          {account && !isQRVerification && (

            <>

              {/* =================================================
                  ADMIN DASHBOARD
              ================================================= */}

              {activePage === "ADMIN" && (

                <div className="dashboard-layout">

                  {/* MAIN */}
                  <section className="main-panel">

                    <div className="panel-header">

                      <div className="panel-heading">

                        <div className="panel-icon">
                          🛡️
                        </div>

                        <div>
                          <h1 className="panel-title">
                            Admin Dashboard
                          </h1>

                          <p className="panel-description">
                            Manage authorized universities and
                            blockchain access.
                          </p>
                        </div>

                      </div>

                      <div className="authorized-badge">
                        🛡️ Admin Account
                        <span>
                          Contract administrator
                        </span>
                      </div>

                    </div>


                    <div className="form-card">

                      <div className="form-title">
                        🏫 Authorize University
                      </div>

                      <div className="form-grid">

                        <div className="form-field full">

                          <label className="form-label">
                            University Wallet Address
                          </label>

                          <input
                            className="form-input"
                            type="text"
                            placeholder="Enter complete Ethereum wallet address"
                            value={universityAddress}
                            onChange={(e) =>
                              setUniversityAddress(
                                e.target.value
                              )
                            }
                          />

                          <span className="form-helper">
                            Enter the university's MetaMask
                            wallet address.
                          </span>

                        </div>

                      </div>


                      <div className="admin-actions">

                        <button
                          className="issue-button"
                          onClick={authorizeUniversity}
                        >
                          🏫 Authorize University
                        </button>

                        <button
                          className="secondary-button"
                          onClick={
                            checkUniversityAuthorization
                          }
                        >
                          🔍 Check Authorization
                        </button>

                      </div>


                      {authorizationStatus && (
                        <div className="credential-success">
                          <div className="success-icon">
                            ✓
                          </div>

                          <div>
                            <div className="success-title">
                              Authorization Status
                            </div>

                            <div className="success-description">
                              {authorizationStatus}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                  </section>


                  {/* SIDEBAR */}
                  <aside className="sidebar">

                    <div className="sidebar-card">

                      <div className="sidebar-title">
                        🦊 Wallet Info
                      </div>

                      <div className="wallet-info-row">
                        <div className="wallet-info-label">
                          Status
                        </div>

                        <div className="wallet-info-value">
                          🟢 Connected
                        </div>
                      </div>

                      <div className="wallet-info-row">
                        <div className="wallet-info-label">
                          Wallet
                        </div>

                        <div className="wallet-info-value">
                          {account}
                        </div>
                      </div>

                      <div className="wallet-info-row">
                        <div className="wallet-info-label">
                          Network
                        </div>

                        <div className="wallet-info-value">
                          Hardhat Local
                        </div>
                      </div>

                      <div className="wallet-info-row">
                        <div className="wallet-info-label">
                          Chain ID
                        </div>

                        <div className="wallet-info-value">
                          {chainId}
                        </div>
                      </div>

                      <div className="wallet-info-row">
                        <div className="wallet-info-label">
                          Balance
                        </div>

                        <div className="wallet-info-value">
                          {balance
                            ? Number(balance).toFixed(2)
                            : "0.00"}{" "}
                          ETH
                        </div>
                      </div>

                    </div>


                    <div className="account-card">

                      <div className="account-icon">
                        🛡️
                      </div>

                      <div className="account-title">
                        Administrator Account
                      </div>

                      <div className="account-subtitle">
                        Authorized to manage university
                        access.
                      </div>

                      <div className="account-badge">
                        ✓ Admin
                      </div>

                    </div>

                  </aside>

                </div>

              )}


              {/* =================================================
                  UNIVERSITY DASHBOARD
              ================================================= */}

              {activePage === "UNIVERSITY" && (

                <div className="dashboard-layout">

                  {/* =================================================
                      MAIN UNIVERSITY PANEL
                  ================================================= */}

                  <section className="main-panel">

                    <div className="panel-header">

                      <div className="panel-heading">

                        <div className="panel-icon">
                          🎓
                        </div>

                        <div>

                          <h1 className="panel-title">
                            University Dashboard
                          </h1>

                          <p className="panel-description">
                            Issue and manage academic
                            credentials for your students.
                          </p>

                        </div>

                      </div>


                      <div className="authorized-badge">
                        ✓ Authorized University
                        <span>
                          You can issue credentials
                        </span>
                      </div>

                    </div>


                    {/* =================================================
                        ISSUE FORM
                    ================================================= */}

                    <div className="form-card">

                      <div className="form-title">
                        📄 Issue Academic Credential
                      </div>

                      <p className="form-description">
                        Fill in the student details, verify
                        the email, upload the certificate and
                        issue the credential on blockchain.
                      </p>


                      <div className="form-grid">

                        {/* CREDENTIAL ID */}

                        <div className="form-field">

                          <label className="form-label">
                            Credential ID
                          </label>

                          <input
                            className="form-input"
                            type="text"
                            placeholder="Enter credential ID"
                            value={credentialId}
                            onChange={(e) =>
                              setCredentialId(
                                e.target.value
                              )
                            }
                          />

                          <span className="form-helper">
                            Unique identifier for this
                            credential.
                          </span>

                        </div>


                        {/* STUDENT NAME */}

                        <div className="form-field">

                          <label className="form-label">
                            Student Name
                          </label>

                          <input
                            className="form-input"
                            type="text"
                            placeholder="Enter student name"
                            value={studentName}
                            onChange={(e) =>
                              setStudentName(
                                e.target.value
                              )
                            }
                          />

                          <span className="form-helper">
                            Full name of the student.
                          </span>

                        </div>


                        {/* ROLL NUMBER */}

                        <div className="form-field">

                          <label className="form-label">
                            Roll Number
                          </label>

                          <input
                            className="form-input"
                            type="text"
                            placeholder="Enter roll number"
                            value={rollNumber}
                            onChange={(e) =>
                              setRollNumber(
                                e.target.value
                              )
                            }
                          />

                          <span className="form-helper">
                            University roll number.
                          </span>

                        </div>


                        {/* EMAIL */}

                        <div className="form-field full">

                          <div className="email-verification">

                            <div className="email-row">

                              <div className="email-main">

                                <label className="form-label">
                                  Student Email
                                </label>

                                <input
                                  className="form-input"
                                  type="email"
                                  placeholder="student@example.com"
                                  value={studentEmail}
                                  onChange={(e) => {

                                    setStudentEmail(
                                      e.target.value
                                    );

                                    setEmailVerified(
                                      false
                                    );

                                    setVerifiedEmail(
                                      ""
                                    );

                                    setOtp("");

                                  }}
                                  disabled={
                                    sendingOTP ||
                                    verifyingOTP
                                  }
                                />

                                <span className="form-helper">
                                  A 6-digit OTP will be
                                  sent to this email.
                                </span>

                              </div>


                              {emailVerified && (

                                <div className="email-status">
                                  ✓ Verified
                                </div>

                              )}

                            </div>


                            {/* OTP */}

                            <div className="otp-row">

                              <div>

                                <label className="form-label">
                                  Enter 6-digit OTP
                                </label>

                                <input
                                  className="form-input"
                                  type="text"
                                  inputMode="numeric"
                                  maxLength="6"
                                  placeholder="123456"
                                  value={otp}
                                  onChange={(e) =>
                                    setOtp(
                                      e.target.value.replace(
                                        /\D/g,
                                        ""
                                      )
                                    )
                                  }
                                  disabled={
                                    verifyingOTP ||
                                    emailVerified
                                  }
                                />

                              </div>


                              <button
                                type="button"
                                className="secondary-button"
                                onClick={sendEmailOTP}
                                disabled={
                                  sendingOTP ||
                                  !studentEmail.trim()
                                }
                              >
                                {sendingOTP
                                  ? "Sending..."
                                  : "✈ Send OTP"}
                              </button>


                              <button
                                type="button"
                                className="secondary-button"
                                onClick={verifyEmailOTP}
                                disabled={
                                  verifyingOTP ||
                                  otp.length !== 6 ||
                                  emailVerified
                                }
                              >
                                {verifyingOTP
                                  ? "Verifying..."
                                  : "✓ Verify OTP"}
                              </button>

                            </div>


                            {emailVerified && (

                              <div className="verified-email">
                                ✓ Student email verified:
                                <strong>
                                  {" "}
                                  {verifiedEmail}
                                </strong>
                              </div>

                            )}

                          </div>

                        </div>


                        {/* CERTIFICATE UPLOAD */}

                        <div className="form-field full">

                          <label className="form-label">
                            Upload Certificate (PDF)
                          </label>

                          <label className="upload-area">

                            <input
                              type="file"
                              accept="application/pdf"
                              hidden
                              onChange={(e) => {

                                const file =
                                  e.target.files?.[0] ||
                                  null;

                                handleCertificateSelection(
                                  file
                                );

                              }}
                            />

                            <div className="upload-content">

                              <div className="upload-icon">
                                📄
                              </div>

                              <div className="upload-title">
                                Drag and drop your
                                certificate here
                              </div>

                              <div className="upload-subtitle">
                                or click to browse
                                (PDF only)
                              </div>

                            </div>

                          </label>


                          {selectedCertificate && (

                            <div className="file-card">

                              <div className="file-info">

                                <div className="file-icon">
                                  📄
                                </div>

                                <div>

                                  <div className="file-name">
                                    {
                                      selectedCertificate.name
                                    }
                                  </div>

                                  <div className="file-size">
                                    {(
                                      selectedCertificate.size /
                                      1024 /
                                      1024
                                    ).toFixed(2)}{" "}
                                    MB
                                  </div>

                                </div>

                              </div>


                              <div className="file-success">
                                ✓
                              </div>

                            </div>

                          )}

                        </div>


                        {/* SHA HASH */}

                        <div className="form-field full">

                          <div className="hash-card">

                            <div className="hash-icon">
                              🔐
                            </div>

                            <div className="hash-content">

                              <div className="hash-title">
                                SHA-256 Hash
                                (Generated Automatically)
                              </div>

                              <div className="hash-value">
                                {certificateHash ||
                                  "Hash will be generated automatically after selecting the certificate."}
                              </div>

                            </div>

                          </div>

                        </div>

                      </div>


                      {/* ISSUE BUTTON */}

                      <button
                        className="issue-button"
                        onClick={issueCredential}
                        disabled={
                          uploadingToIPFS ||
                          !emailVerified ||
                          !certificateHash
                        }
                      >
                        {uploadingToIPFS
                          ? "⏳ Uploading Certificate..."
                          : "📄 Issue Credential →"}
                      </button>


                      {/* STATUS */}

                      {status && (
                        <div className="status-box">
                          {status}
                        </div>
                      )}


                      {/* ERROR */}

                      {error && (
                        <div className="error">
                          {error}
                        </div>
                      )}

                    </div>


                    {/* =================================================
                        QR AFTER ISSUE
                    ================================================= */}

                    {showQRCode &&
                      verificationUrl && (

                        <div className="credential-success">

                          <div className="success-icon">
                            ✓
                          </div>

                          <div>

                            <div className="success-title">
                              Credential Issued Successfully!
                            </div>

                            <div className="success-description">
                              The academic credential has
                              been recorded on the blockchain.
                            </div>

                          </div>

                        </div>

                      )}

                  </section>


                  {/* =================================================
                      UNIVERSITY SIDEBAR
                  ================================================= */}

                  <aside className="sidebar">

                    {/* WALLET */}

                    <div className="sidebar-card">

                      <div className="sidebar-title">
                        🦊 Wallet Info
                      </div>

                      <div className="wallet-info-row">

                        <div className="wallet-info-label">
                          Status
                        </div>

                        <div className="wallet-info-value">
                          🟢 Connected
                        </div>

                      </div>


                      <div className="wallet-info-row">

                        <div className="wallet-info-label">
                          Wallet
                        </div>

                        <div className="wallet-info-value">
                          {account}
                        </div>

                      </div>


                      <div className="wallet-info-row">

                        <div className="wallet-info-label">
                          Network
                        </div>

                        <div className="wallet-info-value">
                          Hardhat Local
                        </div>

                      </div>


                      <div className="wallet-info-row">

                        <div className="wallet-info-label">
                          Chain ID
                        </div>

                        <div className="wallet-info-value">
                          {chainId}
                        </div>

                      </div>


                      <div className="wallet-info-row">

                        <div className="wallet-info-label">
                          Balance
                        </div>

                        <div className="wallet-info-value">
                          {balance
                            ? Number(balance).toFixed(2)
                            : "0.00"}{" "}
                          ETH
                        </div>

                      </div>

                    </div>


                    {/* UNIVERSITY ACCOUNT */}

                    <div className="account-card">

                      <div className="account-icon">
                        🎓
                      </div>

                      <div className="account-title">
                        University Account
                      </div>

                      <div className="account-subtitle">
                        Authorized university account
                      </div>

                      <div className="account-badge">
                        ✓ Authorized
                      </div>

                    </div>


                    {/* HOW IT WORKS */}

                    <div className="how-it-works">

                      <div className="how-title">
                        💡 How it works?
                      </div>

                      <div className="how-step">
                        <span className="how-number">
                          1
                        </span>

                        <span>
                          Verify student email using OTP
                        </span>
                      </div>

                      <div className="how-step">
                        <span className="how-number">
                          2
                        </span>

                        <span>
                          Upload certificate PDF
                        </span>
                      </div>

                      <div className="how-step">
                        <span className="how-number">
                          3
                        </span>

                        <span>
                          Certificate hash is generated
                          automatically
                        </span>
                      </div>

                      <div className="how-step">
                        <span className="how-number">
                          4
                        </span>

                        <span>
                          File is stored on IPFS
                        </span>
                      </div>

                      <div className="how-step">
                        <span className="how-number">
                          5
                        </span>

                        <span>
                          Credential is stored on blockchain
                        </span>
                      </div>

                      <div className="how-step">
                        <span className="how-number">
                          6
                        </span>

                        <span>
                          Share QR code for verification
                        </span>
                      </div>

                    </div>


                    {/* QR CODE */}

                    {showQRCode &&
                      verificationUrl && (

                        <div className="sidebar-card qr-card">

                          <div className="sidebar-title">
                            📱 Certificate QR Code
                          </div>

                          <p className="form-helper">
                            Scan this QR code to verify
                            the issued credential.
                          </p>

                          <div className="qr-container">

                            <QRCodeSVG
                              value={
                                verificationUrl
                              }
                              size={220}
                              level="H"
                            />

                          </div>


                          <div className="qr-url">
                            {verificationUrl}
                          </div>

                          <button
                            type="button"
                            className="copy-qr-button"
                            onClick={async () => {
                              if (!verificationUrl) {
                                setError(
                                  "Verification URL is not available."
                                );
                                return;
                              }

                              try {
                                // Try modern Clipboard API first
                                if (
                                  navigator.clipboard &&
                                  window.isSecureContext
                                ) {
                                  await navigator.clipboard.writeText(
                                    verificationUrl
                                  );

                                  setStatus(
                                    "✓ Verification URL copied to clipboard."
                                  );

                                  setError("");

                                  return;
                                }

                                // Fallback for HTTP/LAN
                                const textArea =
                                  document.createElement("textarea");

                                textArea.value =
                                  verificationUrl;

                                textArea.style.position =
                                  "fixed";

                                textArea.style.left =
                                  "-9999px";

                                textArea.style.top =
                                  "0";

                                textArea.style.opacity =
                                  "0";

                                textArea.setAttribute(
                                  "readonly",
                                  ""
                                );

                                document.body.appendChild(
                                  textArea
                                );

                                textArea.focus();

                                textArea.select();

                                textArea.setSelectionRange(
                                  0,
                                  textArea.value.length
                                );

                                const successful =
                                  document.execCommand(
                                    "copy"
                                  );

                                document.body.removeChild(
                                  textArea
                                );

                                if (!successful) {
                                  throw new Error(
                                    "Fallback copy failed"
                                  );
                                }

                                setStatus(
                                  "✓ Verification URL copied to clipboard."
                                );

                                setError("");

                              } catch (err) {

                                console.error(
                                  "Copy URL error:",
                                  err
                                );

                                setStatus("");

                                setError(
                                  "Unable to copy the verification URL. Please copy it manually."
                                );
                              }
                            }}
                          >
                            📋 Copy Verification URL
                          </button>

                        </div>

                      )}

                  </aside>

                </div>

              )}


              {/* =================================================
                  VERIFIER DASHBOARD
              ================================================= */}

              {activePage === "VERIFIER" && (

                <div className="verifier-layout">

                  <section className="verifier-main">

                    <div className="main-panel">

                      <div className="panel-header">

                        <div className="panel-heading">

                          <div className="panel-icon">
                            🔎
                          </div>

                          <div>

                            <h1 className="panel-title">
                              Verifier Dashboard
                            </h1>

                            <p className="panel-description">
                              Verify the authenticity of an
                              academic certificate using
                              blockchain and IPFS.
                            </p>

                          </div>

                        </div>

                      </div>


                      {/* QR VERIFICATION */}

                      {isQRVerification ? (

                        <>

                          <div className="credential-id-card">

                            🔗 Credential ID:

                            <strong>
                              {" "}
                              {verifyCredentialId}
                            </strong>

                          </div>


                          {status && (
                            <div className="status-box">
                              {status}
                            </div>
                          )}


                          {error && (
                            <div className="error">
                              {error}
                            </div>
                          )}


                          {verificationResult ===
                            "VALID" && (

                            <div className="valid-card">

                              <div className="valid-icon">
                                ✓
                              </div>

                              <div>

                                <div className="valid-title">
                                  CERTIFICATE VALID
                                </div>

                                <div className="valid-description">
                                  The certificate is
                                  authentic and has not
                                  been tampered with.
                                </div>

                              </div>

                            </div>

                          )}


                          {verificationResult ===
                            "INVALID" && (

                            <div className="invalid-card">
                              ❌ CERTIFICATE INVALID
                            </div>

                          )}


                          {verificationResult ===
                            "REVOKED" && (

                            <div className="invalid-card">
                              ⚠️ CERTIFICATE REVOKED
                            </div>

                          )}


                          {calculatedHash && (

                            <div className="hash-card">

                              <div className="hash-icon">
                                🔐
                              </div>

                              <div className="hash-content">

                                <div className="hash-title">
                                  Calculated SHA-256
                                  from IPFS
                                </div>

                                <div className="hash-value">
                                  {calculatedHash}
                                </div>

                              </div>

                            </div>

                          )}


                          {/* CREDENTIAL INFORMATION */}

                          {verifiedCredential && (

                            <div className="credential-details">

                              <div className="form-title">
                                🔗 Credential Information
                              </div>

                              <div className="credential-grid">

                                <div>
                                  <span>
                                    Credential ID
                                  </span>

                                  <strong>
                                    {
                                      verifiedCredential
                                        .credentialId
                                    }
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Student Name
                                  </span>

                                  <strong>
                                    {
                                      verifiedCredential
                                        .studentName
                                    }
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Roll Number
                                  </span>

                                  <strong>
                                    {
                                      verifiedCredential
                                        .rollNumber
                                    }
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Student Email Hash
                                  </span>

                                  <strong>
                                    {
                                      verifiedCredential
                                        .studentEmailHash
                                    }
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    University
                                  </span>

                                  <strong>
                                    {
                                      verifiedCredential
                                        .university
                                    }
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Stored Certificate Hash
                                  </span>

                                  <strong>
                                    {
                                      verifiedCredential
                                        .certificateHash
                                    }
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    IPFS CID
                                  </span>

                                  <strong>
                                    {
                                      verifiedCredential
                                        .ipfsCid ||
                                      "Not available"
                                    }
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Issue Date
                                  </span>

                                  <strong>
                                    {
                                      verifiedCredential
                                        .issueDate
                                    }
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Revoked
                                  </span>

                                  <strong>
                                    {
                                      verifiedCredential.revoked
                                        ? "Yes"
                                        : "No"
                                    }
                                  </strong>
                                </div>

                              </div>


                              {verifiedCredential.ipfsCid && (

                                <a
                                  className="ipfs-button"
                                  href={`https://gateway.pinata.cloud/ipfs/${encodeURIComponent(
                                    verifiedCredential.ipfsCid
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  📄 View Certificate on IPFS ↗
                                </a>

                              )}

                            </div>

                          )}

                        </>

                      ) : (

                        /* =================================================
                            MANUAL VERIFICATION
                        ================================================= */

                        <div className="form-card">

                          <div className="form-title">
                            📄 Verify Certificate
                          </div>

                          <div className="form-grid">

                            <div className="form-field full">

                              <label className="form-label">
                                Credential ID
                              </label>

                              <input
                                className="form-input"
                                type="text"
                                placeholder="Enter credential ID"
                                value={
                                  verifyCredentialId
                                }
                                onChange={(e) => {

                                  setVerifyCredentialId(
                                    e.target.value
                                  );

                                  setVerificationResult(
                                    null
                                  );

                                  setVerifiedCredential(
                                    null
                                  );

                                  setError("");
                                  setStatus("");

                                }}
                              />

                            </div>


                            <div className="form-field full">

                              <label className="form-label">
                                Upload Certificate PDF
                              </label>

                              <label className="upload-area">

                                <input
                                  type="file"
                                  accept="application/pdf"
                                  hidden
                                  onChange={(e) => {

                                    const file =
                                      e.target.files?.[0] ||
                                      null;

                                    setSelectedFile(file);
                                    setCalculatedHash("");
                                    setVerificationResult(null);
                                    setVerifiedCredential(null);
                                    setError("");
                                    setStatus("");

                                  }}
                                />

                                <div className="upload-content">

                                  <div className="upload-icon">
                                    📄
                                  </div>

                                  <div className="upload-title">
                                    Upload certificate
                                  </div>

                                  <div className="upload-subtitle">
                                    PDF files only
                                  </div>

                                </div>

                              </label>


                              {selectedFile && (

                                <div className="file-card">

                                  <div className="file-info">

                                    <div className="file-icon">
                                      📄
                                    </div>

                                    <div>

                                      <div className="file-name">
                                        {
                                          selectedFile.name
                                        }
                                      </div>

                                      <div className="file-size">
                                        Certificate selected
                                      </div>

                                    </div>

                                  </div>

                                  <div className="file-success">
                                    ✓
                                  </div>

                                </div>

                              )}

                            </div>

                          </div>


                          <button
                            className="issue-button"
                            onClick={
                              verifyUploadedCertificate
                            }
                          >
                            🔎 Verify Certificate →
                          </button>


                          {status && (
                            <div className="status-box">
                              {status}
                            </div>
                          )}


                          {error && (
                            <div className="error">
                              {error}
                            </div>
                          )}


                          {verificationResult ===
                            "VALID" && (

                            <div className="valid-card">

                              <div className="valid-icon">
                                ✓
                              </div>

                              <div>

                                <div className="valid-title">
                                  CERTIFICATE VALID
                                </div>

                                <div className="valid-description">
                                  The certificate matches
                                  the blockchain record.
                                </div>

                              </div>

                            </div>

                          )}


                          {verificationResult ===
                            "INVALID" && (

                            <div className="invalid-card">
                              ❌ CERTIFICATE INVALID
                            </div>

                          )}


                          {verificationResult ===
                            "REVOKED" && (

                            <div className="invalid-card">
                              ⚠️ CERTIFICATE REVOKED
                            </div>

                          )}


                          {calculatedHash && (

                            <div className="hash-card">

                              <div className="hash-icon">
                                🔐
                              </div>

                              <div className="hash-content">

                                <div className="hash-title">
                                  Calculated SHA-256
                                </div>

                                <div className="hash-value">
                                  {calculatedHash}
                                </div>

                              </div>

                            </div>

                          )}

                        </div>

                      )}

                    </div>

                  </section>


                  {/* =================================================
                      VERIFIER SIDEBAR
                  ================================================= */}

                  <aside className="verifier-sidebar">

                    <div className="sidebar-card">

                      <div className="sidebar-title">
                        🔎 Verifier Mode
                      </div>

                      <div className="account-card">

                        <div className="account-icon">
                          🔍
                        </div>

                        <div className="account-title">
                          Certificate Verification
                        </div>

                        <div className="account-subtitle">
                          Verify credentials against the
                          blockchain and IPFS.
                        </div>

                        <div className="account-badge">
                          ✓ Ready to verify
                        </div>

                      </div>

                    </div>


                    {verifiedCredential && (

                      <div className="sidebar-card">

                        <div className="sidebar-title">
                          📄 Certificate Preview
                        </div>

                        <a
                          className="ipfs-button"
                          href={
                            verifiedCredential.ipfsCid
                              ? `https://gateway.pinata.cloud/ipfs/${encodeURIComponent(
                                  verifiedCredential.ipfsCid
                                )}`
                              : "#"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📄 View on IPFS ↗
                        </a>

                      </div>

                    )}

                  </aside>

                </div>

              )}

            </>

          )}


          {/* =================================================
              QR VERIFICATION WITHOUT METAMASK
          ================================================= */}

          {isQRVerification && (

            <div className="verifier-layout">

              <section className="verifier-main">

                <div className="main-panel">

                  <div className="panel-header">

                    <div className="panel-heading">

                      <div className="panel-icon">
                        🔎
                      </div>

                      <div>

                        <h1 className="panel-title">
                          Verifier Dashboard
                        </h1>

                        <p className="panel-description">
                          Secure blockchain-based academic
                          credential verification
                        </p>

                      </div>

                    </div>

                    <div className="authorized-badge">
                      ✓ Certificate Verification
                      <span>
                        No wallet required
                      </span>
                    </div>

                  </div>


                  <div className="credential-id-card">
                    🔗 Credential ID:
                    <strong>
                      {" "}
                      {verifyCredentialId}
                    </strong>
                  </div>


                  {status && (
                    <div className="status-box">
                      {status}
                    </div>
                  )}


                  {error && (
                    <div className="error">
                      {error}
                    </div>
                  )}


                  {verificationResult ===
                    "VALID" && (

                    <div className="valid-card">

                      <div className="valid-icon">
                        ✓
                      </div>

                      <div>

                        <div className="valid-title">
                          CERTIFICATE VALID
                        </div>

                        <div className="valid-description">
                          The certificate is authentic
                          and has not been tampered with.
                        </div>

                      </div>

                    </div>

                  )}


                  {verificationResult ===
                    "INVALID" && (

                    <div className="invalid-card">
                      ❌ CERTIFICATE INVALID
                    </div>

                  )}


                  {verificationResult ===
                    "REVOKED" && (

                    <div className="invalid-card">
                      ⚠️ CERTIFICATE REVOKED
                    </div>

                  )}


                  {calculatedHash && (

                    <div className="hash-card">

                      <div className="hash-icon">
                        🔐
                      </div>

                      <div className="hash-content">

                        <div className="hash-title">
                          Calculated SHA-256 from IPFS
                        </div>

                        <div className="hash-value">
                          {calculatedHash}
                        </div>

                      </div>

                    </div>

                  )}


                  {verifiedCredential && (

                    <div className="credential-details">

                      <div className="form-title">
                        🔗 Credential Information
                      </div>

                      <div className="credential-grid">

                        <div>
                          <span>
                            Credential ID
                          </span>

                          <strong>
                            {
                              verifiedCredential
                                .credentialId
                            }
                          </strong>
                        </div>


                        <div>
                          <span>
                            Student Name
                          </span>

                          <strong>
                            {
                              verifiedCredential
                                .studentName
                            }
                          </strong>
                        </div>


                        <div>
                          <span>
                            Roll Number
                          </span>

                          <strong>
                            {
                              verifiedCredential
                                .rollNumber
                            }
                          </strong>
                        </div>


                        <div>
                          <span>
                            Student Email Hash
                          </span>

                          <strong>
                            {
                              verifiedCredential
                                .studentEmailHash
                            }
                          </strong>
                        </div>


                        <div>
                          <span>
                            University
                          </span>

                          <strong>
                            {
                              verifiedCredential
                                .university
                            }
                          </strong>
                        </div>


                        <div>
                          <span>
                            Stored Certificate Hash
                          </span>

                          <strong>
                            {
                              verifiedCredential
                                .certificateHash
                            }
                          </strong>
                        </div>


                        <div>
                          <span>
                            IPFS CID
                          </span>

                          <strong>
                            {
                              verifiedCredential.ipfsCid ||
                              "Not available"
                            }
                          </strong>
                        </div>


                        <div>
                          <span>
                            Issue Date
                          </span>

                          <strong>
                            {
                              verifiedCredential.issueDate
                            }
                          </strong>
                        </div>


                        <div>
                          <span>
                            Revoked
                          </span>

                          <strong>
                            {
                              verifiedCredential.revoked
                                ? "Yes"
                                : "No"
                            }
                          </strong>
                        </div>

                      </div>


                      {verifiedCredential.ipfsCid && (

                        <a
                          className="ipfs-button"
                          href={`https://gateway.pinata.cloud/ipfs/${encodeURIComponent(
                            verifiedCredential.ipfsCid
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📄 View Certificate on IPFS ↗
                        </a>

                      )}

                    </div>

                  )}

                </div>

              </section>


              <aside className="verifier-sidebar">

                <div className="sidebar-card">

                  <div className="sidebar-title">
                    🔐 Verification Status
                  </div>

                  <div className="account-card">

                    <div className="account-icon">
                      {verificationResult ===
                      "VALID"
                        ? "✓"
                        : "🔎"}
                    </div>

                    <div className="account-title">
                      {verificationResult ===
                      "VALID"
                        ? "Certificate Verified"
                        : "Verifying Certificate"}
                    </div>

                    <div className="account-subtitle">
                      Blockchain and IPFS verification
                      is performed automatically.
                    </div>

                    {verificationResult ===
                      "VALID" && (

                      <div className="account-badge">
                        ✓ Authentic
                      </div>

                    )}

                  </div>

                </div>

              </aside>

            </div>

          )}


          {/* =================================================
              GLOBAL ERROR
          ================================================= */}

          {!isQRVerification &&
            !account &&
            error && (

              <div className="error">
                {error}
              </div>

            )}

        </main>

      </div>
    </div>
  );
}

export default App;