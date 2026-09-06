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
  const [isQRVerification, setIsQRVerification] = useState(false);

  // ==================================================
  // ADMIN STATE
  // ==================================================

  const [universityAddress, setUniversityAddress] = useState("");
  const [authorizationStatus, setAuthorizationStatus] = useState("");

  // ==================================================
  // UNIVERSITY / CREDENTIAL STATE
  // ==================================================

  const [credentialId, setCredentialId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [certificateHash, setCertificateHash] = useState("");
  const [ipfsCid, setIpfsCid] = useState("");
  const [ipfsUrl, setIpfsUrl] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [uploadingToIPFS, setUploadingToIPFS] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);

  // ==================================================
  // VERIFIER STATE
  // ==================================================

  const [verifyCredentialId, setVerifyCredentialId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [calculatedHash, setCalculatedHash] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifiedCredential, setVerifiedCredential] = useState(null);

  // ==================================================
  // GENERAL STATE
  // ==================================================

  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

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
    return `${window.location.origin}/verify/${encodeURIComponent(
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
      studentIdentifier: credential.studentIdentifier,
      certificateHash: credential.certificateHash,
      ipfsCid: credential.ipfsCid,
      university: credential.university,
      issueDate: formatIssueDate(credential.issueDate),
      revoked: Boolean(credential.revoked),
      exists: Boolean(credential.exists),
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
        setError("MetaMask is not installed.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const walletBalance = await provider.getBalance(address);
      const currentChainId = network.chainId.toString();

      setAccount(address);
      setChainId(currentChainId);
      setBalance(ethers.formatEther(walletBalance));

      if (currentChainId !== EXPECTED_CHAIN_ID) {
        setRole("");

        setError(
          `Wrong network. Please switch to Hardhat Local (Chain ID ${EXPECTED_CHAIN_ID}).`
        );

        return;
      }

      await detectRole(address);
    } catch (err) {
      console.error("Wallet loading error:", err);
      setError("Unable to load wallet information.");
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
        return;
      }

      const contract = await getReadOnlyContract();

      const authorized =
        await contract.authorizedUniversities(address);

      if (authorized) {
        setRole("UNIVERSITY");
      } else {
        setRole("VERIFIER");
      }
    } catch (err) {
      console.error("Role detection error:", err);
      setRole("VERIFIER");
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

      if (!accounts || accounts.length === 0) {
        setError("No MetaMask account selected.");
        return;
      }

      await loadWallet(accounts[0]);
    } catch (err) {
      console.error("Connect wallet error:", err);

      if (
        err?.code === 4001 ||
        err?.code === "ACTION_REJECTED"
      ) {
        setError("Connection request was rejected in MetaMask.");
      } else {
        setError(
          err?.message || "Failed to connect MetaMask."
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

    setUniversityAddress("");
    setAuthorizationStatus("");

    setCredentialId("");
    setStudentName("");
    setRollNumber("");
    setStudentIdentifier("");
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

      const rawAddress = universityAddress.trim();

      if (!rawAddress) {
        setError("University wallet address is required.");
        return;
      }

      if (!ethers.isAddress(rawAddress)) {
        setError(
          "Invalid university wallet address. Please enter the complete 42-character Ethereum address."
        );
        return;
      }

      const university = ethers.getAddress(rawAddress);

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

      const contract = await getContract();

      const alreadyAuthorized =
        await contract.authorizedUniversities(university);

      if (alreadyAuthorized) {
        setAuthorizationStatus(
          "✅ University is already authorized."
        );
        return;
      }

      setStatus("Waiting for MetaMask confirmation...");

      const transaction =
        await contract.authorizeUniversity(university);

      setStatus(
        "Authorization transaction submitted. Waiting for confirmation..."
      );

      await transaction.wait();

      const confirmed =
        await contract.authorizedUniversities(university);

      if (confirmed) {
        setStatus("University authorized successfully!");
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
      console.error("Authorization error:", err);
      setStatus("");

      if (
        err?.code === 4001 ||
        err?.code === "ACTION_REJECTED"
      ) {
        setError("Transaction rejected in MetaMask.");
      } else if (err?.code === "INVALID_ARGUMENT") {
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

      if (!universityAddress.trim()) {
        setError("Enter a university wallet address first.");
        return;
      }

      if (!ethers.isAddress(universityAddress.trim())) {
        setError("Invalid university wallet address.");
        return;
      }

      const contract = await getReadOnlyContract();

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
      console.error("Authorization check error:", err);

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
    if (!file || typeof file.arrayBuffer !== "function") {
      throw new Error("Invalid certificate file.");
    }

    const buffer = await file.arrayBuffer();

    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      buffer
    );

    const hashArray = Array.from(
      new Uint8Array(hashBuffer)
    );

    return hashArray
      .map((byte) =>
        byte.toString(16).padStart(2, "0")
      )
      .join("");
  }

  // ==================================================
  // ISSUE CREDENTIAL
  // ==================================================

  async function issueCredential() {
    try {
      setError("");
      setStatus("");
      setShowQRCode(false);

      if (!credentialId.trim()) {
        setError("Credential ID is required.");
        return;
      }

      if (!studentName.trim()) {
        setError("Student name is required.");
        return;
      }

      if (!rollNumber.trim()) {
        setError("Roll number is required.");
        return;
      }

      if (!studentIdentifier.trim()) {
        setError("Student identifier is required.");
        return;
      }

      if (!selectedCertificate) {
        setError("Please select a certificate PDF.");
        return;
      }

      if (
        selectedCertificate.type !==
        "application/pdf"
      ) {
        setError("Please select a PDF certificate.");
        return;
      }

      setStatus(
        "Calculating certificate SHA-256 hash..."
      );

      const calculatedCertificateHash =
        await calculateFileHash(
          selectedCertificate
        );

      const cleanHash = normalizeHash(
        calculatedCertificateHash
      );

      if (!/^[a-f0-9]{64}$/.test(cleanHash)) {
        setError(
          "Unable to calculate a valid SHA-256 hash."
        );
        setStatus("");
        return;
      }

      setCertificateHash(cleanHash);

      console.log(
        "Certificate SHA-256:",
        cleanHash
      );

      setUploadingToIPFS(true);
      setStatus("Uploading certificate to IPFS...");

      const ipfsResult =
        await uploadToIPFS(
          selectedCertificate
        );

      setUploadingToIPFS(false);

      const cid = ipfsResult?.cid;
      const url = ipfsResult?.ipfsUrl || "";

      if (!cid) {
        setError(
          "IPFS upload completed but no CID was returned."
        );
        setStatus("");
        return;
      }

      setIpfsCid(cid);
      setIpfsUrl(url);

      console.log("IPFS CID:", cid);
      console.log("IPFS URL:", url);

      setStatus("Connecting to blockchain...");

      const contract = await getContract();

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

      setStatus(
        "Waiting for MetaMask confirmation..."
      );

      const transaction =
        await contract.issueCredential(
          credentialId.trim(),
          studentName.trim(),
          rollNumber.trim(),
          studentIdentifier.trim(),
          cleanHash,
          cid
        );

      setStatus(
        "Transaction submitted. Waiting for blockchain confirmation..."
      );

      const receipt = await transaction.wait();

      console.log(
        "Credential transaction:",
        receipt
      );

      const generatedVerificationUrl =
        buildVerificationUrl(
          credentialId.trim()
        );

      setVerificationUrl(
        generatedVerificationUrl
      );
      setShowQRCode(true);

      setStatus(
        `Credential issued successfully! Transaction: ${receipt.hash}`
      );

      console.log(
        "Verification URL:",
        generatedVerificationUrl
      );

      setCredentialId("");
      setStudentName("");
      setRollNumber("");
      setStudentIdentifier("");
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
        err?.code === "ACTION_REJECTED"
      ) {
        setError("Transaction rejected in MetaMask.");
      } else if (
        err?.reason === "Credential already exists"
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
  // No MetaMask and no manual PDF upload required.
  // The credential is read from blockchain, the PDF is
  // retrieved from IPFS, and its SHA-256 is compared
  // with the hash stored on blockchain.
  // ==================================================

  async function verifyFromQRCode() {
    const id = verifyCredentialId.trim();

    if (!id) {
      return;
    }

    try {
      setError("");
      setStatus(
        "Reading credential from blockchain..."
      );
      setVerificationResult(null);
      setVerifiedCredential(null);
      setCalculatedHash("");

      const contract = await getReadOnlyContract();

      const credential =
        await contract.getCredential(id);

      const credentialData =
        makeCredentialData(credential);

      setVerifiedCredential(
        credentialData
      );

      if (!credentialData.exists) {
        setVerificationResult("INVALID");
        setError(
          "Credential does not exist on the blockchain."
        );
        setStatus("");
        return;
      }

      if (credentialData.revoked) {
        setVerificationResult("REVOKED");
        setStatus("");
        return;
      }

      const storedHash =
        normalizeHash(
          credentialData.certificateHash
        );

      if (!/^[a-f0-9]{64}$/.test(storedHash)) {
        setVerificationResult("INVALID");
        setError(
          "The blockchain contains an invalid certificate hash."
        );
        setStatus("");
        return;
      }

      const cid =
        String(
          credentialData.ipfsCid || ""
        ).trim();

      if (!cid) {
        setVerificationResult("INVALID");
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
        await fetch(ipfsUrl);

      if (!response.ok) {
        throw new Error(
          `Unable to retrieve the certificate from IPFS. HTTP ${response.status}.`
        );
      }

      const contentType =
        response.headers.get("content-type") || "";

      if (
        contentType &&
        !contentType.toLowerCase().includes("pdf") &&
        !contentType.toLowerCase().includes("octet-stream")
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
        storedHash === downloadedHash;

      if (valid && hashesMatch) {
        setVerificationResult("VALID");
        setError("");
        setStatus(
          "Certificate verified successfully."
        );
      } else {
        setVerificationResult("INVALID");
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

      setVerificationResult("INVALID");
      setStatus("");

      const message =
        err?.reason ||
        err?.shortMessage ||
        err?.message ||
        "";

      if (
        message
          .toLowerCase()
          .includes("credential not found")
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
      setVerificationResult(null);
      setVerifiedCredential(null);
      setCalculatedHash("");

      const id =
        verifyCredentialId.trim();

      if (!id) {
        setError("Credential ID is required.");
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
        await contract.getCredential(id);

      const credentialData =
        makeCredentialData(credential);

      setVerifiedCredential(
        credentialData
      );

      if (!credentialData.exists) {
        setVerificationResult("INVALID");
        setError(
          "Credential does not exist on the blockchain."
        );
        setStatus("");
        return;
      }

      if (credentialData.revoked) {
        setVerificationResult("REVOKED");
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
        storedHash === uploadedHash
      ) {
        setVerificationResult("VALID");
        setError("");
        setStatus(
          "Certificate verified successfully."
        );

        const url =
          buildVerificationUrl(id);

        setVerificationUrl(url);
        setShowQRCode(true);
      } else {
        setVerificationResult("INVALID");
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
          .includes("credential not found")
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

      setVerificationResult("INVALID");
    }
  }

  // ==================================================
  // QR VERIFICATION URL
  // ==================================================

  useEffect(() => {
    const path =
      window.location.pathname;

    if (!path.startsWith("/verify/")) {
      return;
    }

    const credentialIdFromUrl =
      decodeURIComponent(
        path.replace("/verify/", "")
      ).trim();

    if (credentialIdFromUrl) {
      setVerifyCredentialId(
        credentialIdFromUrl
      );
      setIsQRVerification(true);
      setRole("VERIFIER");
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
  }, [isQRVerification, verifyCredentialId]);

  // ==================================================
  // METAMASK EVENTS
  // ==================================================

  useEffect(() => {
    if (!window.ethereum) {
      return undefined;
    }

    function handleAccountsChanged(accounts) {
      // A QR verification page must stay a public,
      // read-only verifier page even if MetaMask changes.
      if (window.location.pathname.startsWith("/verify/")) {
        return;
      }

      if (
        !accounts ||
        accounts.length === 0
      ) {
        disconnectWallet();
      } else {
        loadWallet(accounts[0]);
      }
    }

    function handleChainChanged() {
      // Reloading a QR verification page is harmless,
      // but it should remain a QR verification route.
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
        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="logo">🎓</div>

        <h1>
          Decentralized Credential Verification
        </h1>

        <p className="subtitle">
          Secure blockchain-based academic
          credential verification
        </p>

        {/* ==========================================
            NORMAL WALLET-BASED AREA
        ========================================== */}

        {!account && !isQRVerification ? (
          <button
            className="connect-button"
            onClick={connectWallet}
          >
            🦊 Connect MetaMask
          </button>
        ) : (
          <>
            {/* ========================================
                WALLET / ADMIN / UNIVERSITY AREA

                Hidden completely for QR verification.
            ======================================== */}

            {!isQRVerification && (
              <>
                <div className="success">
                  ✓ Wallet Connected
                </div>

                <div className="info">
                  <span>Wallet Address</span>
                  <strong>{account}</strong>
                </div>

                <div className="info">
                  <span>Network</span>
                  <strong>Hardhat Local</strong>
                </div>

                <div className="info">
                  <span>Chain ID</span>
                  <strong>{chainId}</strong>
                </div>

                <div className="info">
                  <span>Balance</span>
                  <strong>
                    {balance
                      ? Number(balance).toFixed(2)
                      : "0.00"}{" "}
                    ETH
                  </strong>
                </div>

                {/* ========================================
                    ADMIN DASHBOARD
                ======================================== */}

                {role === "ADMIN" && (
                  <div className="dashboard">
                    <h2>
                      🔐 Admin Dashboard
                    </h2>

                    <p>
                      You are connected as the
                      contract administrator.
                    </p>

                    <div className="admin-section">
                      <h3>
                        Authorize University
                      </h3>

                      <input
                        type="text"
                        placeholder="University wallet address"
                        value={universityAddress}
                        onChange={(e) =>
                          setUniversityAddress(
                            e.target.value
                          )
                        }
                      />

                      <button
                        className="action-button"
                        onClick={
                          authorizeUniversity
                        }
                      >
                        Authorize University
                      </button>

                      <button
                        className="action-button"
                        onClick={
                          checkUniversityAuthorization
                        }
                      >
                        Check Authorization
                      </button>

                      {authorizationStatus && (
                        <div className="status-box">
                          {authorizationStatus}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ========================================
                    UNIVERSITY DASHBOARD
                ======================================== */}

                {role === "UNIVERSITY" && (
                  <div className="dashboard">
                    <h2>
                      🎓 University Dashboard
                    </h2>

                    <p>
                      Authorized university account
                    </p>

                    <div className="admin-section">
                      <h3>
                        Issue Academic Credential
                      </h3>

                      <input
                        type="text"
                        placeholder="Credential ID"
                        value={credentialId}
                        onChange={(e) =>
                          setCredentialId(
                            e.target.value
                          )
                        }
                      />

                      <input
                        type="text"
                        placeholder="Student Name"
                        value={studentName}
                        onChange={(e) =>
                          setStudentName(
                            e.target.value
                          )
                        }
                      />

                      <input
                        type="text"
                        placeholder="Roll Number"
                        value={rollNumber}
                        onChange={(e) =>
                          setRollNumber(
                            e.target.value
                          )
                        }
                      />

                      <input
                        type="text"
                        placeholder="Student Identifier"
                        value={studentIdentifier}
                        onChange={(e) =>
                          setStudentIdentifier(
                            e.target.value
                          )
                        }
                      />

                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file =
                            e.target.files?.[0] ||
                            null;

                          setSelectedCertificate(
                            file
                          );
                          setCalculatedHash("");
                          setError("");
                          setStatus("");
                        }}
                      />

                      {selectedCertificate && (
                        <div className="status-box">
                          📄 Selected Certificate:{" "}
                          {
                            selectedCertificate.name
                          }
                        </div>
                      )}

                      <input
                        type="text"
                        placeholder="Certificate SHA-256 Hash"
                        value={certificateHash}
                        onChange={(e) =>
                          setCertificateHash(
                            e.target.value
                          )
                        }
                      />

                      <button
                        className="action-button"
                        onClick={
                          issueCredential
                        }
                        disabled={
                          uploadingToIPFS
                        }
                      >
                        {uploadingToIPFS
                          ? "Uploading..."
                          : "Issue Credential"}
                      </button>

                      {showQRCode &&
                        verificationUrl && (
                          <div className="qr-section">
                            <h3>
                              📱 Certificate QR Code
                            </h3>

                            <p>
                              Scan this QR code
                              to verify the
                              certificate.
                            </p>

                            <QRCodeSVG
                              value={
                                verificationUrl
                              }
                              size={220}
                              level="H"
                            />

                            <p className="verification-url">
                              {
                                verificationUrl
                              }
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* ========================================
                    NORMAL STATUS
                ======================================== */}

                {status && (
                  <div className="status-box">
                    {status}
                  </div>
                )}

                {/* ========================================
                    NORMAL ERROR
                ======================================== */}

                {error && (
                  <div className="error">
                    {error}
                  </div>
                )}

                {/* ========================================
                    DISCONNECT
                ======================================== */}

                <button
                  className="disconnect-button"
                  onClick={disconnectWallet}
                >
                  Disconnect
                </button>
              </>
            )}

            {/* ==========================================
                VERIFIER DASHBOARD

                This is outside !isQRVerification so
                QR verification works without a wallet.
            ========================================== */}

            {role === "VERIFIER" && (
              <div className="dashboard">
                <h2>
                  🔎 Verifier Dashboard
                </h2>

                <p>
                  Verify the authenticity of
                  an academic certificate
                  using blockchain and IPFS.
                </p>

                {/* ========================================
                    QR AUTOMATIC VERIFICATION
                ======================================== */}

                {isQRVerification ? (
                  <>
                    <div className="status-box">
                      🔗 Credential ID:{" "}
                      <strong>
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

                    {calculatedHash && (
                      <div className="info">
                        <span>
                          Calculated SHA-256
                          from IPFS
                        </span>

                        <strong>
                          {calculatedHash}
                        </strong>
                      </div>
                    )}

                    {verificationResult ===
                      "VALID" && (
                      <div className="success">
                        ✅ CERTIFICATE VALID
                      </div>
                    )}

                    {verificationResult ===
                      "INVALID" && (
                      <div className="error">
                        ❌ CERTIFICATE INVALID
                      </div>
                    )}

                    {verificationResult ===
                      "REVOKED" && (
                      <div className="error">
                        ⚠️ CERTIFICATE REVOKED
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* ======================================
                        MANUAL VERIFICATION
                    ====================================== */}

                    <div className="admin-section">
                      <h3>
                        Verify Certificate
                      </h3>

                      <input
                        type="text"
                        placeholder="Credential ID"
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

                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => {
                          const file =
                            e.target.files?.[0] ||
                            null;

                          setSelectedFile(file);
                          setCalculatedHash("");
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

                      {selectedFile && (
                        <p>
                          Selected:{" "}
                          <strong>
                            {selectedFile.name}
                          </strong>
                        </p>
                      )}

                      <button
                        className="action-button"
                        onClick={
                          verifyUploadedCertificate
                        }
                      >
                        Verify Certificate
                      </button>

                      {calculatedHash && (
                        <div className="info">
                          <span>
                            Calculated SHA-256
                          </span>

                          <strong>
                            {calculatedHash}
                          </strong>
                        </div>
                      )}

                      {verificationResult ===
                        "VALID" && (
                        <div className="success">
                          ✅ CERTIFICATE VALID
                        </div>
                      )}

                      {verificationResult ===
                        "INVALID" && (
                        <div className="error">
                          ❌ CERTIFICATE INVALID
                        </div>
                      )}

                      {verificationResult ===
                        "REVOKED" && (
                        <div className="error">
                          ⚠️ CERTIFICATE REVOKED
                        </div>
                      )}

                      {showQRCode &&
                        verificationUrl && (
                          <div className="qr-section">
                            <h3>
                              📱 Scan to Verify
                            </h3>

                            <QRCodeSVG
                              value={
                                verificationUrl
                              }
                              size={220}
                              level="H"
                            />

                            <p>
                              <strong>
                                Verification URL:
                              </strong>
                            </p>

                            <input
                              type="text"
                              value={
                                verificationUrl
                              }
                              readOnly
                            />

                            <button
                              className="action-button"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  verificationUrl
                                )
                              }
                            >
                              Copy Verification URL
                            </button>
                          </div>
                        )}
                    </div>
                  </>
                )}

                {/* ========================================
                    BLOCKCHAIN / IPFS DETAILS
                ======================================== */}

                {verifiedCredential && (
                  <div className="credential-details">
                    <h3>
                      Blockchain Credential
                    </h3>

                    <p>
                      <strong>
                        Credential ID:
                      </strong>{" "}
                      {
                        verifiedCredential.credentialId
                      }
                    </p>

                    <p>
                      <strong>
                        Student:
                      </strong>{" "}
                      {
                        verifiedCredential.studentName
                      }
                    </p>

                    <p>
                      <strong>
                        Roll Number:
                      </strong>{" "}
                      {
                        verifiedCredential.rollNumber
                      }
                    </p>

                    <p>
                      <strong>
                        Student Identifier:
                      </strong>{" "}
                      {
                        verifiedCredential.studentIdentifier
                      }
                    </p>

                    <p>
                      <strong>
                        University:
                      </strong>{" "}
                      {
                        verifiedCredential.university
                      }
                    </p>

                    <p>
                      <strong>
                        Stored Certificate Hash:
                      </strong>{" "}
                      {
                        verifiedCredential.certificateHash
                      }
                    </p>

                    <p>
                      <strong>
                        IPFS CID:
                      </strong>{" "}
                      {
                        verifiedCredential.ipfsCid ||
                        "Not available"
                      }
                    </p>

                    {verifiedCredential.ipfsCid && (
                      <p>
                        <a
                          href={`https://gateway.pinata.cloud/ipfs/${encodeURIComponent(
                            verifiedCredential.ipfsCid
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📄 View Certificate on IPFS
                        </a>
                      </p>
                    )}

                    <p>
                      <strong>
                        Issue Date:
                      </strong>{" "}
                      {
                        verifiedCredential.issueDate
                      }
                    </p>

                    <p>
                      <strong>
                        Revoked:
                      </strong>{" "}
                      {
                        verifiedCredential.revoked
                          ? "Yes"
                          : "No"
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;