// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CredentialVerification is Ownable {

    struct Credential {
        string credentialId;
        string studentName;
        string rollNumber;
        string studentIdentifier;
        string certificateHash;
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
        string studentName
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

    function revokeUniversity(
        address university
    ) external onlyOwner {

        authorizedUniversities[university] = false;

        emit UniversityRevoked(university);
    }

    function issueCredential(
        string memory credentialId,
        string memory studentName,
        string memory rollNumber,
        string memory studentIdentifier,
        string memory certificateHash
    ) external onlyAuthorizedUniversity {

        require(
            bytes(credentialId).length > 0,
            "Credential ID required"
        );

        require(
            !credentials[credentialId].exists,
            "Credential already exists"
        );

        credentials[credentialId] = Credential({
            credentialId: credentialId,
            studentName: studentName,
            rollNumber: rollNumber,
            studentIdentifier: studentIdentifier,
            certificateHash: certificateHash,
            university: msg.sender,
            issueDate: block.timestamp,
            revoked: false,
            exists: true
        });

        emit CredentialIssued(
            credentialId,
            msg.sender,
            studentName
        );
    }

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

    function verifyCredential(
        string memory credentialId,
        string memory certificateHash
    )
        external
        view
        returns (bool)
    {
        if (!credentials[credentialId].exists) {
            return false;
        }

        if (credentials[credentialId].revoked) {
            return false;
        }

        return keccak256(
            bytes(credentials[credentialId].certificateHash)
        ) == keccak256(
            bytes(certificateHash)
        );
    }

    function revokeCredential(
        string memory credentialId
    ) external {

        require(
            credentials[credentialId].exists,
            "Credential not found"
        );

        require(
            msg.sender == credentials[credentialId].university ||
            msg.sender == owner(),
            "Not authorized"
        );

        credentials[credentialId].revoked = true;

        emit CredentialRevoked(credentialId);
    }

    function isCredentialRevoked(
        string memory credentialId
    ) external view returns (bool) {

        require(
            credentials[credentialId].exists,
            "Credential not found"
        );

        return credentials[credentialId].revoked;
    }
}