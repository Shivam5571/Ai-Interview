// File: netlify/functions/gemini.js
// ✅ Replaced Gemini with OpenAI ChatGPT API
// Works on free or paid OpenAI keys (model: gpt-4o-mini)

export async function handler(event) {
  try {
    console.log("🤖 ChatGPT request started...");

    const { history = [] } = JSON.parse(event.body || "{}");
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ Missing OPENAI_API_KEY");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    if (!Array.isArray(history) || history.length === 0) {
      console.warn("⚠️ Empty conversation history");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing or invalid conversation history" }),
      };
    }

    // 🧾 Convert Gemini-style messages to OpenAI format
    const messages = history.map((h) => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.parts?.map((p) => p.text).join("\n") || "",
    }));

    // 📡 Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // or "gpt-3.5-turbo" if you prefer
        messages,
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ ChatGPT API Error:", data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data.error?.message || "OpenAI request failed" }),
      };
    }

    const text =
      data.choices?.[0]?.message?.content?.trim() ||
      "I'm ready, but couldn't generate a response yet.";

    console.log("✅ ChatGPT responded successfully");
    return {
      statusCode: 200,
      body: JSON.stringify({
        candidates: [
          { content: { parts: [{ text }] } }, // same structure as Gemini
        ],
      }),
    };
  } catch (err) {
    console.error("💥 ChatGPT Function Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
}
