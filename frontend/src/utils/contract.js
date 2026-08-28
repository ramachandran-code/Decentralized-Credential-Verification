import { ethers } from "ethers";
import contractData from "../contracts/CredentialVerification.json";

const CONTRACT_ADDRESS =
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export async function getContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }

  const provider =
    new ethers.BrowserProvider(window.ethereum);

  const signer =
    await provider.getSigner();

  return new ethers.Contract(
    CONTRACT_ADDRESS,
    contractData.abi,
    signer
  );
}

export async function getReadOnlyContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }

  const provider =
    new ethers.BrowserProvider(window.ethereum);

  return new ethers.Contract(
    CONTRACT_ADDRESS,
    contractData.abi,
    provider
  );
}