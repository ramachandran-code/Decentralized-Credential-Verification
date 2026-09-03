import { ethers } from "ethers";

const CONTRACT_ADDRESS =
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  const provider = new ethers.JsonRpcProvider(
    "http://127.0.0.1:8545"
  );

  const network = await provider.getNetwork();

  console.log("Chain ID:", network.chainId.toString());

  const code = await provider.getCode(CONTRACT_ADDRESS);

  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Code length:", code.length);

  if (code === "0x") {
    console.log("\n❌ NO CONTRACT EXISTS AT THIS ADDRESS");
  } else {
    console.log("\n✅ CONTRACT CODE EXISTS");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});