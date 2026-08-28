import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CredentialVerificationModule = buildModule(
  "CredentialVerificationModule",
  (m) => {
    const credentialVerification = m.contract(
      "CredentialVerification"
    );

    return {
      credentialVerification,
    };
  }
);

export default CredentialVerificationModule;