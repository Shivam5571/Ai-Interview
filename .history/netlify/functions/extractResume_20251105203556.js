// File: netlify/functions/extractResume.js
import { readFile } from "fs/promises";
import os from "os";
import formidable from "formidable";
import pdf from "pdf-parse";
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
        resolve({ statusCode: 500, body: JSON.stringify({ error: "Error parsing form" }) });
        return;
      }

      try {
        const file = files.file;
        if (!file) {
          console.error("❌ No file received");
          resolve({ statusCode: 400, body: JSON.stringify({ error: "No file uploaded" }) });
          return;
        }

        // 🪵 DEBUG INFO — will appear in Netlify Logs
        console.log("✅ File received:", {
          name: file.originalFilename,
          type: file.mimetype,
          size: file.size,
          path: file.filepath || file.path,
        });

        const filePath = file.filepath || file.path;
        const type = file.mimetype || "";
        let text = "";

        if (type.includes("pdf")) {
          const dataBuffer = await readFile(filePath);
          const pdfData = await pdf(dataBuffer);
          text = pdfData.text || "";
        } else if (type.includes("word") || type.includes("docx")) {
          const result = await mammoth.extractRawText({ path: filePath });
          text = result.value || "";
        } else if (type.includes("text") || file.originalFilename.endsWith(".txt")) {
          text = await readFile(filePath, "utf8");
        } else {
          throw new Error(`Unsupported file type: ${type}`);
        }

        if (!text.trim()) throw new Error("No text extracted.");

        console.log("✅ Text length:", text.length);

        resolve({ statusCode: 200, body: JSON.stringify({ text }) });
      } catch (error) {
        console.error("❌ Resume parse error:", error);
        resolve({
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
