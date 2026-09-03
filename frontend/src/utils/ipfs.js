export async function uploadToIPFS(file) {
  if (!file) {
    throw new Error("No certificate file selected.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Please select a PDF certificate.");
  }

  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    "http://localhost:5050/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "IPFS server returned an invalid response."
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(
      data?.message ||
      "Failed to upload certificate to IPFS."
    );
  }

  if (!data.cid) {
    throw new Error(
      "IPFS upload succeeded but no CID was returned."
    );
  }

  return {
    cid: data.cid,
    ipfsUrl: data.ipfsUrl || "",
    fileName: data.fileName || file.name,
  };
}