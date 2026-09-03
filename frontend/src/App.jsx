import { useEffect, useState } from "react";
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

  const [credentialId, setCredentialId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentIdentifier, setStudentIdentifier] = useState("");
  const [certificateHash, setCertificateHash] = useState("");
  const [ipfsCid, setIpfsCid] = useState("");
  const [ipfsUrl, setIpfsUrl] = useState("");
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [uploadingToIPFS, setUploadingToIPFS] = useState(false);

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
  // LOAD WALLET
  // ==================================================

  async function loadWallet(address) {
    try {
      setError("");
      setStatus("");

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
      console.error(err);

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
      // ------------------------------
      // ADMIN
      // ------------------------------

      if (
        address.toLowerCase() ===
        ADMIN_ADDRESS.toLowerCase()
      ) {
        setRole("ADMIN");
        return;
      }

      // ------------------------------
      // UNIVERSITY / VERIFIER
      // ------------------------------

      const contract =
        await getReadOnlyContract();

      const authorized =
        await contract.authorizedUniversities(
          address
        );

      if (authorized) {
        setRole("UNIVERSITY");
      } else {
        setRole("VERIFIER");
      }

    } catch (err) {
      console.error(
        "Role detection error:",
        err
      );

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

      if (
        !accounts ||
        accounts.length === 0
      ) {
        setError(
          "No MetaMask account selected."
        );

        return;
      }

      await loadWallet(
        accounts[0]
      );

    } catch (err) {
      console.error(err);

      if (
        err?.code === 4001
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

    // Admin
    setUniversityAddress("");
    setAuthorizationStatus("");

    // Credential
    setCredentialId("");
    setStudentName("");
    setRollNumber("");
    setStudentIdentifier("");
    setCertificateHash("");
    setIpfsCid("");
    setIpfsUrl("");
    setSelectedCertificate(null);
    setUploadingToIPFS(false);

    // Verifier
    setVerifyCredentialId("");
    setSelectedFile(null);
    setCalculatedHash("");
    setVerificationResult(null);
    setVerifiedCredential(null);

    // General
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

    // ----------------------------------------
    // Get and clean address
    // ----------------------------------------

    const rawAddress = universityAddress.trim();

    if (!rawAddress) {
      setError("University wallet address is required.");
      return;
    }

    // ----------------------------------------
    // Validate Ethereum address
    // ----------------------------------------

    if (!ethers.isAddress(rawAddress)) {
      setError(
        "Invalid university wallet address. Please enter the complete 42-character Ethereum address."
      );
      return;
    }

    // Convert to proper checksum address
    const university = ethers.getAddress(rawAddress);

    // ----------------------------------------
    // Check Admin account
    // ----------------------------------------

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

    // ----------------------------------------
    // Get contract
    // ----------------------------------------

    const contract = await getContract();

    console.log(
      "Contract:",
      CONTRACT_ADDRESS
    );

    console.log(
      "University address:",
      university
    );

    // ----------------------------------------
    // Check current authorization
    // ----------------------------------------

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

    // ----------------------------------------
    // Send transaction
    // ----------------------------------------

    setStatus(
      "Waiting for MetaMask confirmation..."
    );

    const transaction =
      await contract.authorizeUniversity(
        university
      );

    console.log(
      "Transaction:",
      transaction.hash
    );

    setStatus(
      "Authorization transaction submitted. Waiting for confirmation..."
    );

    await transaction.wait();

    // ----------------------------------------
    // Confirm authorization
    // ----------------------------------------

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
    }

  } catch (err) {
    console.error(
      "Authorization error:",
      err
    );

    setStatus("");

    if (
      err?.code === 4001 ||
      err?.code === "ACTION_REJECTED"
    ) {
      setError(
        "Transaction rejected in MetaMask."
      );
    } else if (
      err?.code === "INVALID_ARGUMENT"
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
      console.error(err);

      setError(
        err?.reason ||
        err?.shortMessage ||
        err?.message ||
        "Unable to check authorization."
      );
    }
  }

  // ==================================================
  // CALCULATE SHA-256 HASH OF PDF
  // ==================================================

  async function calculateFileHash(file) {
    const buffer =
      await file.arrayBuffer();

    const hashBuffer =
      await crypto.subtle.digest(
        "SHA-256",
        buffer
      );

    const hashArray =
      Array.from(
        new Uint8Array(hashBuffer)
      );

    return hashArray
      .map(
        (byte) =>
          byte
            .toString(16)
            .padStart(2, "0")
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

        // ------------------------------
        // Validate credential fields
        // ------------------------------

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

        // ------------------------------
        // Validate certificate PDF
        // ------------------------------

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

        // ------------------------------
        // Calculate SHA-256
        // ------------------------------

        setStatus(
          "Calculating certificate SHA-256 hash..."
        );

        const calculatedCertificateHash =
          await calculateFileHash(
            selectedCertificate
          );

        const cleanHash =
          calculatedCertificateHash
            .toLowerCase()
            .trim()
            .replace(/^0x/, "");

        if (
          !/^[a-f0-9]{64}$/.test(cleanHash)
        ) {
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

        // ------------------------------
        // Upload certificate to IPFS
        // ------------------------------

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
          ipfsResult.cid;

        const url =
          ipfsResult.ipfsUrl;

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

        // ------------------------------
        // Get blockchain contract
        // ------------------------------

        setStatus(
          "Connecting to blockchain..."
        );

        const contract =
          await getContract();

        // ------------------------------
        // Verify connected account
        // ------------------------------

        const currentAccount =
          await contract.runner.getAddress();

        console.log(
          "Connected university:",
          currentAccount
        );

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

        // ------------------------------
        // Issue credential
        // ------------------------------

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

        const receipt =
          await transaction.wait();

        console.log(
          "Credential transaction:",
          receipt
        );

        console.log(
          "Transaction hash:",
          receipt.hash
        );

        // ------------------------------
        // Success
        // ------------------------------

        setStatus(
          `Credential issued successfully! Transaction: ${receipt.hash}`
        );

        // ------------------------------
        // Clear credential input fields
        // ------------------------------

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
        } else if (
          err?.reason ===
          "IPFS CID required"
        ) {
          setError(
            "IPFS CID is missing. Please upload the certificate again."
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
  // VERIFY UPLOADED CERTIFICATE
  // ==================================================

  async function verifyUploadedCertificate() {
    try {
      setError("");
      setStatus("");
      setVerificationResult(null);
      setVerifiedCredential(null);
      setCalculatedHash("");

      // ------------------------------
      // Validate Credential ID
      // ------------------------------

      if (
        !verifyCredentialId.trim()
      ) {
        setError(
          "Credential ID is required."
        );

        return;
      }

      // ------------------------------
      // Validate file
      // ------------------------------

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

      // ------------------------------
      // Calculate SHA-256
      // ------------------------------

      setStatus(
        "Calculating certificate SHA-256 hash..."
      );

      const hash =
        await calculateFileHash(
          selectedFile
        );

      console.log(
        "Calculated PDF SHA-256:",
        hash
      );

      setCalculatedHash(
        hash
      );

      // ------------------------------
      // Get blockchain contract
      // ------------------------------

      setStatus(
        "Checking certificate against blockchain..."
      );

      const contract =
        await getReadOnlyContract();

      // ------------------------------
      // Retrieve credential
      // ------------------------------

      const credential =
        await contract.getCredential(
          verifyCredentialId.trim()
        );

      // ------------------------------
      // Convert blockchain data
      // ------------------------------

      const credentialData = {
        credentialId:
          credential.credentialId,

        studentName:
          credential.studentName,

        rollNumber:
          credential.rollNumber,

        studentIdentifier:
          credential.studentIdentifier,

        certificateHash:
          credential.certificateHash,

        university:
          credential.university,

        issueDate:
          new Date(
            Number(
              credential.issueDate
            ) * 1000
          ).toLocaleString(),

        revoked:
          credential.revoked,

        exists:
          credential.exists,
      };

      setVerifiedCredential(
        credentialData
      );

      // ------------------------------
      // Check whether credential exists
      // ------------------------------

      if (
        credential.exists === false
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

      // ------------------------------
      // Check revocation
      // ------------------------------

      if (
        credential.revoked
      ) {
        setVerificationResult(
          "REVOKED"
        );

        setStatus("");

        return;
      }

      // ------------------------------
      // Normalize hashes
      // ------------------------------

      const storedHash =
        String(credential.certificateHash || "")
          .toLowerCase()
          .trim()
          .replace(/^0x/, "");

      const uploadedHash =
        String(hash || "")
          .toLowerCase()
          .trim()
          .replace(/^0x/, "");

      console.log(
        "================================="
      );

      console.log(
        "Stored blockchain hash:",
        storedHash
      );

      console.log(
        "Uploaded PDF SHA-256 hash:",
        uploadedHash
      );

      console.log(
        "Hashes match:",
        storedHash === uploadedHash
      );

      console.log(
        "================================="
      );

      // ------------------------------
      // Verify through smart contract
      // ------------------------------

      // Solidity expects certificateHash
      // as a STRING, not bytes32.

      const valid =
        await contract.verifyCredential(
          verifyCredentialId.trim(),
          uploadedHash
      );

      // ------------------------------
      // Final verification
      // ------------------------------

      if (
        valid &&
        storedHash === uploadedHash
      ) {
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

      // ------------------------------
      // Final verification
      // ------------------------------

      if (
        valid &&
        storedHash ===
          uploadedHash
      ) {
        setVerificationResult(
          "VALID"
        );
      } else {
        setVerificationResult(
          "INVALID"
        );
      }

      setStatus("");

    } catch (err) {
      console.error(
        "Verification error:",
        err
      );

      setStatus("");

      if (
        err?.reason ===
        "Credential not found"
      ) {
        setError(
          "Credential not found on blockchain."
        );
      } else if (
        err?.shortMessage ===
        "missing revert data"
      ) {
        setError(
          "Unable to read the credential from the connected blockchain."
        );
      } else {
        setError(
          err?.reason ||
          err?.shortMessage ||
          err?.message ||
          "Certificate verification failed."
        );
      }
    }
  }

  // ==================================================
  // METAMASK EVENTS
  // ==================================================

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    function handleAccountsChanged(
      accounts
    ) {
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

        {/* ==========================================
            HEADER
        ========================================== */}

        <div className="logo">
          🎓
        </div>

        <h1>
          Decentralized Credential Verification
        </h1>

        <p className="subtitle">
          Secure blockchain-based academic
          credential verification
        </p>

        {/* ==========================================
            CONNECT WALLET
        ========================================== */}

        {!account ? (
          <button
            className="connect-button"
            onClick={
              connectWallet
            }
          >
            🦊 Connect MetaMask
          </button>
        ) : (
          <>

            {/* ========================================
                WALLET INFORMATION
            ======================================== */}

            <div className="success">
              ✓ Wallet Connected
            </div>

            <div className="info">
              <span>
                Wallet Address
              </span>

              <strong>
                {account}
              </strong>
            </div>

            <div className="info">
              <span>
                Network
              </span>

              <strong>
                Hardhat Local
              </strong>
            </div>

            <div className="info">
              <span>
                Chain ID
              </span>

              <strong>
                {chainId}
              </strong>
            </div>

            <div className="info">
              <span>
                Balance
              </span>

              <strong>
                {Number(balance).toFixed(2)}
                {" "}
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
                    value={
                      universityAddress
                    }
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
                      {
                        authorizationStatus
                      }
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

                  {/* Certificate PDF */}

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file =
                        e.target.files?.[0] || null;

                      setSelectedCertificate(
                        file
                      );

                      setSelectedFile(
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
                      {selectedCertificate.name}
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
                  >
                    Issue Credential
                  </button>

                </div>
              </div>
            )}

            {/* ========================================
                VERIFIER DASHBOARD
            ======================================== */}

            {role === "VERIFIER" && (
              <div className="dashboard">

                <h2>
                  🔎 Verifier Dashboard
                </h2>

                <p>
                  Verify the authenticity of
                  an academic certificate
                  using blockchain.
                </p>

                <div className="admin-section">

                  <h3>
                    Verify Certificate
                  </h3>

                  {/* Credential ID */}

                  <input
                    type="text"
                    placeholder="Credential ID"
                    value={
                      verifyCredentialId
                    }
                    onChange={(e) =>
                      setVerifyCredentialId(
                        e.target.value
                      )
                    }
                  />

                  {/* PDF Upload */}

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file =
                        e.target.files?.[0];

                      setSelectedFile(
                        file || null
                      );

                      setCalculatedHash(
                        ""
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

                  {/* Selected File */}

                  {selectedFile && (
                    <p>
                      Selected:
                      {" "}
                      <strong>
                        {
                          selectedFile.name
                        }
                      </strong>
                    </p>
                  )}

                  {/* Verify Button */}

                  <button
                    className="action-button"
                    onClick={
                      verifyUploadedCertificate
                    }
                  >
                    Verify Certificate
                  </button>

                  {/* Calculated Hash */}

                  {calculatedHash && (
                    <div className="info">
                      <span>
                        Calculated SHA-256
                      </span>

                      <strong>
                        {
                          calculatedHash
                        }
                      </strong>
                    </div>
                  )}

                  {/* VALID */}

                  {verificationResult ===
                    "VALID" && (
                    <div className="success">
                      ✅ CERTIFICATE VALID
                    </div>
                  )}

                  {/* INVALID */}

                  {verificationResult ===
                    "INVALID" && (
                    <div className="error">
                      ❌ CERTIFICATE INVALID
                    </div>
                  )}

                  {/* REVOKED */}

                  {verificationResult ===
                    "REVOKED" && (
                    <div className="error">
                      ⚠️ CERTIFICATE REVOKED
                    </div>
                  )}

                  {/* Blockchain Details */}

                  {verifiedCredential && (
                    <div className="credential-details">

                      <h3>
                        Blockchain Credential
                      </h3>

                      <p>
                        <strong>
                          Credential ID:
                        </strong>
                        {" "}
                        {
                          verifiedCredential
                            .credentialId
                        }
                      </p>

                      <p>
                        <strong>
                          Student:
                        </strong>
                        {" "}
                        {
                          verifiedCredential
                            .studentName
                        }
                      </p>

                      <p>
                        <strong>
                          Roll Number:
                        </strong>
                        {" "}
                        {
                          verifiedCredential
                            .rollNumber
                        }
                      </p>

                      <p>
                        <strong>
                          Student Identifier:
                        </strong>
                        {" "}
                        {
                          verifiedCredential
                            .studentIdentifier
                        }
                      </p>

                      <p>
                        <strong>
                          University:
                        </strong>
                        {" "}
                        {
                          verifiedCredential
                            .university
                        }
                      </p>

                      <p>
                        <strong>
                          Stored Certificate Hash:
                        </strong>
                        {" "}
                        {
                          verifiedCredential
                            .certificateHash
                        }
                      </p>

                      <p>
                        <strong>
                          Issue Date:
                        </strong>
                        {" "}
                        {
                          verifiedCredential
                            .issueDate
                        }
                      </p>

                      <p>
                        <strong>
                          Revoked:
                        </strong>
                        {" "}
                        {
                          verifiedCredential
                            .revoked
                            ? "Yes"
                            : "No"
                        }
                      </p>

                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ========================================
                STATUS MESSAGE
            ======================================== */}

            {status && (
              <div className="status-box">
                {status}
              </div>
            )}

            {/* ========================================
                ERROR MESSAGE
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
              onClick={
                disconnectWallet
              }
            >
              Disconnect
            </button>

          </>
        )}

      </div>
    </div>
  );
}

export default App;