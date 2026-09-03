import hre from "hardhat";

const { ethers } = await hre.network.connect();

const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  console.log("Checking contract...");
  console.log("Address:", CONTRACT_ADDRESS);

  const code = await ethers.provider.getCode(
    CONTRACT_ADDRESS
  );

  console.log("Code length:", code.length);

  if (code === "0x") {
    console.log("❌ NO CONTRACT FOUND AT THIS ADDRESS");
    return;
  }

  console.log("✅ Contract exists");

  const contract =
    await ethers.getContractAt(
      "CredentialVerification",
      CONTRACT_ADDRESS
    );

  const owner =
    await contract.owner();

  console.log("Owner:", owner);

  const universityAddress =
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const authorized =
    await contract.authorizedUniversities(
      universityAddress
    );

  console.log(
    "University:",
    universityAddress
  );

  console.log(
    "University authorized:",
    authorized
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
