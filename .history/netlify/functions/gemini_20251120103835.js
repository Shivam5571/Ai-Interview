// File: netlify/functions/gemini.js

exports.handler = async function (event, context) {
  // --- Configuration ---
  const GEMINI_MODEL = "gemini-2.5-flash"; // <<-- Yahan Model Name update kiya gaya hai

  // Frontend se bheje gaye data ko get karein
  const { history } = JSON.parse(event.body);

  // API key ko Netlify ke environment variables se securely get karein
  // Agar aapko turant project chalana hai aur naya key mil gaya hai, toh aap
  // temporary taur par yahan hardcode kar sakte hain (lekin Netlify variables
  // zaroor update kar dein aur baad mein ise hata dein).
  const apiKey = process.env.GEMINI_API_KEY;
  const apiKey = "APNI_NAYI_GEMINI_API_KEY_YAHAN_DAALEN"; // <-- TEMP hardcode option

  if (!apiKey || apiKey === "AIzaSyDoOuloCpHyUhVAI233M56CWUjNYmOzzOQ") {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key is not set or placeholder is used. Please set the GEMINI_API_KEY environment variable in Netlify." }),
    };
  }
  // --- Model aur URL Update ---
  // API URL mein model name update kiya gaya hai
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Yahan hum Google Search grounding tool bhi add kar rahe hain, jisse model ko
      // up-to-date information mil sake (optional, but good practice for grounding).
      body: JSON.stringify({ 
        contents: history, 
        generationConfig: { temperature: 0.75, topP: 1.0 },
        tools: [{ "google_search": {} }] // Live internet data use karne ke liye
      }),
    });

    if (!response.ok) {
      // Error mein status code bhi dikhana zaroori hai
      throw new Error(`API request failed with status ${response.status}. Response: ${await response.text()}`);
    }

    const result = await response.json();

    // Response ko waapis frontend par bhej dein
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};