import hre from "hardhat";

const { ethers } = await hre.network.connect();

const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const UNIVERSITY_ADDRESS =
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

async function main() {
  console.log("Connecting to CredentialVerification...");

  const contract =
    await ethers.getContractAt(
      "CredentialVerification",
      CONTRACT_ADDRESS
    );

  const owner =
    await contract.owner();

  console.log("Contract owner:", owner);
  console.log("University:", UNIVERSITY_ADDRESS);

  const alreadyAuthorized =
    await contract.authorizedUniversities(
      UNIVERSITY_ADDRESS
    );

  console.log(
    "Currently authorized:",
    alreadyAuthorized
  );

  if (alreadyAuthorized) {
    console.log("✅ University is already authorized.");
    return;
  }

  console.log(
    "Authorizing university..."
  );

  const transaction =
    await contract.authorizeUniversity(
      UNIVERSITY_ADDRESS
    );

  console.log(
    "Transaction:",
    transaction.hash
  );

  await transaction.wait();

  const confirmed =
    await contract.authorizedUniversities(
      UNIVERSITY_ADDRESS
    );

  console.log(
    "Authorization confirmed:",
    confirmed
  );

  if (confirmed) {
    console.log(
      "✅ UNIVERSITY AUTHORIZED SUCCESSFULLY"
    );
  } else {
    console.log(
      "❌ Authorization could not be confirmed."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
