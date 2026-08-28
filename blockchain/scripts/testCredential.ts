import hre from "hardhat";

const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {

  const { ethers } = await hre.network.connect();

  const [admin, university, verifier] =
    await ethers.getSigners();

  console.log("Admin:", admin.address);
  console.log("University:", university.address);
  console.log("Verifier:", verifier.address);

  const CredentialVerification =
    await ethers.getContractAt(
      "CredentialVerification",
      CONTRACT_ADDRESS
    );

  console.log("\nContract:");
  console.log(await CredentialVerification.getAddress());

  // 1. Authorize university

  console.log("\nAuthorizing university...");

  const authorizeTx =
    await CredentialVerification
      .connect(admin)
      .authorizeUniversity(
        university.address
      );

  await authorizeTx.wait();

  console.log(
    "University authorized:",
    university.address
  );

  // 2. Check authorization

  const isAuthorized =
    await CredentialVerification
      .authorizedUniversities(
        university.address
      );

  console.log(
    "Is authorized:",
    isAuthorized
  );

  // 3. Issue credential

  console.log("\nIssuing credential...");

  const issueTx =
    await CredentialVerification
      .connect(university)
      .issueCredential(
        "CRED-2026-001",
        "Ram",
        "21AI001",
        "STU001",
        "abc123certificatehash"
      );

  await issueTx.wait();

  console.log(
    "Credential issued successfully."
  );

  // 4. Retrieve credential

  console.log("\nRetrieving credential...");

  const credential =
    await CredentialVerification
      .getCredential(
        "CRED-2026-001"
      );

  console.log(
    "Credential ID:",
    credential.credentialId
  );

  console.log(
    "Student:",
    credential.studentName
  );

  console.log(
    "Roll Number:",
    credential.rollNumber
  );

  console.log(
    "Student ID:",
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
    "Revoked:",
    credential.revoked
  );

  // 5. Verify certificate

  console.log(
    "\nVerifying certificate..."
  );

  const valid =
    await CredentialVerification
      .connect(verifier)
      .verifyCredential(
        "CRED-2026-001",
        "abc123certificatehash"
      );

  console.log(
    "Certificate valid:",
    valid
  );

  // 6. Verify wrong hash

  const invalid =
    await CredentialVerification
      .connect(verifier)
      .verifyCredential(
        "CRED-2026-001",
        "WRONG-HASH"
      );

  console.log(
    "Wrong hash valid:",
    invalid
  );
}

main().catch((error) => {

  console.error(error);

  process.exitCode = 1;

});