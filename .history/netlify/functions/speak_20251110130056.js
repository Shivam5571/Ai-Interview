// File: netlify/functions/speak.js
// Stable ElevenLabs TTS handler (English + Hinglish)
// Includes timeout, long-text protection, flexible env vars, and detailed logging

import fetch from "node-fetch";

const MAX_CHARS = 4500;           // Limit text size
const ELEVEN_TIMEOUT_MS = 25000;  // 25-second timeout

export async function handler(event) {
  try {
    // 🧩 Parse incoming data
    const payload = JSON.parse(event.body || "{}");
    const text = (payload.text || "").trim();
    let lang = (payload.lang || "").toString().toLowerCase();

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No text provided" }),
      };
    }

    // 🧠 Load API key (try multiple env variable names)
    const apiKey =
      process.env.ELEVEN_API_KEY ||
      process.env.ELEVENLABS_API_KEY ||
      process.env.ELEVENLABS_KEY ||
      process.env.ELEVEN_KEY;

    if (!apiKey) {
      console.error("❌ Missing ElevenLabs API key");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing ElevenLabs API key" }),
      };
    }

    // 🎙️ Define your voices
    const voiceIdEnglish = "w2yzW27GeWlJ26peMH9t"; // English voice ID
    const voiceIdHinglish = "KSsyodh37PbfWy29kPtx"; // Hinglish (Indian) voice ID

    // 🧩 Map possible lang values to correct voices
    const voiceMap = {
      english: voiceIdEnglish,
      en: voiceIdEnglish,
      hinglish: voiceIdHinglish,
      hi: voiceIdHinglish,
      hindi: voiceIdHinglish,
    };

    const chosenVoice = voiceMap[lang] || voiceIdEnglish;

    // ✂️ Truncate text if too long
    const finalText =
      text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "..." : text;

    // 🕒 Timeout setup
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ELEVEN_TIMEOUT_MS);

    const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${chosenVoice}`;

    const body = {
      text: finalText,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8,
        style: 0.3,
        use_speaker_boost: true,
      },
    };

    console.log(
      `[🎤 speak] Request → lang: ${lang || "default(english)"}, voice: ${chosenVoice}, chars: ${finalText.length}`
    );

    // 📡 Call ElevenLabs API
    const response = await fetch(elevenUrl, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 🚨 Handle ElevenLabs errors
    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ ElevenLabs API Error:", response.status, errText);
      return {
        statusCode: response.status || 500,
        body: JSON.stringify({ error: errText || "ElevenLabs failed" }),
      };
    }

    // 🔊 Convert response to audio
    const audioBuffer = await response.arrayBuffer();
    console.log(`✅ ElevenLabs voice generated successfully [${lang}]`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: Buffer.from(audioBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    // ⏱️ Timeout or internal error handling
    if (err.name === "AbortError") {
      console.error("⏱️ ElevenLabs request timed out");
      return {
        statusCode: 504,
        body: JSON.stringify({ error: "ElevenLabs request timed out" }),
      };
    }

    console.error("🎤 Voice Function Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unknown error" }),
    };
  }
}
