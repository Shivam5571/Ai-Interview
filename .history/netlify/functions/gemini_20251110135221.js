// File: netlify/functions/gemini.js
// ✅ Stable Gemini 2.0 Flash API handler for Netlify (no node-fetch needed)

export async function handler(event) {
  try {
    console.log("🤖 Gemini request started...");

    // 🧠 Parse and validate request
    const body = JSON.parse(event.body || "{}");
    const history = body.history || [];

    if (!Array.isArray(history) || history.length === 0) {
      console.error("⚠️ Invalid or empty conversation history received.");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing or invalid conversation history." }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ Missing GEMINI_API_KEY in environment variables");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }),
      };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

    // 🧾 Build Gemini request payload
    const payload = {
      contents: history,
      generationConfig: {
        temperature: 0.8,
        topP: 1.0,
        topK: 40,
        maxOutputTokens: 1024,
      },
    };

    // 📡 Call Gemini API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("❌ Gemini HTTP Error:", JSON.stringify(data, null, 2));
      return {
        statusCode: response.status || 500,
        body: JSON.stringify({
          error: data.error?.message || "Gemini API request failed.",
        }),
      };
    }

    console.log("✅ Gemini responded successfully");
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("💥 Gemini Function Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
}
