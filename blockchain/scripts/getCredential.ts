import { network } from "hardhat";

const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  // Connect to the network selected by --network localhost
  const { ethers } = await network.create();

  console.log("Connected to localhost");

  const contract = await ethers.getContractAt(
    "CredentialVerification",
    CONTRACT_ADDRESS
  );

  const credentialId = "CRED-2026-003";

  console.log(
    `\nRetrieving credential: ${credentialId}`
  );

  const credential =
    await contract.getCredential(credentialId);

  console.log("\n==============================");
  console.log("       CREDENTIAL DETAILS");
  console.log("==============================");

  console.log(
    "Credential ID:",
    credential.credentialId
  );

  console.log(
    "Student Name:",
    credential.studentName
  );

  console.log(
    "Roll Number:",
    credential.rollNumber
  );

  console.log(
    "Student Identifier:",
    credential.studentIdentifier
  );

  console.log(
    "Certificate Hash:",
    credential.certificateHash
  );

  console.log(
    "University:",
    credential.university
  );

  console.log(
    "Issue Date:",
    new Date(
      Number(credential.issueDate) * 1000
    ).toLocaleString()
  );

  console.log(
    "Revoked:",
    credential.revoked
  );

  console.log(
    "Exists:",
    credential.exists
  );

  // Verify using the hash already stored on-chain
  const valid =
    await contract.verifyCredential(
      credentialId,
      credential.certificateHash
    );

  console.log("\n==============================");
  console.log("       BLOCKCHAIN VERIFY");
  console.log("==============================");

  console.log(
    "Certificate valid:",
    valid
  );

  console.log("\nDone.");
}

main().catch((error) => {
  console.error("\nERROR:");
  console.error(error);
  process.exitCode = 1;
});