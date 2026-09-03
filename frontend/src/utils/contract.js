import { ethers } from "ethers";

// ======================================================
// DEPLOYED CONTRACT ADDRESS
// ======================================================

export const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ======================================================
// CONTRACT ABI
// ======================================================

export const CONTRACT_ABI = [
  // ----------------------------------------------------
  // OWNER
  // ----------------------------------------------------

  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  // ----------------------------------------------------
  // AUTHORIZED UNIVERSITIES
  // ----------------------------------------------------

  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "authorizedUniversities",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  // ----------------------------------------------------
  // AUTHORIZE UNIVERSITY
  // ----------------------------------------------------

  {
    inputs: [
      {
        internalType: "address",
        name: "university",
        type: "address",
      },
    ],
    name: "authorizeUniversity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ----------------------------------------------------
  // REVOKE UNIVERSITY
  // ----------------------------------------------------

  {
    inputs: [
      {
        internalType: "address",
        name: "university",
        type: "address",
      },
    ],
    name: "revokeUniversity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ----------------------------------------------------
  // ISSUE CREDENTIAL
  // IMPORTANT: SIX ARGUMENTS
  // ----------------------------------------------------

  {
    inputs: [
      {
        internalType: "string",
        name: "credentialId",
        type: "string",
      },
      {
        internalType: "string",
        name: "studentName",
        type: "string",
      },
      {
        internalType: "string",
        name: "rollNumber",
        type: "string",
      },
      {
        internalType: "string",
        name: "studentIdentifier",
        type: "string",
      },
      {
        internalType: "string",
        name: "certificateHash",
        type: "string",
      },
      {
        internalType: "string",
        name: "ipfsCid",
        type: "string",
      },
    ],
    name: "issueCredential",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ----------------------------------------------------
  // GET CREDENTIAL
  // ----------------------------------------------------

  {
    inputs: [
      {
        internalType: "string",
        name: "credentialId",
        type: "string",
      },
    ],
    name: "getCredential",
    outputs: [
      {
        components: [
          {
            internalType: "string",
            name: "credentialId",
            type: "string",
          },
          {
            internalType: "string",
            name: "studentName",
            type: "string",
          },
          {
            internalType: "string",
            name: "rollNumber",
            type: "string",
          },
          {
            internalType: "string",
            name: "studentIdentifier",
            type: "string",
          },
          {
            internalType: "string",
            name: "certificateHash",
            type: "string",
          },
          {
            internalType: "string",
            name: "ipfsCid",
            type: "string",
          },
          {
            internalType: "address",
            name: "university",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "issueDate",
            type: "uint256",
          },
          {
            internalType: "bool",
            name: "revoked",
            type: "bool",
          },
          {
            internalType: "bool",
            name: "exists",
            type: "bool",
          },
        ],
        internalType:
          "struct CredentialVerification.Credential",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  // ----------------------------------------------------
  // VERIFY CREDENTIAL
  // ----------------------------------------------------

  {
    inputs: [
      {
        internalType: "string",
        name: "credentialId",
        type: "string",
      },
      {
        internalType: "string",
        name: "certificateHash",
        type: "string",
      },
    ],
    name: "verifyCredential",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },

  // ----------------------------------------------------
  // REVOKE CREDENTIAL
  // ----------------------------------------------------

  {
    inputs: [
      {
        internalType: "string",
        name: "credentialId",
        type: "string",
      },
    ],
    name: "revokeCredential",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ----------------------------------------------------
  // CHECK REVOCATION
  // ----------------------------------------------------

  {
    inputs: [
      {
        internalType: "string",
        name: "credentialId",
        type: "string",
      },
    ],
    name: "isCredentialRevoked",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// ======================================================
// WRITE CONTRACT
// ======================================================

export async function getContract() {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask is not installed."
    );
  }

  const provider =
    new ethers.BrowserProvider(
      window.ethereum
    );

  const signer =
    await provider.getSigner();

  return new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    signer
  );
}

// ======================================================
// READ-ONLY CONTRACT
// ======================================================

export async function getReadOnlyContract() {
  const provider =
    new ethers.JsonRpcProvider(
      "http://127.0.0.1:8545"
    );

  return new ethers.Contract(
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    provider
  );
}