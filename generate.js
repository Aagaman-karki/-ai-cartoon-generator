#!/usr/bin/env node
/**
 * Quick, robust Gemini call for the "What If…?" pipeline.
 *
 * Sends one prompt to the Gemini `generateContent` endpoint, retries transient failures, and writes
 * the JSON the model returns to a file (default `animation_spec.json`).
 *
 *   node generate.js                          # default prompt → animation_spec.json
 *   node generate.js --prompt "..." --out spec.json
 *   node generate.js --list-models            # what this key can actually call (fixes 404s)
 *   node generate.js --dry-run                # print the request, send nothing
 *
 * Key, in order of precedence: GEMINI_API_KEY, GOOGLE_GENERATIVE_API_KEY, GOOGLE_API_KEY.
 * Node 18+ (global fetch). No dependencies.
 *
 * This script does not validate the result. The engine's spec generator is `generate_spec.js`,
 * which writes an `AnimationSpec` the studio can render and checks it against the schema; use that
 * for episodes. This one is the generic prompt → JSON utility.
 *
 * Endpoint (https://ai.google.dev/api/generate-content):
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * Auth is the `x-goog-api-key` header — not `?key=`, which leaks into logs and proxy URLs.
 */

const fs = require('node:fs');
const path = require('node:path');

const API_HOST = 'https://generativelanguage.googleapis.com';
/** Both versions serve `generateContent`; v1beta is where new models land first. */
const API_VERSIONS = new Set(['v1beta', 'v1']);
const apiRoot = (version) => `${API_HOST}/${version}`;

/**
 * Model IDs valid as of late 2026 (ai.google.dev/gemini-api/docs/models). Tried in order: a 404
 * means the model is not enabled for this key's project (not necessarily that it is misspelled), so
 * falling back is cheaper than failing. Gemini 2.5 is still served but restricted to projects that
 * already used it, which is why it sits last.
 */
const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];

const DEFAULT_PROMPT =
  'Write a short 15-second script and visual layout for a What If animation about the moon disappearing. Reply with JSON.';

/** Transient by definition — retry these. 400/401/403 are bugs or bad keys; retrying wastes quota. */
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

const DEFAULT_TIMEOUT_MS = 240_000;
const MAX_ATTEMPTS = 5;

const USAGE = `Usage: node generate.js [options]

  --prompt <text>      prompt to send (default: the built-in What If prompt)
  --out <path>         where to write the JSON (default: animation_spec.json in the repo root).
                       Relative paths resolve against the repo root, not the current directory,
                       so running this from studio/ still writes the same file.
  --model <id>         model to use (default: ${MODELS[0]}, then ${MODELS.slice(1).join(', ')} on 404).
                       Accepts models/x, /v1beta/models/x or a full URL; the path is stripped.
  --api-version <v>    API version to call: v1beta (default) or v1
  --list-models        list models this key can call, then exit
  --timeout <seconds>  per-attempt timeout (default: 240)
  --dry-run            print the request without sending it
  -h, --help           show this help

Key: GEMINI_API_KEY, GOOGLE_GENERATIVE_API_KEY or GOOGLE_API_KEY.`;

/**
 * Model ids reach here pasted from docs, dashboards and error messages as `models/x`, `v1beta/models/x`
 * or a whole URL. Left alone they build a doubled path (`v1beta/models/x:generateContent` on top of
 * `v1beta/models/`), which Google reports as a plain 404 "model not found" — the confusing failure
 * this script exists to prevent. Strip it down to the bare id.
 */
const normalizeModel = (value) => {
  const model = String(value ?? '')
    .trim()
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\/+/, '')
    .replace(/^v1(?:beta|alpha)?\d*\//i, '')
    .replace(/^models\//i, '')
    .replace(/:generateContent$/i, '');
  if (!model) fail('--model cannot be empty.');
  if (model.includes('/') || /\s/.test(model)) {
    fail(`--model expects a bare model id such as "${MODELS[0]}", not "${value}".`);
  }
  return model;
};

const parseArgs = (argv) => {
  const args = { prompt: DEFAULT_PROMPT, out: 'animation_spec.json', model: '', apiVersion: 'v1beta', timeoutMs: DEFAULT_TIMEOUT_MS, listModels: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--prompt') args.prompt = argv[++index] ?? '';
    else if (token === '--out') args.out = argv[++index] ?? '';
    else if (token === '--model') args.model = normalizeModel(argv[++index] ?? '');
    else if (token === '--api-version') {
      const version = String(argv[++index] ?? '').trim();
      if (!API_VERSIONS.has(version)) fail(`--api-version must be one of: ${[...API_VERSIONS].join(', ')}.`);
      args.apiVersion = version;
    }
    else if (token === '--list-models') args.listModels = true;
    else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--timeout') {
      const seconds = Number(argv[++index]);
      if (!Number.isFinite(seconds) || seconds <= 0) fail('--timeout must be a positive number of seconds.');
      args.timeoutMs = Math.round(seconds * 1000);
    } else if (token === '--help' || token === '-h') {
      console.log(USAGE);
      process.exit(0);
    } else fail(`Unknown argument "${token}".\n\n${USAGE}`);
  }
  if (!args.prompt.trim()) fail('--prompt cannot be empty.');
  if (!args.out.trim()) fail('--out cannot be empty.');
  return args;
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

const resolveKey = () => {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_API_KEY || process.env.GOOGLE_API_KEY;
  return typeof key === 'string' ? key.trim() : '';
};

const requestFor = (prompt) => ({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  // Ask for JSON so the reply can be written straight to a *.json file.
  generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
});

const log = (message) => console.error(message);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Pull a human message out of Google's error envelope, whatever shape it arrived in. */
const errorMessage = (rawBody) => {
  try {
    const parsed = JSON.parse(rawBody);
    const error = parsed?.error ?? parsed;
    const detail = Array.isArray(error?.details) ? error.details.find((d) => typeof d?.reason === 'string') : null;
    return [error?.status, error?.message].filter(Boolean).join(': ') || (detail?.reason ?? rawBody.slice(0, 300));
  } catch {
    return rawBody.slice(0, 300).replace(/\s+/g, ' ').trim() || '(empty response body)';
  }
};

/**
 * How long to wait before retrying. Google's guidance is exponential backoff with jitter; a
 * Retry-After header or a `retryDelay: "12s"` in the error body, when present, is a floor.
 */
const retryDelayMs = (headers, rawBody, attempt) => {
  const backoff = Math.min(60_000, 1_000 * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 750);
  let suggested = 0;

  const retryAfter = headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    suggested = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
  }
  if (!Number.isFinite(suggested) || suggested <= 0) {
    const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(rawBody ?? '');
    if (match) suggested = Number(match[1]) * 1000;
  }

  return Math.max(backoff + jitter, Number.isFinite(suggested) ? suggested : 0);
};

const hintFor = (status, rawBody) => {
  const message = errorMessage(rawBody);
  if (status === 404) {
    return `${message}\n  → The model is not found or not enabled for this key's project. Run: node generate.js --list-models`;
  }
  if (status === 400) return `${message}\n  → Bad request: check the prompt/payload. Retrying will not help.`;
  if (status === 401 || status === 403) {
    return (
      `${message}\n  → The key was rejected. Check it is a Gemini API key from AI Studio and that the Gemini API is\n` +
      '    enabled for its project. Note: since May 2026 new keys are service-account auth keys and\n' +
      '    unrestricted legacy "standard" keys are rejected.'
    );
  }
  if (status === 429) return `${message}\n  → Rate/quota limit. Backing off helps with per-minute limits; a daily quota needs a reset or a paid tier.`;
  if (status >= 500) return `${message}\n  → Google-side capacity failure (503 is the usual "high demand"). Retried with backoff.`;
  return message;
};

/** One request, with a hard timeout so a hung socket cannot stall the whole run. */
async function postOnce({ url, apiKey, body, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const rawBody = await response.text();
    return { ok: response.ok, status: response.status, headers: response.headers, rawBody };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retry wrapper for one model. Returns the parsed response, or throws an Error carrying `status`
 * so the caller can decide whether another model is worth trying.
 */
async function callModel({ model, apiKey, body, timeoutMs, apiVersion = 'v1beta', maxAttempts = MAX_ATTEMPTS }) {
  const url = `${apiRoot(apiVersion)}/models/${encodeURIComponent(normalizeModel(model))}:generateContent`;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let result;
    try {
      result = await postOnce({ url, apiKey, body, timeoutMs });
    } catch (error) {
      const timedOut = error?.name === 'AbortError';
      lastError = new Error(timedOut ? `timed out after ${Math.round(timeoutMs / 1000)}s` : `network error: ${error.message}`);
      lastError.status = 0;
      if (attempt === maxAttempts) throw lastError;
      const wait = retryDelayMs(null, '', attempt);
      log(`  ${model}: ${lastError.message} — retrying in ${(wait / 1000).toFixed(1)}s (attempt ${attempt + 1}/${maxAttempts})`);
      await sleep(wait);
      continue;
    }

    if (result.ok) {
      try {
        return { data: JSON.parse(result.rawBody), model };
      } catch {
        throw Object.assign(new Error('the API returned 200 but the body was not JSON'), { status: 502 });
      }
    }

    if (!RETRYABLE_STATUS.has(result.status) || attempt === maxAttempts) {
      const error = new Error(hintFor(result.status, result.rawBody));
      error.status = result.status;
      throw error;
    }

    const wait = retryDelayMs(result.headers, result.rawBody, attempt);
    log(`  ${model}: HTTP ${result.status} — retrying in ${(wait / 1000).toFixed(1)}s (attempt ${attempt + 1}/${maxAttempts})`);
    await sleep(wait);
  }

  throw lastError;
}

/** Model output can be fenced or padded with prose even in JSON mode; recover the object. */
const extractJson = (text) => {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const collectText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? '').join('').trim();
};

async function listModels(apiKey, apiVersion = 'v1beta') {
  const url = `${apiRoot(apiVersion)}/models?pageSize=1000`;
  const response = await fetch(url, { headers: { 'x-goog-api-key': apiKey } });
  const rawBody = await response.text();
  if (!response.ok) return fail(`Could not list models (HTTP ${response.status}):\n  ${hintFor(response.status, rawBody)}`);

  const data = JSON.parse(rawBody);
  const usable = (data.models ?? []).filter((model) => (model.supportedGenerationMethods ?? []).includes('generateContent'));
  if (usable.length === 0) return fail('The key authenticated, but no model reports generateContent support. Check the project/billing.');

  log(`${usable.length} model(s) available to this key:`);
  for (const model of usable) log(`  ${String(model.name ?? '').replace(/^models\//, '')}${model.displayName ? `  — ${model.displayName}` : ''}`);
  log('\nPass one with --model. Note: appearing here does not guarantee inference is enabled for the project.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = resolveKey();

  if (args.listModels) {
    if (!apiKey) fail('No API key found. Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_API_KEY / GOOGLE_API_KEY).');
    return listModels(apiKey, args.apiVersion);
  }

  const candidates = args.model ? [args.model] : MODELS;
  const body = requestFor(args.prompt);

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          wouldCall: candidates.map((model) => `${apiRoot(args.apiVersion)}/models/${model}:generateContent`),
          auth: 'x-goog-api-key: <redacted>',
          out: path.resolve(__dirname, args.out),
          body,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (!apiKey) fail('No API key found. Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_API_KEY / GOOGLE_API_KEY), or use --dry-run.');
  log(`Generating with up to ${candidates.length} model(s), ${MAX_ATTEMPTS} attempts each, ${Math.round(args.timeoutMs / 1000)}s timeout…`);

  let result;
  let lastError;
  for (const model of candidates) {
    try {
      result = await callModel({ model, apiKey, body, timeoutMs: args.timeoutMs, apiVersion: args.apiVersion });
      break;
    } catch (error) {
      lastError = error;
      // A 404 is model/project-specific: try the next ID. Anything else is not worth rotating for.
      if (error.status === 404 && model !== candidates[candidates.length - 1]) {
        log(`  ${model} unavailable (404) — trying the next model.`);
        continue;
      }
      throw Object.assign(new Error(error.message), { status: error.status, cause: error });
    }
  }
  if (!result) throw lastError ?? new Error('no model produced a response');

  const text = collectText(result.data);
  const finishReason = result.data?.candidates?.[0]?.finishReason;
  const blockReason = result.data?.promptFeedback?.blockReason;

  if (!text) {
    if (blockReason) fail(`The prompt was blocked (${blockReason}). Reword it and retry.`);
    if (finishReason === 'MAX_TOKENS') fail('The reply hit the output token limit. Ask for a smaller response or raise maxOutputTokens.');
    fail(`The model returned no text (finishReason: ${finishReason ?? 'unknown'}).\n${JSON.stringify(result.data, null, 2)}`);
  }

  const spec = extractJson(text);
  // Relative to this script (the repo root), so the file a studio or pipeline step expects is written
  // no matter which directory the command was run from.
  const outPath = path.resolve(__dirname, args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (!spec) {
    const fallback = `${outPath}.txt`;
    fs.writeFileSync(fallback, `${text}\n`);
    fail(`The model replied with non-JSON text; saved it to ${fallback}.\n  Ask for JSON explicitly, or run generate_spec.js for a validated spec.`);
  }

  fs.writeFileSync(outPath, `${JSON.stringify(spec, null, 2)}\n`);
  const usage = result.data?.usageMetadata;
  console.log(`Wrote ${outPath} (model: ${result.model})`);
  if (usage) console.log(`  tokens: ${usage.promptTokenCount ?? '?'} in / ${usage.candidatesTokenCount ?? '?'} out`);
  if (finishReason === 'MAX_TOKENS') console.warn('  ! output was truncated at the token limit — the JSON may be incomplete');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`\nGeneration failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, callModel, extractJson, requestFor, retryDelayMs, errorMessage };
