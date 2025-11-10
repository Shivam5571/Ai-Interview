// File: netlify/functions/speak.js
// ⚡️ Stable ElevenLabs TTS (English + Hinglish)
// Includes timeout, text limit, clean logging, and single env var

import fetch from "node-fetch";

const MAX_CHARS = 4000; // Prevent long payload crash
const ELEVEN_TIMEOUT_MS = 25000; // 25s timeout for stability

export async function handler(event) {
  try {
    // 🧠 Parse body
    const { text = "", lang = "english" } = JSON.parse(event.body || "{}");

    if (!text.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No text provided" }),
      };
    }

    // 🔐 Load API key (from Netlify env)
    const apiKey = process.env.ELEVEN_API_KEY;
    if (!apiKey) {
      console.error("❌ Missing ELEVEN_API_KEY in environment variables");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing ELEVEN_API_KEY" }),
      };
    }

    // 🎙️ Define your voices
    const voiceIdEnglish = "w2yzW27GeWlJ26peMH9t"; // Neutral English
    const voiceIdHinglish = "KSsyodh37PbfWy29kPtx"; // Indian / Hinglish voice

    // 🧩 Voice selector
    const voiceMap = {
      english: voiceIdEnglish,
      en: voiceIdEnglish,
      hinglish: voiceIdHinglish,
      hi: voiceIdHinglish,
      hindi: voiceIdHinglish,
    };

    const chosenVoice = voiceMap[lang.toLowerCase()] || voiceIdEnglish;

    // ✂️ Shorten text if too long
    const safeText =
      text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "..." : text;

    console.log(
      `🎤 [Speak] Generating voice → Lang: ${lang}, Voice: ${chosenVoice}, Length: ${safeText.length}`
    );

    // 🕒 Timeout setup
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ELEVEN_TIMEOUT_MS);

    // 📡 ElevenLabs API request
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${chosenVoice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: safeText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.85,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    // 🚨 Handle errors from ElevenLabs
    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ ElevenLabs API Error:", response.status, errText);
      return {
        statusCode: response.status || 500,
        body: JSON.stringify({
          error: `TTS failed (${response.status}): ${errText}`,
        }),
      };
    }

    // 🔊 Convert response to audio
    const audioBuffer = await response.arrayBuffer();
    console.log(`✅ Voice generated successfully [${lang}]`);

    // 🎧 Return MP3 audio file
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
      body: Buffer.from(audioBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    if (err.name === "AbortError") {
      console.error("⏱️ ElevenLabs request timed out");
      return {
        statusCode: 504,
        body: JSON.stringify({ error: "ElevenLabs request timed out" }),
      };
    }

    console.error("💥 Voice Function Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Internal Server Error" }),
    };
  }
}
