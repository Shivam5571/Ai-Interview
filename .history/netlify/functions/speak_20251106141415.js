// File: netlify/functions/speak.js
import fetch from "node-fetch";

export async function handler(event) {
  try {
    const { text, lang } = JSON.parse(event.body || "{}");

    if (!text || text.trim() === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing text input" }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    // 🎙 Select voice based on language
    const voice = lang === "english" ? "alloy" : "verse"; // alloy = natural English, verse = soft Hinglish tone

    // 🔗 OpenAI TTS API
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input: text,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI TTS error:", err);
      throw new Error("OpenAI request failed: " + response.status);
    }

    // 🔊 Convert to audio
    const audio = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: Buffer.from(audio).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error("Speak API Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
