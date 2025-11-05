// File: netlify/functions/speak.js
// Two-voice ElevenLabs setup – English + Hinglish

export async function handler(event) {
  try {
    const { text, lang } = JSON.parse(event.body || "{}");

    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: "No text provided" }) };
    }

    const apiKey = process.env.ELEVEN_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing ELEVEN_API_KEY" }) };
    }

    // 👇  Your two voices
    const voiceIdHinglish = "pMsXgVXv3BLzUgSXRplE"; // Indian / Hinglish
    const voiceIdEnglish  = "TxGEqnHWrfWFTfGW9XjX"; // Neutral English

    // Choose based on selected language
    const chosenVoice = lang === "english" ? voiceIdEnglish : voiceIdHinglish;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${chosenVoice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.8,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ ElevenLabs API Error:", errText);
      return { statusCode: 500, body: JSON.stringify({ error: errText }) };
    }

    const audioBuffer = await response.arrayBuffer();

    console.log(`✅ ElevenLabs voice generated → ${lang}`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: Buffer.from(audioBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("🎤 Voice Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
