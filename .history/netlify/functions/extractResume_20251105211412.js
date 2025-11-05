// File: netlify/functions/extractResume.js
import { writeFileSync, readFileSync } from "fs";
import path from "path";
import os from "os";
import pdf from "pdf-parse-fixed";
import mammoth from "mammoth";

/**
 * Parse multipart/form-data from Netlify event.
 * Returns { filename, filepath, contentBuffer }
 */
function parseMultipartFromEvent(event) {
  const contentType = (event.headers["content-type"] || event.headers["Content-Type"] || "");
  if (!contentType.includes("multipart/form-data")) {
    throw new Error("Content-Type is not multipart/form-data");
  }
  const boundaryMatch = contentType.match(/boundary=(.+)$/i);
  if (!boundaryMatch) throw new Error("Could not find multipart boundary");
  const boundary = `--${boundaryMatch[1].trim()}`;

  const bodyBuffer = event.isBase64Encoded ? Buffer.from(event.body, "base64") : Buffer.from(event.body, "utf8");
  const parts = bodyBuffer.toString("binary").split(boundary);

  for (let part of parts) {
    // skip prelude/epilogue parts
    if (!part || part === "--\r\n" || part === "--") continue;

    // check if this part contains filename
    const dispositionMatch = /Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/i.exec(part);
    if (dispositionMatch && dispositionMatch[2]) {
      const filename = dispositionMatch[2];
      // find start of binary content (first blank line after headers)
      const indexOfDoubleCRLF = part.indexOf("\r\n\r\n");
      if (indexOfDoubleCRLF === -1) continue;

      // content starts after that
      const rawContent = part.slice(indexOfDoubleCRLF + 4, part.lastIndexOf("\r\n"));
      // rawContent is currently a binary-string; convert to Buffer using 'binary' encoding
      const fileBuffer = Buffer.from(rawContent, "binary");

      // write to temp file
      const tmpPath = path.join(os.tmpdir(), filename);
      writeFileSync(tmpPath, fileBuffer);
      return { filename, filepath: tmpPath, contentBuffer: fileBuffer };
    }
  }
  throw new Error("No file part found in the multipart body");
}

export async function handler(event) {
  try {
    if (!event || !event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: "No body in request" }) };
    }

    const { filename, filepath, contentBuffer } = parseMultipartFromEvent(event);
    console.log("✅ File received:", { filename, filepath, size: contentBuffer.length });

    const ext = path.extname(filename).toLowerCase();
    let text = "";

    // PDF
    if (ext === ".pdf") {
      try {
        const parsed = await pdf(contentBuffer);
        text = parsed.text || "";
        if (text && text.trim().length > 0) {
          console.log("✅ Extracted text from PDF, length:", text.length);
        } else {
          console.warn("PDF parsed but no text found");
        }
      } catch (e) {
        console.warn("PDF parse failed:", e.message);
      }
    }

    // DOCX
    if (!text && (ext === ".docx" || ext === ".doc")) {
      try {
        // mammoth needs a filesystem path
        const result = await mammoth.extractRawText({ path: filepath });
        text = result.value || "";
        console.log("✅ Extracted text from DOCX, length:", text.length);
      } catch (e) {
        console.warn("DOCX parse failed:", e.message);
      }
    }

    // TXT or fallback
    if (!text && (ext === ".txt" || ext === "")) {
      try {
        text = readFileSync(filepath, "utf8");
        console.log("✅ Extracted text from TXT fallback, length:", text.length);
      } catch (e) {
        console.warn("TXT fallback failed:", e.message);
      }
    }

    // Final fallback: try to interpret buffer as utf8
    if (!text) {
      try {
        const asUtf8 = contentBuffer.toString("utf8");
        if (asUtf8 && asUtf8.trim().length > 10) {
          text = asUtf8;
          console.log("✅ Extracted text from buffer as utf8, length:", text.length);
        }
      } catch (e) {
        console.warn("Buffer->utf8 fallback failed:", e.message);
      }
    }

    if (!text || !text.trim()) {
      // If you want automatic OCR, implement Tesseract here (slower).
      // For now we return an informative error so frontend can tell user to upload text-PDF/DOCX.
      throw new Error("No readable text found (file may be image-only). Please upload a text-based PDF or DOCX.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    console.error("❌ Resume parse error:", err && err.message ? err.message : err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err && err.message ? err.message : String(err) }),
    };
  }
}
