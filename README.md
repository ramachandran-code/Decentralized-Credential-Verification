🔐 Decentralized Credential Verification System

A blockchain-based academic credential verification system that allows universities to issue tamper-proof digital certificates and enables anyone to verify their authenticity using blockchain, IPFS, SHA-256 hashing, QR codes, and a web-based verification system.

📌 Overview
Traditional academic certificates are difficult to verify and can be forged, modified, or lost.
This project provides a decentralized solution where:
- Universities can issue digital academic credentials.
- Certificate PDFs are stored securely on IPFS.
- SHA-256 hashes are generated automatically for certificates.
- Credential metadata and certificate hashes are recorded on the blockchain.
- Students receive their credential details through email.
- A QR code is generated for every credential.
- Verifiers can scan the QR code and verify the credential.
- Certificate integrity is checked by comparing the uploaded certificate hash with the hash stored on the blockchain.
- Verification can be performed without requiring MetaMask.

✨ Features
🏫 University
- University authorization through the administrator.
- Student credential creation.
- Student name and roll number storage.
- Student email verification using OTP.
- Automatic SHA-256 certificate hashing.
- PDF certificate upload to IPFS.
- Blockchain-based credential registration.
- QR code generation.
- Verification URL generation.
- Automatic credential email delivery.

👨‍💼 Administrator
- Admin-controlled university authorization.
- Authorize universities to issue credentials.
- Revoke university authorization.
- Blockchain-based access control.

🔎 Verifier
- Verify credentials using Credential ID.
- Scan credential QR codes.
- Retrieve certificate information from blockchain.
- Retrieve certificate PDF from IPFS.
- Automatically calculate the certificate SHA-256 hash.
- Compare the calculated hash with the blockchain hash.
- Detect revoked credentials.
- No MetaMask required for read-only verification.

📧 Email
After successful credential issuance, the student receives an email containing:
- Credential ID
- Student name
- Verification QR code
- Verification URL
- IPFS certificate link

🏗️ System Architecture

<img width="1212" height="1297" alt="ChatGPT Image Sep 11, 2026, 09_50_41 AM" src="https://github.com/user-attachments/assets/e78d585e-b679-464a-b2ec-d4b4899e5fe6" />

⚙️ Installation

Clone the repository:

git clone https://github.com/ramachandran-code/Decentralized-Credential-Verification.git

🎯 Project Objective

The primary objective of this project is to create a secure, transparent, and tamper-resistant academic credential verification system.
