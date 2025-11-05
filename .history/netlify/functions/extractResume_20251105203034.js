// File: netlify/functions/extractResume.js

import { readFile } from "fs/promises";
import os from "os";
import formidable from "formidable";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const config = {
  api: { bodyParser: false },
};

export async function handler(event, context) {
  return new Promise((resolve) => {
    const form = formidable({
      multiples: false,
      uploadDir: os.tmpdir(), // ✅ Allowed folder in Netlify
      keepExtensions: true,
    });

    // Parse form data manually
    form.parse(event, async (err, fields, files) => {
      if (err) {
        console.error("Form parse error:", err);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: "Error parsing form data." }),
        });
        return;
      }

      try {
        const file = files.file;
        if (!file) {
          resolve({
            statusCode: 400,
            body: JSON.stringify({ error: "No file uploaded." }),
          });
          return;
        }

        const filePath = file.filepath || file.path;
        const fileType = file.mimetype || "";

        let text = "";

        // ✅ Handle PDF files
        if (fileType.includes("pdf")) {
          const dataBuffer = await readFile(filePath);
          const parsed = await pdf(dataBuffer);
          text = parsed.text || "";
        }
        // ✅ Handle DOCX files
        else if (fileType.includes("word") || fileType.includes("docx")) {
          const result = await mammoth.extractRawText({ path: filePath });
          text = result.value || "";
        }
        // ✅ Handle plain text
        else {
          text = await readFile(filePath, "utf8");
        }

        if (!text.trim()) {
          throw new Error("No readable text found in resume file.");
        }

        // ✅ Return extracted text
        resolve({
          statusCode: 200,
          body: JSON.stringify({ text }),
        });
      } catch (error) {
        console.error("Resume parse error:", error);
        resolve({
          statusCode: 500,
          body: JSON.stringify({
            error: "Failed to read or parse the uploaded file.",
            details: error.message,
          }),
        });
      }
    });
  });
}
