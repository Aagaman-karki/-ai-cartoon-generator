#!/usr/bin/env node
/**
 * Stage 3a of the animation engine: prompt → animation spec.
 *
 * Sends a concept to Gemini and writes a validated `AnimationSpec` JSON file that the Remotion factory
 * components can render without any new React code. The spec is then compiled by `SpecMovie` at
 * `studio/src/specs/`.
 *
 * Usage:
 *   node generate_spec.js --prompt "What if the moon vanished?" --out studio/src/specs/what-if-moon.json
 *   node generate_spec.js --prompt "..." --dry-run        # print the request, send nothing
 *   node generate_spec.js --prompt "..." --frames 3600 --scenes 6-8   # shorter cut
 *
 * Defaults: 14,400 frames (8:00 at 30fps) across 12-16 scenes, with narration and SFX cues spread
 * over the whole timeline.
 *
 * Requires Node 18+ (global fetch) for a real call, plus one model key:
 *   RESPAN_API_KEY             — sends the call through the Respan gateway's Gemini proxy, where every
 *                                generation is logged as a trace (https://platform.respan.ai).
 *   GOOGLE_GENERATIVE_API_KEY  — direct to Google, used only when RESPAN_API_KEY is empty.
 *
 * Note: this validates structure only, enough to fail fast with a readable message. The authoritative
 * schema check is `validateSpec` in studio/src/spec/validate.ts, which runs whenever the studio
 * compiles — a spec that slips past this script still cannot break a render silently.
 */

const fs = require('node:fs');
const path = require('node:path');

/**
 * Node does not read `.env` on its own, so a key copied there would be invisible to `process.env`.
 * Load `<repo>/.env` (next to this script, so the cwd does not matter) without overriding anything
 * already exported. Real environment variables always win; a blank export counts as unset.
 */
function loadDotEnv() {
  let text;
  try {
    text = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
    let value = line.slice(eq + 1).trim();
    if (value.length > 1 && (value[0] === '"' || value[0] === "'") && value.endsWith(value[0])) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

const DEFAULT_MODEL = 'gemini-3.8-flash';
const DEFAULT_TARGET_FRAMES = 14400;
const DEFAULT_SCENE_RANGE = [12, 16];

/**
 * Where the generateContent call goes. The Respan gateway exposes a Gemini SDK proxy at
 * `<api>/google/gemini`, so the request body and the response shape are identical on both routes —
 * only the base URL and the key header change.
 */
const RESPAN_API_BASE = (process.env.RESPAN_BASE_URL || 'https://api.respan.ai/api').replace(/\/+$/, '');
const GOOGLE_API_BASE = 'https://generativelanguage.googleapis.com';

const resolveEndpoint = (model) => {
  const respanKey = process.env.RESPAN_API_KEY;
  if (respanKey) {
    return {
      route: 'respan-gateway',
      // Traced by Respan: open Observability › Logs to see this generation.
      url: `${RESPAN_API_BASE}/google/gemini/v1beta/models/${model}:generateContent`,
      keyQuery: '',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': respanKey },
    };
  }
  const googleKey = process.env.GOOGLE_GENERATIVE_API_KEY;
  return {
    route: 'google-direct',
    url: `${GOOGLE_API_BASE}/v1beta/models/${model}:generateContent`,
    keyQuery: googleKey ? `?key=${encodeURIComponent(googleKey)}` : '',
    headers: { 'Content-Type': 'application/json' },
  };
};

/** Compact description of the spec contract, kept in sync with studio/src/spec/types.ts. */
const schemaBrief = (targetFrames) => `Return ONLY a JSON object with this shape:
{
  "title": string,
  "slug": string,                      // lowercase-kebab-case, unique
  "fps": 30, "width": 1920, "height": 1080,
  "theme": {
    "primaryColor": "#RRGGBB",         // focal: titles, light sources
    "secondaryColor": "#RRGGBB",       // shadows: skies, silhouettes
    "accentColor": "#RRGGBB",
    "fontFamily": "StudioSansBold"     // must be StudioSans | StudioSansBold | StudioMono
  },
  "totalDurationFrames": ${targetFrames},   // must equal the sum of scene durations
  "showNarration": false,
  "narration": [ { "frameStart": number, "text": string } ],   // frameStart is ABSOLUTE, not scene-local
  "scenes": [
    {
      "id": "scene_1",
      "type": "vector_environment",
      "durationFrames": number,
      "background": "dusk_room" | "twilight_skyline" | "floating_staircase" | "dome_interior" | "open_horizon",
      "backgroundOptions": {
        "sun": { "x": number, "y": number, "r": number, "rays": boolean },
        "seed": number, "stars": number, "dim": number, "depth": number
      },
      "camera": "static" | "slow_zoom_in" | "slow_zoom_out" | "pan_up" | "pan_down",
      "elements": [ ...see below ],
      "sfx": ["clock_tick", "pop"]     // cues that fire at this scene's absolute start frame
    }
  ]
}

Element types (coordinates are composition pixels on a 1920x1080 frame):
- { "type": "character", "x", "y", "scale"?, "action"?: "idle"|"panicked", "expression"?: "neutral"|"shocked"|"happy", "actionStart"?, "flip"? }
  "y" is the FEET position. Figures are ~320px tall before "scale".
- { "type": "text_overlay", "text", "x", "y", "eyebrow"?, "sub"?, "size"?: "hero"|"header"|"sub", "align"?, "animation"?: "spring_pop"|"fade"|"slide_up", "delay"? }
- { "type": "hud_chip", "label", "value", "x", "y", "tone"?: "gold"|"alert", "align"?, "delay"? }
- { "type": "fracture", "path": "M..L..", "strokeWidth"?, "delay"?, "revealFrames"? }
- { "type": "particles", "count"?, "seed"?, "opacity"? }
- { "type": "glow", "x", "y", "width", "height", "color"?, "intensity"? }`;

/** Rules are generated so the numbers in them always agree with the requested length. */
const directingRules = (targetFrames, [minScenes, maxScenes]) => {
  const clock = (frames) => {
    const total = Math.round(frames / 30);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  };
  const at = (frames) => `${frames.toLocaleString('en-US')} frames (${clock(frames)})`;
  const avgScene = Math.round(targetFrames / ((minScenes + maxScenes) / 2));
  // A cue roughly every 15s keeps the voice present without stepping on itself.
  const cueGap = 450;
  return `Directing rules (a long-form explainer with high retention):
1. Total length ${at(targetFrames)} at 30fps, split into ${minScenes}-${maxScenes} scenes. A scene is
   ${at(Math.round(targetFrames / maxScenes))} to ${at(targetFrames / minScenes)}; aim for about
   ${at(avgScene)} each. durationFrames must sum to EXACTLY ${targetFrames.toLocaleString('en-US')} and totalDurationFrames
   must repeat that number. A 4-scene, 60-second short is a failed response: this is an 8-minute episode.
2. Structure the whole ${clock(targetFrames)}, not just the opening: establish the premise, then escalate through consequences,
   complications and a turn, and land on a final image that answers the title. Reserve the last scene
   for the resolution — no cliffhanger padding.
3. Hook first: the first scene must contain a high-contrast pattern break inside frame 0-90 — a bold
   "hero" text_overlay that lands by frame 30, or a character beat that starts by frame 20.
4. Keep the frame readable: one hero text per scene, one hud_chip at most, and never place text over
   the character (characters live in the left third or right third; text in the opposite third).
5. Give every scene a camera move, and alternate them (e.g. slow_zoom_in, pan_up, slow_zoom_out).
6. Warm cinematic twilight palette: primary is a gold/orange highlight, secondary a deep indigo or
   navy shadow. Never put a warm primary on a warm secondary.
7. Narration must cover the FULL timeline. Compute each scene's absolute start frame by summing the
   durationFrames of every scene before it; then emit one cue per scene at that start + 12 frames,
   plus an extra cue every ~${cueGap} frames (15s) inside long scenes. This ${clock(targetFrames)} episode needs roughly
   ${Math.round(targetFrames / cueGap)}-${Math.round(targetFrames / cueGap) + 8} cues. frameStart is ABSOLUTE and must be strictly
   increasing, the first cue must be under frame 200 and the last must fall inside the final 30
   seconds. Budget the words: about 2.5 words per second of the gap before the next cue, so a cue
   never talks over the next one. Write for the ear: short, concrete, no stage directions.
8. SFX: name the sounds that carry each scene's beat in that scene's "sfx" array — they fire at the
   scene's absolute start. Use a cue from this vocabulary so the audio stage can match it:
   ${['ambience', 'clock_tick', 'pop', 'sub_drop', 'riser', 'glass_crack', 'rumble', 'alarm', 'whoosh', 'heartbeat'].join(', ')}.
   Most scenes get 0-2 cues, and no cue repeats in three consecutive scenes. Map the vocabulary to the
   story: clock_tick for time beats, pop for a sudden disappearance, sub_drop for weightless release,
   glass_crack for a sky fracture, alarm for a warning — the same beat the visuals are selling.
9. Convention for y coordinates: skyline rooftops ~898, hills ~900-1000, interiors ~906-1072.`;
};

const USAGE =
  'Usage: node generate_spec.js --prompt "concept" [--out path.json] [--frames 14400] [--scenes 12-16]' +
  ' [--dry-run] [--model id]';

/** `12-16`, `12..16` or a single `14` all mean the same thing. */
const parseSceneRange = (text) => {
  const match = /^(\d+)(?:\s*(?:-|\.\.)\s*(\d+))?$/.exec(text.trim());
  if (!match) return null;
  const min = Number(match[1]);
  const max = match[2] === undefined ? Number(match[1]) : Number(match[2]);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) return null;
  return [min, max];
};

const parseArgs = (argv) => {
  const args = {
    prompt: '',
    out: '',
    model: DEFAULT_MODEL,
    targetFrames: DEFAULT_TARGET_FRAMES,
    sceneRange: DEFAULT_SCENE_RANGE,
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--prompt') args.prompt = argv[++index] ?? '';
    else if (token === '--out') args.out = argv[++index] ?? '';
    else if (token === '--model') args.model = argv[++index] ?? DEFAULT_MODEL;
    else if (token === '--frames') {
      const frames = Number(argv[++index]);
      if (!Number.isInteger(frames) || frames < 30) {
        console.error('--frames must be a whole number of frames (at least 30).');
        process.exit(1);
      }
      args.targetFrames = frames;
    } else if (token === '--scenes') {
      const range = parseSceneRange(argv[++index] ?? '');
      if (!range) {
        console.error('--scenes must look like 12-16 (or a single count, e.g. 14).');
        process.exit(1);
      }
      args.sceneRange = range;
    } else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--help' || token === '-h') {
      console.log(USAGE);
      process.exit(0);
    }
  }
  return args;
};

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'episode';

const BACKGROUNDS = ['dusk_room', 'twilight_skyline', 'floating_staircase', 'dome_interior', 'open_horizon'];
const SFX_CUES = ['ambience', 'clock_tick', 'pop', 'sub_drop', 'riser', 'glass_crack', 'rumble', 'alarm', 'whoosh', 'heartbeat'];
const ELEMENT_TYPES = ['character', 'text_overlay', 'hud_chip', 'fracture', 'particles', 'glow'];
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Structural check: everything the renderer indexes into, nothing stylistic. */
const checkSpec = (spec) => {
  const errors = [];
  if (!spec || typeof spec !== 'object') return ['spec is not an object'];
  if (typeof spec.title !== 'string' || !spec.title.trim()) errors.push('title is required');
  if (typeof spec.slug !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(spec.slug)) errors.push('slug must be kebab-case');
  if (!spec.theme) errors.push('theme is required');
  else {
    if (!HEX.test(spec.theme.primaryColor ?? '')) errors.push('theme.primaryColor must be #RRGGBB');
    if (!HEX.test(spec.theme.secondaryColor ?? '')) errors.push('theme.secondaryColor must be #RRGGBB');
  }
  if (!Array.isArray(spec.scenes) || spec.scenes.length === 0) errors.push('scenes must be a non-empty array');
  else {
    spec.scenes.forEach((scene, index) => {
      const where = `scenes[${index}]`;
      if (!scene || typeof scene !== 'object') return errors.push(`${where} is not an object`);
      if (typeof scene.id !== 'string') errors.push(`${where}.id is required`);
      if (!Number.isFinite(scene.durationFrames) || scene.durationFrames <= 0)
        errors.push(`${where}.durationFrames must be > 0`);
      if (!BACKGROUNDS.includes(scene.background))
        errors.push(`${where}.background must be one of ${BACKGROUNDS.join(', ')}`);
      if (!Array.isArray(scene.elements)) errors.push(`${where}.elements must be an array`);
      else
        scene.elements.forEach((element, elementIndex) => {
          if (!ELEMENT_TYPES.includes(element?.type))
            errors.push(`${where}.elements[${elementIndex}].type must be one of ${ELEMENT_TYPES.join(', ')}`);
        });
    });
  }
  if (!Array.isArray(spec.narration)) errors.push('narration must be an array');
  return errors;
};

/**
 * Length and cue-coverage check. These are the failures the schema cannot see: a structurally valid
 * spec that quietly renders 40 seconds instead of 8 minutes, or an eight-minute timeline whose
 * narration stops after the first minute. Warnings, not errors — a short cut may be intentional.
 */
const checkTiming = (spec, totalFrames, { targetFrames, sceneRange: [minScenes, maxScenes] }) => {
  const warnings = [];
  const sceneCount = spec.scenes.length;
  const narration = spec.narration;
  const seconds = (frames) => `${(frames / 30).toFixed(1)}s`;
  const count = (frames) => frames.toLocaleString('en-US');

  if (sceneCount < minScenes || sceneCount > maxScenes)
    warnings.push(`expected ${minScenes}-${maxScenes} scenes, got ${sceneCount}`);

  const drift = Math.abs(totalFrames - targetFrames) / targetFrames;
  if (drift > 0.05)
    warnings.push(
      `timeline is ${count(totalFrames)} frames (${seconds(totalFrames)}), target is ${count(targetFrames)} frames (${seconds(targetFrames)}) — ` +
        `${drift > 0.5 ? 'less than half the requested length' : `${(drift * 100).toFixed(0)}% off`}`,
    );

  const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
  if (narration.length < sceneCount)
    warnings.push(`only ${plural(narration.length, 'narration cue')} for ${sceneCount} scenes — aim for one per scene`);

  const expectedCues = Math.round(targetFrames / 450);
  if (narration.length < expectedCues * 0.75)
    warnings.push(
      `narration covers ${plural(narration.length, 'cue')}; ${count(targetFrames)} frames wants about ${expectedCues} so the voice runs the whole episode`,
    );

  const lastFrame = totalFrames - 1;
  const starts = narration.map((cue) => cue.frameStart);
  if (starts.some((start, index) => index > 0 && start < starts[index - 1]))
    warnings.push('narration frameStart values are not in increasing order');
  if (starts.some((start) => start > lastFrame))
    warnings.push(`a narration cue starts after the last frame (${lastFrame})`);
  if (starts.length > 0 && Math.min(...starts) > 200)
    warnings.push(`first narration cue is at frame ${Math.min(...starts)}; the hook should be scored by frame 200`);
  if (starts.length > 0 && lastFrame - Math.max(...starts) > 900)
    warnings.push(
      `last narration cue is at frame ${Math.max(...starts)} — the final ${seconds(lastFrame - Math.max(...starts))} would be silent`,
    );

  const sfx = spec.scenes.flatMap((scene) => (Array.isArray(scene.sfx) ? scene.sfx : []));
  if (sfx.length === 0) warnings.push('no sfx cues anywhere in the spec');
  const unknown = [...new Set(sfx.filter((cue) => !SFX_CUES.includes(cue)))];
  if (unknown.length > 0) warnings.push(`sfx cues outside the vocabulary: ${unknown.join(', ')}`);

  return warnings;
};

/** Model output sometimes arrives fenced or with prose around the JSON. */
const extractJson = (text) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('model response contained no JSON object');
    return JSON.parse(candidate.slice(start, end + 1));
  }
};

const buildRequest = (prompt, targetFrames, sceneRange) => ({
  systemInstruction: {
    parts: [{ text: `You are a motion-graphics director writing a machine-renderable animation spec.\n\n${schemaBrief(targetFrames)}\n\n${directingRules(targetFrames, sceneRange)}` }],
  },
  contents: [{ role: 'user', parts: [{ text: `/no_think\nConcept: ${prompt}` }] }],
  generationConfig: { temperature: 0.9, responseMimeType: 'application/json' },
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.prompt) {
    console.error('Missing --prompt. Example: node generate_spec.js --prompt "What if gravity turned off?"');
    process.exit(1);
  }

  const slug = slugify(args.prompt);
  const out = args.out || path.join('studio', 'src', 'specs', `${slug}.json`);
  const target = { targetFrames: args.targetFrames, sceneRange: args.sceneRange };
  const request = buildRequest(args.prompt, args.targetFrames, args.sceneRange);

  if (args.dryRun) {
    const endpoint = resolveEndpoint(args.model);
    console.log(JSON.stringify({ route: endpoint.route, url: endpoint.url, out, target, request }, null, 2));
    return;
  }

  const endpoint = resolveEndpoint(args.model);
  if (endpoint.route === 'google-direct' && !process.env.GOOGLE_GENERATIVE_API_KEY) {
    console.error(
      'No model key is set — export RESPAN_API_KEY (Respan gateway, traced) or GOOGLE_GENERATIVE_API_KEY\n' +
        `(direct Google), or put one in ${path.join(__dirname, '.env')} (copy .env.example).\n` +
        'Use --dry-run to inspect the request without a key.',
    );
    process.exit(1);
  }

  const response = await fetch(`${endpoint.url}${endpoint.keyQuery}`, {
    method: 'POST',
    headers: endpoint.headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    console.error(`${endpoint.route} request failed: HTTP ${response.status} ${await response.text()}`);
    process.exit(1);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  if (!text) {
    console.error('Gemini returned no text. Full response:\n', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  let spec;
  try {
    spec = extractJson(text);
  } catch (error) {
    console.error(`Could not parse model output as JSON: ${error.message}`);
    process.exit(1);
  }

  spec.slug = spec.slug || slug;
  const errors = checkSpec(spec);
  if (errors.length > 0) {
    console.error(`Generated spec is structurally invalid:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`);
  const totalFrames = spec.scenes.reduce((sum, scene) => sum + scene.durationFrames, 0);
  const sfxCount = spec.scenes.reduce((sum, scene) => sum + (Array.isArray(scene.sfx) ? scene.sfx.length : 0), 0);

  console.log(`Wrote ${out} (route: ${endpoint.route})`);
  console.log(
    `  "${spec.title}" — ${spec.scenes.length} scenes, ${totalFrames} frames (${(totalFrames / (spec.fps ?? 30)).toFixed(1)}s), ` +
      `${spec.narration.length} narration cues, ${sfxCount} sfx cues`,
  );
  const warnings = checkTiming(spec, totalFrames, target);
  if (warnings.length > 0) {
    console.warn(`\nTiming warnings (target: ${args.targetFrames} frames in ${args.sceneRange.join('-')} scenes):`);
    warnings.forEach((warning) => console.warn(`  ! ${warning}`));
    console.warn('  Fix these in the JSON or re-run with a stronger prompt before rendering.');
  }
  console.log(`Next: import it in studio/src/specs/index.ts, then render "Spec-${spec.slug}".`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { checkSpec, checkTiming, parseSceneRange, slugify };
