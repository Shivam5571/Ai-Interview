// File: netlify/functions/gemini.js

// NOTE:
// Netlify ka Node runtime agar 18+ hai to fetch global hota hai.
// Agar logs me "fetch is not defined" aaye, to ye line uncomment karo
// aur package.json me node-fetch install karo:
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

  // 🔑 Gemini API key Netlify ENV se
  // Netlify Dashboard → Site settings → Environment variables → GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error:
          "GEMINI_API_KEY is not set. Set it in Netlify environment variables.",
      }),
    };
  }

  const GEMINI_MODEL = "gemini-2.5-flash";

  // Body parse karo
  let bodyJson;
  try {
    bodyJson = JSON.parse(event.body || "{}");
  } catch (err) {
    console.error("Invalid JSON in request body:", err);
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  // Do tareeke support:
  // 1) { "prompt": "text..." }
  // 2) { "history": [ { role, parts }, ... ] }  // Gemini contents format
  const { prompt, history } = bodyJson;

  let contents;

  if (Array.isArray(history) && history.length > 0) {
    // Agar frontend already proper Gemini contents bhej raha hai
    contents = history;
  } else if (typeof prompt === "string" && prompt.trim().length > 0) {
    // Simple prompt ko Gemini contents me convert karo
    contents = [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];
  } else {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error:
          "Send either `prompt` (string) or `history` (Gemini contents array).",
      }),
    };
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.75,
          topP: 1.0,
        },
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Gemini API error:", response.status, text);
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Gemini API request failed.",
          status: response.status,
          details: text,
        }),
      };
    }

    // Direct Gemini ka JSON aage forward kar rahe hain
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: text,
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
