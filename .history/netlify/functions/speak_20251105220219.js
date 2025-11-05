// File: netlify/functions/speak.js
// ✅ Clean, dependency-free ElevenLabs voice function

export async function handler(event) {
  try {
    const { text } = JSON.parse(event.body || "{}");
    if (!text || text.trim().length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No text provided" }) };
    }

    const apiKey = process.env.ELEVEN_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing ELEVEN_API_KEY in environment" }) };
    }

    // 👉 Replace this ID with your own custom voice ID
    const voiceId = "3AMU7jXQuQa3oRvRqUmb"; // <-- your custom ID here

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2", // handles Hinglish
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
      const errTxt = await response.text();
      console.error("❌ ElevenLabs API error:", errTxt);
      return { statusCode: 500, body: JSON.stringify({ error: errTxt }) };
    }

    const audioBuffer = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: { "Content-Type": "audio/mpeg" },
      body: Buffer.from(audioBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("🎤 ElevenLabs Voice Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
