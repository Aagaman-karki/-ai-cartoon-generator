#!/usr/bin/env node
/**
 * Render smoke test: proves the studio bundles, every composition resolves its props, and frames
 * actually come out — the three things that otherwise fail *during* `npm run render`, minutes in.
 *
 *   npm run validate                                  # placeholder props for Spec-External
 *   npm run validate -- ../animation_spec.json        # validate a generated spec as well
 *
 * For every registered composition it renders two stills (first frame, middle frame) into
 * `out/validate/`. A missing `staticFile()` asset, an invalid spec, or a component that throws on
 * mount fails here in seconds instead of 4,000 frames into a render.
 *
 * Uses @remotion/bundler + @remotion/renderer directly so the bundle is built once for all checks.
 */

import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderStill } from '@remotion/renderer';

const specArg = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
const outDir = path.resolve('out', 'validate');

const fail = (message) => {
  console.error(`\n✗ ${message}`);
  process.exit(1);
};

/**
 * Remotion truncates a browser-side error at its first newline, which is exactly where a validator's
 * problem list starts. The full text survives in `stack`, before the `at …` frames.
 */
const detail = (error) => {
  const stack = typeof error?.stack === 'string' ? error.stack : '';
  const head = stack.split(/\n\s+at /)[0].trim();
  return head || error?.message || String(error);
};

const main = async () => {
  let inputProps = {};
  if (specArg) {
    const specPath = path.resolve(specArg);
    if (!fs.existsSync(specPath)) fail(`No spec file at ${specPath}`);
    try {
      inputProps = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    } catch (error) {
      fail(`${specPath} is not valid JSON: ${error.message}`);
    }
    console.log(`Using props from ${specPath}`);
  }

  console.log('Bundling studio/src/index.ts …');
  let serveUrl;
  try {
    serveUrl = await bundle({
      entryPoint: path.resolve('src', 'index.ts'),
      publicDir: path.resolve('public'),
    });
  } catch (error) {
    fail(`Bundling failed — this is what \`npm run render\` would hit:\n${detail(error)}`);
  }

  let compositions;
  try {
    compositions = await getCompositions(serveUrl, { inputProps });
  } catch (error) {
    // `calculateMetadata` throwing lands here — e.g. Spec-External rejecting an invalid spec.
    fail(`The studio failed to evaluate its compositions:\n${detail(error)}`);
  }

  if (!compositions || compositions.length === 0) fail('No compositions were registered.');

  fs.mkdirSync(outDir, { recursive: true });
  console.log(`${compositions.length} composition(s):`);
  for (const composition of compositions) {
    console.log(`  ${composition.id} — ${composition.durationInFrames} frames @ ${composition.fps}fps, ${composition.width}x${composition.height}`);
  }
  console.log('');

  const failures = [];
  for (const composition of compositions) {
    const frames = [...new Set([0, Math.floor(composition.durationInFrames / 2)])];
    for (const frame of frames) {
      const output = path.join(outDir, `${composition.id}-${frame}.png`);
      const started = Date.now();
      try {
        await renderStill({ composition, serveUrl, output, frame, inputProps });
        const kb = Math.round(fs.statSync(output).size / 1024);
        console.log(`  ✓ ${composition.id} frame ${frame} → ${path.relative(process.cwd(), output)} (${kb} KB, ${Date.now() - started}ms)`);
      } catch (error) {
        failures.push(`${composition.id} frame ${frame}: ${detail(error)}`);
        console.log(`  ✗ ${composition.id} frame ${frame}: ${detail(error)}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} check(s) failed:\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log('\n✓ All compositions bundled, validated and rendered a frame.');
};

main().catch((error) => {
  const hint = /libnss3|libatk|Cannot find module|shared libraries/i.test(detail(error))
    ? '\n\nIf Chrome libraries are missing (headless sandbox), export LD_LIBRARY_PATH or run `npx remotion browser ensure`.'
    : '';
  fail(`${detail(error)}${hint}`);
});
