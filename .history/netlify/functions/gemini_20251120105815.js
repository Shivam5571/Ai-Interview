// File: netlify/functions/gemini.js

// const fetch = require("node-fetch"); // Uncomment only if Netlify log says: fetch is not defined

exports.handler = async function (event, context) {
  // Sirf POST allow
  if (event.httpMethod && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Only POST requests are allowed." }),
    };
  }

  // 🔐  👇 YAHAN APNI REAL GEMINI API KEY LIKH DO
  const apiKey = "AIzaSyDoOuloCpHyUhVAI233M56CWUjNYmOzzOQ";  // <-- CHANGE THIS

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key missing in function code!" }),
    };
  }

  const GEMINI_MODEL = "gemini-2.5-flash";

  // Request body parse
  let bodyJson;
  try {
    bodyJson = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON sent." }),
    };
  }

  const { prompt, contents } = bodyJson;

  // Agar prompt nahi mile aur contents bhi nahi mile to error
  let finalContents = contents;
  if (!finalContents) {
    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Either send `prompt` or `contents`.",
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

  // Gemini REST API Endpoint
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

    const text = await response.text();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: text }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
