// File: netlify/functions/extractResume.js

import { readFile } from "fs/promises";
import path from "path";
import os from "os";
import formidable from "formidable";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function handler(event, context) {
  return new Promise((resolve) => {
    const form = formidable({
      multiples: false,
      uploadDir: os.tmpdir(), // ✅ Netlify allows writing only in /tmp
      keepExtensions: true,
    });

    form.parse(event, async (err, fields, files) => {
      if (err) {
        console.error("Form parse error:", err);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: "Error parsing form data" }),
        });
        return;
      }

      try {
        const file = files.file;
        if (!file) {
          resolve({
            statusCode: 400,
            body: JSON.stringify({ error: "No file uploaded" }),
          });
          return;
        }

        const filePath = file.filepath || file.path;
        const fileType = file.mimetype || "";

        let text = "";

        if (fileType.includes("pdf")) {
          // ✅ Handle PDF
          const buffer = await readFile(filePath);
          const data = await pdfParse(buffer);
          text = data.text;
        } else if (fileType.includes("word") || fileType.includes("docx")) {
          // ✅ Handle Word (DOCX)
          const result = await mammoth.extractRawText({ path: filePath });
          text = result.value;
        } else {
          // ✅ Handle Plain Text
          text = await readFile(filePath, "utf8");
        }

        if (!text.trim()) {
          throw new Error("No readable text found in resume.");
        }

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
