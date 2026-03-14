"use client";

import { useState } from "react";

export default function TestUploadPage() {
  const [status, setStatus] = useState("Ready — click the button to select a file");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setStatus("No file selected");
      return;
    }

    setStatus(`Selected: ${file.name} (${(file.size / 1024).toFixed(0)}KB, ${file.type})`);

    // Test 1: Can we read the file?
    try {
      const buffer = await file.arrayBuffer();
      setStatus((s) => s + `\nFile read OK (${buffer.byteLength} bytes)`);
    } catch (err) {
      setStatus((s) => s + `\nFile read FAILED: ${err}`);
      return;
    }

    // Test 2: Try uploading via API
    setStatus((s) => s + "\nUploading via /api/upload...");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setStatus((s) => s + `\nUpload SUCCESS: ${data.url}`);
        setImageUrl(data.url);
      } else {
        setStatus((s) => s + `\nUpload FAILED (${res.status}): ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setStatus((s) => s + `\nUpload ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto", fontFamily: "monospace" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Upload Test</h1>

      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "block", marginBottom: "1rem", padding: "0.5rem", border: "2px solid #ccc", borderRadius: "8px", width: "100%" }}
      />

      <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: "1rem", borderRadius: "8px", fontSize: "0.85rem" }}>
        {status}
      </pre>

      {imageUrl && (
        <div style={{ marginTop: "1rem" }}>
          <p>Uploaded image:</p>
          <img src={imageUrl} alt="Uploaded" style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid #ccc" }} />
        </div>
      )}
    </div>
  );
}
