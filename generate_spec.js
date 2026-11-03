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
 *
 * Requires Node 18+ (global fetch) and GOOGLE_GENERATIVE_API_KEY for a real call.
 *
 * Note: this validates structure only, enough to fail fast with a readable message. The authoritative
 * schema check is `validateSpec` in studio/src/spec/validate.ts, which runs whenever the studio
 * compiles — a spec that slips past this script still cannot break a render silently.
 */

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_MODEL = 'gemini-3.8-flash';

/** Compact description of the spec contract, kept in sync with studio/src/spec/types.ts. */
const SCHEMA_BRIEF = `Return ONLY a JSON object with this shape:
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
  "showNarration": false,
  "narration": [ { "frameStart": number, "text": string } ],
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
      "sfx": [string]
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

const DIRECTING_RULES = `Directing rules (a vertical explainer with high retention):
1. Total length 1,200-1,800 frames at 30fps (40-60s), split into 3-5 scenes.
2. Hook first: the first scene must contain a high-contrast pattern break inside frame 0-90 — a bold
   "hero" text_overlay that lands by frame 30, or a character beat that starts by frame 20.
3. Keep the frame readable: one hero text per scene, one hud_chip at most, and never place text over
   the character (characters live in the left third or right third; text in the opposite third).
4. Give every scene a camera move, and alternate them (e.g. slow_zoom_in, pan_up, slow_zoom_out).
5. Warm cinematic twilight palette: primary is a gold/orange highlight, secondary a deep indigo or
   navy shadow. Never put a warm primary on a warm secondary.
6. Narration: one sentence per scene, frameStart at or just after that scene's first frame, written
   for the ear (short, concrete, no stage directions).
7. Convention for y coordinates: skyline rooftops ~898, hills ~900-1000, interiors ~906-1072.`;

const parseArgs = (argv) => {
  const args = { prompt: '', out: '', model: DEFAULT_MODEL, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--prompt') args.prompt = argv[++index] ?? '';
    else if (token === '--out') args.out = argv[++index] ?? '';
    else if (token === '--model') args.model = argv[++index] ?? DEFAULT_MODEL;
    else if (token === '--dry-run') args.dryRun = true;
    else if (token === '--help' || token === '-h') {
      console.log('Usage: node generate_spec.js --prompt "concept" [--out path.json] [--dry-run] [--model id]');
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

const buildRequest = (prompt) => ({
  systemInstruction: {
    parts: [{ text: `You are a motion-graphics director writing a machine-renderable animation spec.\n\n${SCHEMA_BRIEF}\n\n${DIRECTING_RULES}` }],
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
  const request = buildRequest(args.prompt);

  if (args.dryRun) {
    console.log(JSON.stringify({ url: `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent`, out, request }, null, 2));
    return;
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_GENERATIVE_API_KEY is not set — export it, or use --dry-run to inspect the request.');
    process.exit(1);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) },
  );

  if (!response.ok) {
    console.error(`Gemini request failed: HTTP ${response.status} ${await response.text()}`);
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

  console.log(`Wrote ${out}`);
  console.log(`  "${spec.title}" — ${spec.scenes.length} scenes, ${totalFrames} frames (${(totalFrames / (spec.fps ?? 30)).toFixed(1)}s)`);
  console.log(`Next: import it in studio/src/specs/index.ts, then render "Spec-${spec.slug}".`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
