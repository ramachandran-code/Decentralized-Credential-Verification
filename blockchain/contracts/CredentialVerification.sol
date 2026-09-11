// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CredentialVerification is Ownable {

    struct Credential {
        string credentialId;
        string studentName;
        string rollNumber;
        string studentEmailHash;

        // SHA-256 hash of the original certificate PDF
        string certificateHash;

        // IPFS CID of the uploaded certificate PDF
        string ipfsCid;

        address university;
        uint256 issueDate;
        bool revoked;
        bool exists;
    }

    mapping(address => bool) public authorizedUniversities;

    mapping(string => Credential) private credentials;

    event UniversityAuthorized(
        address indexed university
    );

    event UniversityRevoked(
        address indexed university
    );

    event CredentialIssued(
        string indexed credentialId,
        address indexed university,
        string studentName,
        string certificateHash,
        string ipfsCid
    );

    event CredentialRevoked(
        string indexed credentialId
    );

    constructor() Ownable(msg.sender) {}

    modifier onlyAuthorizedUniversity() {
        require(
            authorizedUniversities[msg.sender],
            "Not an authorized university"
        );
        _;
    }

    // ==================================================
    // ADMIN: AUTHORIZE UNIVERSITY
    // ==================================================

    function authorizeUniversity(
        address university
    ) external onlyOwner {

        require(
            university != address(0),
            "Invalid university address"
        );

        authorizedUniversities[university] = true;

        emit UniversityAuthorized(university);
    }

    // ==================================================
    // ADMIN: REVOKE UNIVERSITY
    // ==================================================

    function revokeUniversity(
        address university
    ) external onlyOwner {

        require(
            university != address(0),
            "Invalid university address"
        );

        authorizedUniversities[university] = false;

        emit UniversityRevoked(university);
    }

    // ==================================================
    // UNIVERSITY: ISSUE CREDENTIAL
    // ==================================================

    function issueCredential(
        string memory credentialId,
        string memory studentName,
        string memory rollNumber,
        string memory studentEmailHash,
        string memory certificateHash,
        string memory ipfsCid
    )
        external
        onlyAuthorizedUniversity
    {

        require(
            bytes(credentialId).length > 0,
            "Credential ID required"
        );

        require(
            bytes(studentName).length > 0,
            "Student name required"
        );

        require(
            bytes(rollNumber).length > 0,
            "Roll number required"
        );

        require(
            bytes(studentEmailHash).length > 0,
            "Student email hash required"
        );

        require(
            bytes(certificateHash).length > 0,
            "Certificate hash required"
        );

        require(
            !credentials[credentialId].exists,
            "Credential already exists"
        );

        credentials[credentialId] = Credential({
            credentialId: credentialId,
            studentName: studentName,
            rollNumber: rollNumber,
            studentEmailHash: studentEmailHash,
            certificateHash: certificateHash,
            ipfsCid: ipfsCid,
            university: msg.sender,
            issueDate: block.timestamp,
            revoked: false,
            exists: true
        });

        emit CredentialIssued(
            credentialId,
            msg.sender,
            studentName,
            certificateHash,
            ipfsCid
        );
    }

    // ==================================================
    // GET CREDENTIAL
    // ==================================================

    function getCredential(
        string memory credentialId
    )
        external
        view
        returns (Credential memory)
    {

        require(
            credentials[credentialId].exists,
            "Credential not found"
        );

        return credentials[credentialId];
    }

    // ==================================================
    // VERIFY CREDENTIAL HASH
    // ==================================================

    function verifyCredential(
        string memory credentialId,
        string memory certificateHash
    )
        external
        view
        returns (bool)
    {

        if (
            !credentials[credentialId].exists
        ) {
            return false;
        }

        if (
            credentials[credentialId].revoked
        ) {
            return false;
        }

        return keccak256(
            bytes(
                credentials[credentialId]
                    .certificateHash
            )
        )
        ==
        keccak256(
            bytes(certificateHash)
        );
    }

    // ==================================================
    // REVOKE CREDENTIAL
    // ==================================================

    function revokeCredential(
        string memory credentialId
    )
        external
    {

        require(
            credentials[credentialId].exists,
            "Credential not found"
        );

        require(
            msg.sender ==
                credentials[credentialId]
                    .university
            ||
            msg.sender == owner(),
            "Not authorized"
        );

        require(
            !credentials[credentialId].revoked,
            "Credential already revoked"
        );

        credentials[credentialId].revoked = true;

        emit CredentialRevoked(
            credentialId
        );
    }

    // ==================================================
    // CHECK REVOCATION STATUS
    // ==================================================

    function isCredentialRevoked(
        string memory credentialId
    )
        external
        view
        returns (bool)
    {

        require(
            credentials[credentialId].exists,
            "Credential not found"
        );

        return credentials[credentialId]
            .revoked;
    }
}