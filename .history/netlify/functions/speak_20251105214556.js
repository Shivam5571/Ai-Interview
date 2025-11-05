// netlify/functions/speak.js
import fetch from "node-fetch";


export async function handler(event) {
  try {
    const { text } = JSON.parse(event.body);

    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: "No text provided" }) };
    }

    const response = await fetch(
      "https://elevenlabs.io/app/voice-library?voiceId=1qEiC6qsybMkmnNdVMbK", // You can replace this with your preferred voice ID
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2", // supports Hinglish
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
      throw new Error(`ElevenLabs API Error: ${errText}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
      body: Buffer.from(audioBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("🎤 ElevenLabs Voice Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
