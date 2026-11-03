const fs = require('fs');
const path = require('path');

/**
 * Loads .env file if present in the current working directory or repository root.
 */
function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            let value = trimmed.slice(eqIdx + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      } catch (err) {
        // Silently continue if reading fails
      }
    }
  }
}

/**
 * Generates an animation script using Google Gemini API.
 *
 * @param {Object} options
 * @param {string} [options.prompt] - Prompt describing what cartoon animation script to generate.
 * @param {string} [options.apiKey] - Google Generative API key (defaults to GOOGLE_GENERATIVE_API_KEY env var).
 * @param {string} [options.model] - Gemini model identifier.
 * @param {string} [options.outputPath] - Optional file path to write JSON output.
 * @param {boolean} [options.fetchFn] - Custom fetch function for testing.
 * @returns {Promise<Object>} The API response payload.
 */
async function generateCartoonScript(options = {}) {
  loadEnv();

  const apiKey = options.apiKey || process.env.GOOGLE_GENERATIVE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API key. Please set the GOOGLE_GENERATIVE_API_KEY environment variable or pass --key=<API_KEY>."
    );
  }

  const prompt = options.prompt ||
    "Write a short 15-second script and visual layout for a What If animation about the moon disappearing.";
  const model = options.model || process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const fetchFn = options.fetchFn || globalThis.fetch;

  if (typeof fetchFn !== 'function') {
    throw new Error("globalThis.fetch is not available. Please use Node.js 18+ or provide a custom fetch function.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Gemini API request failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  if (options.outputPath) {
    const resolvedPath = path.resolve(process.cwd(), options.outputPath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Saved generated script to: ${resolvedPath}`);
  }

  return data;
}

/**
 * CLI runner when executed directly.
 */
async function cli() {
  const args = process.argv.slice(2);
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--key=')) {
      options.apiKey = arg.slice(6);
    } else if (arg.startsWith('--model=')) {
      options.model = arg.slice(8);
    } else if (arg.startsWith('--output=')) {
      options.outputPath = arg.slice(9);
    } else if (arg.startsWith('--prompt=')) {
      options.prompt = arg.slice(9);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
AI Cartoon Generator - Script Generator

Usage:
  node generate.js [options]

Options:
  --key=<KEY>       Google Generative Language API key
  --model=<MODEL>   Model name (default: gemini-1.5-flash)
  --output=<PATH>   Save response to a JSON file (e.g. --output=cartoon_script.json)
  --prompt=<TEXT>   Custom animation script prompt
  -h, --help        Show this help message

Environment variables:
  GOOGLE_GENERATIVE_API_KEY   API Key for Google Gemini
  GEMINI_MODEL                Override model name
`);
      process.exit(0);
    }
  }

  console.log("Generating animation script...");
  const result = await generateCartoonScript(options);
  console.log("RESULT:\n", JSON.stringify(result, null, 2));
}

if (require.main === module) {
  cli().catch((err) => {
    console.error("Error generating cartoon script:", err.message);
    process.exit(1);
  });
}

module.exports = {
  loadEnv,
  generateCartoonScript
};
