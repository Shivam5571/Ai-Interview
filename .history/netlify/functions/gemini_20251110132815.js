// File: netlify/functions/gemini.js
// ⚡️ Stable Gemini API handler with timeout + validation + safe output

const GEMINI_MODEL = "gemini-2.0-flash-exp"; // You can use any available model
const TIMEOUT_MS = 15000; // 15s timeout for demo stability
const MAX_HISTORY_SIZE = 50000; // To avoid oversized payloads

export async function handler(event) {
  try {
    const { history = [] } = JSON.parse(event.body || "{}");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ Missing GEMINI_API_KEY");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }),
      };
    }

    // ✂️ Prevent overly large input (Gemini may reject big payloads)
    const safeHistory = JSON.stringify(history);
    const trimmedHistory =
      safeHistory.length > MAX_HISTORY_SIZE
        ? JSON.parse(safeHistory.slice(0, MAX_HISTORY_SIZE))
        : history;

    // 🌐 API URL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    // ⏱️ Timeout setup
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // 🧠 Request payload
    const body = {
      contents: trimmedHistory,
      generationConfig: { temperature: 0.75, topP: 1.0 },
    };

    console.log("🤖 Gemini request started...");

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 🧩 Parse response safely
    const data = await response.json().catch(() => null);

    if (!response.ok || !data) {
      console.error("❌ Gemini HTTP Error:", response.status, data);
      return {
        statusCode: response.status || 500,
        body: JSON.stringify({
          error: data?.error?.message || "Gemini request failed",
        }),
      };
    }

    // 🧠 Extract clean text (Gemini response structure check)
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      data.output_text ||
      "";

    if (!text) {
      console.warn("⚠️ Gemini returned empty text");
      return {
        statusCode: 200,
        body: JSON.stringify({
          text: "I'm ready, but couldn't generate a valid response yet.",
        }),
      };
    }

    console.log("✅ Gemini responded successfully");
    return {
      statusCode: 200,
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    if (err.name === "AbortError") {
      console.error("⏱️ Gemini request timed out");
      return {
        statusCode: 504,
        body: JSON.stringify({ error: "Gemini request timed out" }),
      };
    }

    console.error("💥 Gemini Function Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
}
