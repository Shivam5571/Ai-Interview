// File: netlify/functions/extractResume.js

import { writeFileSync } from "fs";
import os from "os";
import path from "path";
import pdf from "pdf-parse-fixed";
import mammoth from "mammoth";
import { parseMultipartFormData } from "@netlify/functions";

// ✅ Netlify automatically parses multipart forms via this helper
export async function handler(event) {
  try {
    const { files } = await parseMultipartFormData(event);
    const file = files.file;
    if (!file) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No file uploaded." }),
      };
    }

    // Save file temporarily in /tmp
    const tmpPath = path.join(os.tmpdir(), file.filename);
    writeFileSync(tmpPath, file.content);

    const ext = path.extname(file.filename).toLowerCase();
    let text = "";

    if (ext === ".pdf") {
      const parsed = await pdf(file.content);
      text = parsed.text || "";
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: tmpPath });
      text = result.value || "";
    } else if (ext === ".txt") {
      text = file.content.toString("utf8");
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    if (!text.trim()) {
      throw new Error("No readable text found (may be image-only).");
    }

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
