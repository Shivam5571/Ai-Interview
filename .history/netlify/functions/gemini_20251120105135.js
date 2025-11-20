// File: netlify/functions/gemini.js

// (Optional) Agar aapka Netlify runtime Node 18 se purana hai,
// to ye line rakho. Node 18+ mein global fetch mil jata hai.
// const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  // --- Sirf POST allow karein (frontend se POST aana chahiye) ---
  if (event.httpMethod && event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Only POST requests are allowed." }),
    };
  }

  // --- Configuration ---
  const GEMINI_MODEL = "gemini-2.5-flash";

  // --- Body safely parse karein ---
  let history;
  try {
    const body = JSON.parse(event.body || "{}");
    history = body.history;

    if (!history) {
      throw new Error("`history` field missing in request body.");
    }
  } catch (err) {
    console.error("Error parsing request body:", err);
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: "Invalid JSON body or missing `history`." }),
    };
  }

  // --- API key env se lein ---
  const apiKey = process.env.GEMINI_API_KEY;
  // const apiKey = "APNI_NAYI_GEMINI_API_KEY_YAHAN_DAALEN"; // TEMP (only for local testing)

  if (!apiKey || apiKey === "AIzaSyDoOuloCpHyUhVAI233M56CWUjNYmOzzOQ") {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error:
          "API key is not set or placeholder is used. Please set GEMINI_API_KEY in Netlify env vars.",
      }),
    };
  }

  // --- Gemini API URL ---
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // 👇 Abhi ke liye tools (google_search) hata diye hain,
      // kyunki wrong format ya unsupported tool ka error aa sakta hai.
      body: JSON.stringify({
        contents: history,
        generationConfig: {
          temperature: 0.75,
          topP: 1.0,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Gemini API error:",
        response.status,
        response.statusText,
        errorText
      );
      throw new Error(
        `API request failed with status ${response.status}. Response: ${errorText}`
      );
    }

    const result = await response.json();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
