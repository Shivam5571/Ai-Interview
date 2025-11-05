// File: netlify/functions/extractResume.js

import { readFile } from "fs/promises";
import os from "os";
import formidable from "formidable";
import pdf from "pdf-parse-fixed";
import mammoth from "mammoth";

export const config = { api: { bodyParser: false } };

export async function handler(event, context) {
  return new Promise((resolve) => {
    const form = formidable({
      multiples: false,
      uploadDir: os.tmpdir(),
      keepExtensions: true,
    });

    form.parse(event, async (err, fields, files) => {
      if (err) {
        console.error("❌ Form parse error:", err);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ error: "Error parsing form data." }),
        });
      }

      try {
        const file = files.file;
        if (!file) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: "No file uploaded." }),
          });
        }

        const filePath = file.filepath || file.path;
        const fileType = (file.mimetype || "").toLowerCase();
        let text = "";

        console.log("📄 Uploaded file info:", {
          name: file.originalFilename,
          type: fileType,
          size: file.size,
          path: filePath,
        });

        // --- 1️⃣ Try PDF
        try {
          const dataBuffer = await readFile(filePath);
          const parsed = await pdf(dataBuffer);
          if (parsed.text && parsed.text.trim().length > 10) {
            text = parsed.text;
            console.log("✅ Extracted text from PDF");
          }
        } catch (e) {
          console.warn("PDF parse failed:", e.message);
        }

        // --- 2️⃣ Try DOCX
        if (!text) {
          try {
            const result = await mammoth.extractRawText({ path: filePath });
            if (result.value && result.value.trim().length > 10) {
              text = result.value;
              console.log("✅ Extracted text from DOCX");
            }
          } catch (e) {
            console.warn("DOCX parse failed:", e.message);
          }
        }

        // --- 3️⃣ Try Plain Text
        if (!text) {
          try {
            text = await readFile(filePath, "utf8");
            console.log("✅ Extracted plain text");
          } catch (e) {
            console.warn("TXT read failed:", e.message);
          }
        }

        // --- 4️⃣ If still empty, fail
        if (!text.trim()) {
          throw new Error("No readable text found in file. It may be image-only.");
        }

        return resolve({
          statusCode: 200,
          body: JSON.stringify({ text }),
        });
      } catch (error) {
        console.error("❌ Resume parse error:", error.message);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({
            error: "Failed to read or parse file.",
            details: error.message,
          }),
        });
      }
    });
  });
}
