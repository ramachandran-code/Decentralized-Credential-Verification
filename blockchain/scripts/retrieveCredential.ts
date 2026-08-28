import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  const contractAddress =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const credentialId = "CRED-2026-002";
  const expectedHash = "abc123certificatehash";

  const { ethers: hardhatEthers } = await hre.network.connect();

  const contract = await hardhatEthers.getContractAt(
    "CredentialVerification",
    contractAddress
  );

  console.log("\n========================================");
  console.log("   BLOCKCHAIN CREDENTIAL RETRIEVAL");
  console.log("========================================\n");

  console.log("Contract:");
  console.log(contractAddress);

  console.log("\nCredential ID:");
  console.log(credentialId);

  // Retrieve credential directly from smart contract
  const credential =
    await contract.getCredential(credentialId);

  console.log("\n========================================");
  console.log("       STORED BLOCKCHAIN DATA");
  console.log("========================================\n");

  console.log("Credential ID:");
  console.log(credential.credentialId);

  console.log("\nStudent Name:");
  console.log(credential.studentName);

  console.log("\nRoll Number:");
  console.log(credential.rollNumber);

  console.log("\nStudent Identifier:");
  console.log(credential.studentIdentifier);

  console.log("\nCertificate Hash:");
  console.log(credential.certificateHash);

  console.log("\nUniversity:");
  console.log(credential.university);

  console.log("\nIssue Date:");
  console.log(
    new Date(
      Number(credential.issueDate) * 1000
    ).toLocaleString()
  );

  console.log("\nRevoked:");
  console.log(credential.revoked);

  console.log("\nExists:");
  console.log(credential.exists);

  // Verify certificate hash
  const isValid =
    await contract.verifyCredential(
      credentialId,
      expectedHash
    );

  console.log("\n========================================");
  console.log("       CERTIFICATE VERIFICATION");
  console.log("========================================\n");

  console.log("Expected Hash:");
  console.log(expectedHash);

  console.log("\nStored Hash:");
  console.log(credential.certificateHash);

  console.log("\nHash Match:");
  console.log(
    credential.certificateHash === expectedHash
      ? "YES"
      : "NO"
  );

  console.log("\nBlockchain Verification:");
  console.log(
    isValid
      ? "VALID CREDENTIAL"
      : "INVALID CREDENTIAL"
  );

  // Find issuance transaction from event
  console.log("\n========================================");
  console.log("       TRANSACTION DETAILS");
  console.log("========================================\n");

  const filter =
    contract.filters.CredentialIssued(
      credentialId
    );

  const events =
    await contract.queryFilter(filter);

  if (events.length === 0) {
    console.log(
      "No CredentialIssued event found."
    );
  } else {

    const event = events[events.length - 1];

    console.log("Transaction Hash:");
    console.log(event.transactionHash);

    console.log("\nBlock Number:");
    console.log(event.blockNumber);

    const block =
      await contract.runner?.provider?.getBlock(
        event.blockNumber
      );

    if (block) {
      console.log("\nBlock Timestamp:");
      console.log(
        new Date(
          Number(block.timestamp) * 1000
        ).toLocaleString()
      );
    }

    console.log("\nUniversity:");
    console.log(credential.university);
  }

  console.log("\n========================================");
  console.log("              RESULT");
  console.log("========================================\n");

  if (
    credential.certificateHash === expectedHash &&
    isValid &&
    !credential.revoked
  ) {
    console.log(
      "✅ CREDENTIAL IS AUTHENTIC AND VALID"
    );
  } else {
    console.log(
      "❌ CREDENTIAL VERIFICATION FAILED"
    );
  }

  console.log();
}

main().catch((error) => {
  console.error("\n❌ ERROR:");
  console.error(error);
  process.exitCode = 1;
});