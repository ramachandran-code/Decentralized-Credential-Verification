import { expect } from "chai";
import hre from "hardhat";

describe("CredentialVerification", function () {

  async function deployContract() {

    const { ethers } = await hre.network.connect();

    const [owner, university, unauthorizedUser, verifier] =
      await ethers.getSigners();

    const CredentialVerification =
      await ethers.getContractFactory("CredentialVerification");

    const contract =
      await CredentialVerification.deploy();

    await contract.waitForDeployment();

    return {
      contract,
      owner,
      university,
      unauthorizedUser,
      verifier
    };
  }

  describe("University Authorization", function () {

    it("should make the deployer the owner", async function () {

      const {
        contract,
        owner
      } = await deployContract();

      expect(
        await contract.owner()
      ).to.equal(owner.address);
    });


    it("should allow admin to authorize a university", async function () {

      const {
        contract,
        owner,
        university
      } = await deployContract();

      await contract
        .connect(owner)
        .authorizeUniversity(university.address);

      expect(
        await contract.authorizedUniversities(
          university.address
        )
      ).to.equal(true);
    });


    it("should allow admin to revoke a university", async function () {

      const {
        contract,
        owner,
        university
      } = await deployContract();

      await contract
        .connect(owner)
        .authorizeUniversity(university.address);

      await contract
        .connect(owner)
        .revokeUniversity(university.address);

      expect(
        await contract.authorizedUniversities(
          university.address
        )
      ).to.equal(false);
    });

  });


  describe("Credential Issuance", function () {

    it("should prevent unauthorized users from issuing credentials", async function () {

      const {
        contract,
        unauthorizedUser
      } = await deployContract();

      await expect(

        contract
          .connect(unauthorizedUser)
          .issueCredential(
            "CRED-001",
            "Ram",
            "21AI001",
            "STU001",
            "abc123hash"
          )

      ).to.be.revertedWith(
        "Not an authorized university"
      );

    });


    it("should allow an authorized university to issue a credential", async function () {

      const {
        contract,
        owner,
        university
      } = await deployContract();

      await contract
        .connect(owner)
        .authorizeUniversity(
          university.address
        );

      await contract
        .connect(university)
        .issueCredential(
          "CRED-001",
          "Ram",
          "21AI001",
          "STU001",
          "abc123hash"
        );

      const credential =
        await contract.getCredential(
          "CRED-001"
        );

      expect(
        credential.studentName
      ).to.equal("Ram");

      expect(
        credential.rollNumber
      ).to.equal("21AI001");

      expect(
        credential.studentIdentifier
      ).to.equal("STU001");

      expect(
        credential.certificateHash
      ).to.equal("abc123hash");

      expect(
        credential.university
      ).to.equal(university.address);

      expect(
        credential.revoked
      ).to.equal(false);

      expect(
        credential.exists
      ).to.equal(true);
    });


    it("should reject duplicate credential IDs", async function () {

      const {
        contract,
        owner,
        university
      } = await deployContract();

      await contract
        .connect(owner)
        .authorizeUniversity(
          university.address
        );

      await contract
        .connect(university)
        .issueCredential(
          "CRED-001",
          "Ram",
          "21AI001",
          "STU001",
          "abc123hash"
        );

      await expect(

        contract
          .connect(university)
          .issueCredential(
            "CRED-001",
            "Another Student",
            "21AI002",
            "STU002",
            "xyz789hash"
          )

      ).to.be.revertedWith(
        "Credential already exists"
      );

    });

  });


  describe("Credential Verification", function () {

    it("should verify a credential with the correct certificate hash", async function () {

      const {
        contract,
        owner,
        university,
        verifier
      } = await deployContract();

      await contract
        .connect(owner)
        .authorizeUniversity(
          university.address
        );

      await contract
        .connect(university)
        .issueCredential(
          "CRED-001",
          "Ram",
          "21AI001",
          "STU001",
          "abc123hash"
        );

      const result =
        await contract
          .connect(verifier)
          .verifyCredential(
            "CRED-001",
            "abc123hash"
          );

      expect(result).to.equal(true);
    });


    it("should reject a credential with an incorrect certificate hash", async function () {

      const {
        contract,
        owner,
        university,
        verifier
      } = await deployContract();

      await contract
        .connect(owner)
        .authorizeUniversity(
          university.address
        );

      await contract
        .connect(university)
        .issueCredential(
          "CRED-001",
          "Ram",
          "21AI001",
          "STU001",
          "abc123hash"
        );

      const result =
        await contract
          .connect(verifier)
          .verifyCredential(
            "CRED-001",
            "WRONG-HASH"
          );

      expect(result).to.equal(false);
    });


    it("should return false for a nonexistent credential", async function () {

      const {
        contract,
        verifier
      } = await deployContract();

      const result =
        await contract
          .connect(verifier)
          .verifyCredential(
            "DOES-NOT-EXIST",
            "abc123hash"
          );

      expect(result).to.equal(false);
    });

  });


  describe("Credential Revocation", function () {

    it("should allow the university to revoke its credential", async function () {

      const {
        contract,
        owner,
        university
      } = await deployContract();

      await contract
        .connect(owner)
        .authorizeUniversity(
          university.address
        );

      await contract
        .connect(university)
        .issueCredential(
          "CRED-001",
          "Ram",
          "21AI001",
          "STU001",
          "abc123hash"
        );

      await contract
        .connect(university)
        .revokeCredential(
          "CRED-001"
        );

      expect(
        await contract.isCredentialRevoked(
          "CRED-001"
        )
      ).to.equal(true);

    });


    it("should prevent verification of a revoked credential", async function () {

      const {
        contract,
        owner,
        university,
        verifier
      } = await deployContract();

      await contract
        .connect(owner)
        .authorizeUniversity(
          university.address
        );

      await contract
        .connect(university)
        .issueCredential(
          "CRED-001",
          "Ram",
          "21AI001",
          "STU001",
          "abc123hash"
        );

      await contract
        .connect(university)
        .revokeCredential(
          "CRED-001"
        );

      const result =
        await contract
          .connect(verifier)
          .verifyCredential(
            "CRED-001",
            "abc123hash"
          );

      expect(result).to.equal(false);
    });

  });

});