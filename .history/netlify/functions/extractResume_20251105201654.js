// File: netlify/functions/extractResume.js
import { readFileSync } from "fs";
import formidable from "formidable";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export const config = {
  api: { bodyParser: false },
};

export async function handler(event, context) {
  try {
    const form = formidable({ multiples: false, keepExtensions: true, uploadDir: "/tmp" });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(event, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const file = files.file;
    if (!file) {
      return { statusCode: 400, body: JSON.stringify({ error: "No file uploaded" }) };
    }

    const filePath = file.filepath || file.path;
    const fileType = file.mimetype || "";

    let text = "";

    if (fileType.includes("pdf")) {
      const pdfBuffer = readFileSync(filePath);
      const data = await pdfParse(pdfBuffer);
      text = data.text;
    } else if (fileType.includes("word") || fileType.includes("docx")) {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else {
      text = readFileSync(filePath, "utf8");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    console.error("Resume parse error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
