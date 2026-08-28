import { useState } from "react";
import { getReadOnlyContract } from "../utils/contract";
import { calculateFileHash } from "../utils/hash";

function VerifierDashboard() {

  const [credentialId, setCredentialId] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function verifyCertificate() {

    try {

      setLoading(true);
      setError("");
      setResult(null);

      if (!credentialId.trim()) {

        setError(
          "Please enter the Credential ID."
        );

        setLoading(false);

        return;
      }

      if (!selectedFile) {

        setError(
          "Please upload the certificate PDF."
        );

        setLoading(false);

        return;
      }

      if (
        selectedFile.type !==
        "application/pdf"
      ) {

        setError(
          "Only PDF certificates are allowed."
        );

        setLoading(false);

        return;
      }

      // Calculate SHA-256 hash
      const fileHash =
        await calculateFileHash(
          selectedFile
        );

      console.log(
        "Uploaded PDF hash:",
        fileHash
      );

      // Read blockchain
      const contract =
        await getReadOnlyContract();

      const credential =
        await contract.getCredential(
          credentialId
        );

      // Verify against blockchain
      const valid =
        await contract.verifyCredential(
          credentialId,
          fileHash
        );

      setResult({
        valid,
        credentialId:
          credential.credentialId,
        studentName:
          credential.studentName,
        rollNumber:
          credential.rollNumber,
        studentIdentifier:
          credential.studentIdentifier,
        certificateHash:
          credential.certificateHash,
        university:
          credential.university,
        issueDate:
          new Date(
            Number(
              credential.issueDate
            ) * 1000
          ).toLocaleString(),
        revoked:
          credential.revoked,
        uploadedHash:
          fileHash
      });

    } catch (err) {

      console.error(err);

      setError(
        err?.reason ||
        err?.shortMessage ||
        "Credential not found or verification failed."
      );

    } finally {

      setLoading(false);
    }
  }

  return (

    <div className="dashboard">

      <h2>
        🔎 Verifier Dashboard
      </h2>

      <p>
        Verify an academic certificate
        against blockchain records.
      </p>

      <div className="admin-section">

        <h3>
          Verify Certificate
        </h3>

        <input
          type="text"
          placeholder="Credential ID"
          value={credentialId}
          onChange={(e) =>
            setCredentialId(
              e.target.value
            )
          }
        />

        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) =>
            setSelectedFile(
              e.target.files?.[0] || null
            )
          }
        />

        <button
          className="action-button"
          onClick={
            verifyCertificate
          }
          disabled={loading}
        >
          {loading
            ? "Verifying..."
            : "Verify Certificate"}
        </button>

      </div>

      {error && (

        <div className="error">
          {error}
        </div>

      )}

      {result && (

        <div className="verification-result">

          {result.valid ? (

            <>
              <h2>
                ✅ Certificate Authentic
              </h2>

              <p>
                This certificate matches
                the blockchain record.
              </p>
            </>

          ) : (

            <>
              <h2>
                ❌ Certificate Invalid
              </h2>

              <p>
                The uploaded certificate
                does not match the blockchain.
              </p>
            </>

          )}

          <hr />

          <p>
            <strong>
              Credential ID:
            </strong>{" "}
            {result.credentialId}
          </p>

          <p>
            <strong>
              Student:
            </strong>{" "}
            {result.studentName}
          </p>

          <p>
            <strong>
              Roll Number:
            </strong>{" "}
            {result.rollNumber}
          </p>

          <p>
            <strong>
              Student Identifier:
            </strong>{" "}
            {result.studentIdentifier}
          </p>

          <p>
            <strong>
              University:
            </strong>{" "}
            {result.university}
          </p>

          <p>
            <strong>
              Issue Date:
            </strong>{" "}
            {result.issueDate}
          </p>

          <p>
            <strong>
              Revoked:
            </strong>{" "}
            {result.revoked
              ? "Yes"
              : "No"}
          </p>

          <p>
            <strong>
              Uploaded PDF Hash:
            </strong>
          </p>

          <code>
            {result.uploadedHash}
          </code>

          <p>
            <strong>
              Blockchain Hash:
            </strong>
          </p>

          <code>
            {result.certificateHash}
          </code>

        </div>

      )}

    </div>

  );
}

export default VerifierDashboard;