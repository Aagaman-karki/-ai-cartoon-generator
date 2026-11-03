/**
 * Script generator for the "What If…?" cartoon pipeline.
 *
 * Sends one hard-coded prompt to the Google Gemini `generateContent` endpoint and prints the raw
 * JSON response to stdout (prefixed with `RESULT:`). The Markdown storyboard it returns is what
 * ends up in cartoon_script.json; this script never writes that file itself.
 *
 * Requires Node 18+ (global fetch) and GOOGLE_GENERATIVE_API_KEY.
 * Usage: node generate.js   (or: node generate.js > out.json)
 */

// Model and prompt are the two knobs for a new episode.
const apiKey = process.env.GOOGLE_GENERATIVE_API_KEY;

async function run() {
  console.log("Generating animation script...");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Write a short 15-second script and visual layout for a What If animation about the moon disappearing." }] }]
    })
  });
  const data = await response.json();
  console.log("RESULT:\n", JSON.stringify(data, null, 2));
}

run().catch(console.error);
