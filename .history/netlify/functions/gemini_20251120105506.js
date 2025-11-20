// File: netlify/functions/gemini.js

// Agar tumhara Netlify runtime Node 18+ hai to fetch already available hoga.
// Agar "fetch is not defined" error aaye, to ye line uncomment karo aur
// project me `npm install node-fetch` kara do.
// const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  // Sirf POST allow karein
  if (event.httpMethod && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Only POST requests are allowed." }),
    };
  }

  const GEMINI_MODEL = "gemini-2.5-flash";

  // Body se prompt / history lo (jaisa tum bhejna chaho)
  let bodyJson;
  try {
    bodyJson = JSON.parse(event.body || "{}");
  } catch (err) {
    console.error("Invalid JSON:", err);
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  // Tum choose kar sakte ho:
  // 1) `prompt` string bhejna
  // 2) Ya pura `contents` array bhejna (Gemini format me)
  const { prompt, contents } = bodyJson;

  // Agar contents diya hai to wahi use karo, warna prompt se contents bana lo
  let finalContents = contents;
  if (!finalContents) {
    if (!prompt) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Either `prompt` (string) or `contents` (Gemini format) required.",
        }),
      };
    }
    finalContents = [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];
  }

  // API key env se lo
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "GEMINI_API_KEY environment variable not set in Netlify.",
      }),
    };
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: finalContents,
        generationConfig: {
          temperature: 0.75,
          topP: 1.0,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Gemini API request failed.",
          status: response.status,
          details: errorText,
        }),
      };
    }

    const result = await response.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("Error calling Gemini API:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
