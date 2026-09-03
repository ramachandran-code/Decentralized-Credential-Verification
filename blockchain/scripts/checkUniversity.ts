import { network } from "hardhat";

const { ethers } = await network.connect();

const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const UNIVERSITY_ADDRESS =
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const contract = await ethers.getContractAt(
  "CredentialVerification",
  CONTRACT_ADDRESS
);

const authorized =
  await contract.authorizedUniversities(
    UNIVERSITY_ADDRESS
  );

console.log("Contract:", CONTRACT_ADDRESS);
console.log("University:", UNIVERSITY_ADDRESS);
console.log("Authorized:", authorized);

process.exit(0);
