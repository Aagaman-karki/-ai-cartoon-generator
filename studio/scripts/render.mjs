#!/usr/bin/env node
/**
 * `npm run render` — compile whatever spec the pipeline generated.
 *
 *   cd studio && npm run render                     # ../animation_spec.json → out/<slug>.mp4
 *   cd studio && npm run render -- ../other.json    # any spec file
 *   cd studio && npm run render -- ../s.json --frames=0-59
 *
 * The spec is passed to Remotion as `--props`, which is what the `Spec-External` composition reads
 * (and validates in `calculateMetadata`). Nothing has to be imported into `src/specs/index.ts`, and
 * no path has to be rewritten between the generate step and the render step — the file lives at the
 * repo root and this script resolves it from its own location, so it works from any directory.
 *
 * With no spec present it renders the hand-authored reference cut instead of failing, so `npm run
 * render` works on a fresh clone before anything has been generated.
 *
 * Before rendering, the spec is scored: `scripts/spec_audio.py` writes a voice clip per narration cue,
 * an ambience bed and a sting per `sfx` tag, then updates `src/spec/audio/manifest.json`, which
 * `SpecMovie` imports. Pass `--no-audio` to skip that step and render silently.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const studioDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(studioDir, '..');

const argv = process.argv.slice(2);
const specGiven = Boolean(argv[0] && !argv[0].startsWith('-'));
const specArg = specGiven ? argv.shift() : 'animation_spec.json';
const silent = argv.includes('--no-audio');
const extraArgs = argv.filter((argument) => argument !== '--no-audio');

const specPath = path.resolve(repoRoot, specArg);
const rel = (target) => path.relative(process.cwd(), target) || '.';

/** Locate the CLI in the studio's own node_modules; fall back to npx for an uninstalled tree. */
const findRemotion = () => {
  const bin = path.join(studioDir, 'node_modules', '.bin', process.platform === 'win32' ? 'remotion.cmd' : 'remotion');
  if (fs.existsSync(bin)) return { command: bin, prefix: [] };
  return { command: 'npx', prefix: ['--no-install', 'remotion'] };
};

const run = (args) => {
  const { command, prefix } = findRemotion();
  console.log(`\n> remotion ${args.join(' ')}\n`);
  const result = spawnSync(command, [...prefix, ...args], { cwd: studioDir, stdio: 'inherit' });
  if (result.error) {
    console.error(`\nCould not start Remotion: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
};

/**
 * Score the spec before rendering: a Kokoro voice clip per narration cue, an ambience bed and one
 * sting per `sfx` tag, then the manifest that `SpecMovie` imports. A machine without Python still
 * renders — it just renders silently — so a missing interpreter is a warning, never a failure.
 */
const scoreSpec = (target) => {
  const script = path.join(studioDir, 'scripts', 'spec_audio.py');
  if (!fs.existsSync(script)) return;

  const python = [
    process.env.SPEC_AUDIO_PYTHON,
    path.join(repoRoot, '.audiovenv', 'bin', 'python'),
    'python3',
  ].find((candidate) => candidate && (candidate === 'python3' || fs.existsSync(candidate)));

  if (!python) {
    console.warn('\n! No Python interpreter found — rendering without voiceover or sound effects.');
    console.warn('  See the setup block in studio/scripts/spec_audio.py, then re-run without --no-audio.');
    return;
  }

  console.log(`> scoring audio with ${path.relative(studioDir, python) || python}\n`);
  const result = spawnSync(python, [script, '--spec', target], { cwd: studioDir, stdio: 'inherit' });
  if (result.error) {
    console.warn(`\n! Audio stage could not start (${result.error.message}) — rendering silently.`);
  } else if (result.status !== 0) {
    console.warn(`\n! Audio stage failed (exit ${result.status}) — rendering silently.`);
    console.warn(`  Run it alone for the full error:  npm run audio:spec -- ${rel(target)}`);
  }
};

if (!fs.existsSync(specPath)) {
  // A path the caller named is an error; only the default path falls back to the reference cut.
  if (specGiven) {
    console.error(`\nNo spec at ${rel(specPath)}.`);
    console.error('Generate one first with:  ./run_pipeline.sh --prompt "What if …?"');
    process.exit(1);
  }
  console.log(`No spec at ${rel(specPath)} — rendering the hand-authored reference cut instead.`);
  console.log('Generate one first with:  ./run_pipeline.sh --prompt "What if …?"');
  run(['render', 'WhatIfMoon', 'out/what-if-moon.mp4', ...extraArgs]);
}

let spec;
try {
  spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
} catch (error) {
  console.error(`\n${rel(specPath)} is not valid JSON: ${error.message}`);
  console.error('Re-run the generation step; a truncated reply is the usual cause.');
  process.exit(1);
}

const slug = typeof spec?.slug === 'string' && spec.slug.trim() ? spec.slug.trim() : 'external';
const scenes = Array.isArray(spec?.scenes) ? spec.scenes : [];
const frames = scenes.reduce((sum, scene) => sum + (Number(scene?.durationFrames) || 0), 0);

if (scenes.length === 0 || !(frames > 0)) {
  console.error(`\n${rel(specPath)} has no usable scenes (${scenes.length} scenes, ${frames} frames).`);
  console.error('Regenerate it, or check it with: npm run validate -- ' + rel(specPath));
  process.exit(1);
}

const outFile = path.join('out', `${slug}.mp4`);
console.log(`Rendering ${rel(specPath)} — ${scenes.length} scenes, ${frames} frames (${(frames / 30).toFixed(1)}s) → studio/${outFile}`);
if (!silent) {
  console.log('(pass --no-audio to render without voiceover and sound effects)');
  scoreSpec(specPath);
}
run(['render', 'Spec-External', outFile, `--props=${specPath}`, ...extraArgs]);
