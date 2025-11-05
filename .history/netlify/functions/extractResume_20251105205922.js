// File: netlify/functions/extractResume.js

import { readFileSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import pdf from "pdf-parse-fixed"; // ✅ use the fixed pdf parser
import mammoth from "mammoth";

// helper: decode base64 multipart body (simple approach)
function parseMultipartForm(event) {
  const boundary = event.headers["content-type"].split("boundary=")[1];
  const body = Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8");
  const parts = body.toString().split(`--${boundary}`);

  for (const part of parts) {
    if (part.includes("filename=")) {
      const match = /filename="([^"]+)"/.exec(part);
      const filename = match ? match[1] : "upload.bin";
      const start = part.indexOf("\r\n\r\n") + 4;
      const fileContent = part.slice(start, part.lastIndexOf("\r\n"));
      const fileBuffer = Buffer.from(fileContent, "binary");
      const tmpPath = path.join(os.tmpdir(), filename);
      writeFileSync(tmpPath, fileBuffer);
      return { filename, filepath: tmpPath };
    }
  }
  throw new Error("No file found in upload");
}

export async function handler(event) {
  try {
    const { filename, filepath } = parseMultipartForm(event);
    console.log("✅ File received:", filename, filepath);

    const ext = path.extname(filename).toLowerCase();
    let text = "";

    if (ext === ".pdf") {
      const dataBuffer = readFileSync(filepath);
      const parsed = await pdf(dataBuffer);
      text = parsed.text || "";
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: filepath });
      text = result.value || "";
    } else if (ext === ".txt") {
      text = readFileSync(filepath, "utf8");
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    if (!text.trim()) throw new Error("No readable text found (image-only PDF?)");

    return {
      statusCode: 200,
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    console.error("❌ Resume parse error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
