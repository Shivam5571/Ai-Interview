// File: netlify/functions/gemini.js

export async function handler(event) {
  try {
    const { history } = JSON.parse(event.body || "{}");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing GEMINI_API_KEY" }),
      };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: history,
        generationConfig: { temperature: 0.75, topP: 1.0 },
      }),
    });

    const data = await response.json();

    // 🧠 Validate response
    if (!data || data.error) {
      console.error("Gemini API error:", data.error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: data.error?.message || "Invalid response from Gemini API",
        }),
      };
    }

    // ✅ Return full response to frontend
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error("Server Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
