---
name: what-if-animation
description: Author, validate and render "What If…?" episodes with this repo's spec-driven Remotion factory. Use when asked to create or change an episode, write an animation spec, add narration or SFX cues, or render a Spec-* composition.
---

# What If…? animation engine

This repo turns a written concept into a rendered video. An episode is **data**, not code: an
`AnimationSpec` JSON file names a theme, a list of scenes and the narration/SFX cues, and the factory
components in `studio/src/spec/` render it. Your job when asked for a video is to author that JSON —
not to write React scenes.

## Defaults for every new episode

| Setting | Value |
| :--- | :--- |
| Duration | **14,400 frames** — 8:00 at 30 fps (`totalDurationFrames`, and the sum of scene durations) |
| Scenes | **12–16**, each 900–1,200 frames (30–40 s); aim ~1,030 frames each |
| Narration | ~32–40 cues spread across the whole timeline, absolute `frameStart` |
| Resolution | 1920×1080 |

A 3–5 scene, 40-second cut is a failure for this format. The pitch is long-form: premise →
escalation through consequences → complication → turn → resolution in the final scene.

The generator's defaults match (`node generate_spec.js`), and `--frames` / `--scenes` override them for
deliberately short cuts (`--frames 3600 --scenes 6-8`).

## Timing: how narration and SFX line up

`narration[].frameStart` is **absolute** (composition frames, not scene-local). Scene `sfx` tags are
not timed per cue: **a scene's `sfx` array fires at that scene's absolute start frame**, in scene order.

So compute the running cursor, then place cues against it:

```jsonc
// durations: 1020, 1080, 960 …
"narration": [
  { "frameStart": 12,   "text": "The Moon is gone, and nothing fell to replace it." },   // scene 1 @ 0
  { "frameStart": 482,  "text": "Sixteen seconds later, the tides notice first." },      // scene 1 @ +470
  { "frameStart": 1032, "text": "Coastlines go slack, all at once." }                    // scene 2 @ 1020 + 12
]
```

Rules that keep the voice from colliding with itself:

1. One cue at every scene start **+ 12 frames** (just after the chapter dip), and one extra cue every
   ~450 frames (15 s) inside longer scenes.
2. `frameStart` strictly increasing; first cue under frame 200; last cue inside the final 30 s — the
   tail must not go silent a minute early.
3. Budget words at ~2.5 per second of gap before the next cue, so a line never runs over the next one.
4. SFX vocabulary (so the audio stage can match a cue to a sound): `ambience`, `clock_tick`, `pop`,
   `sub_drop`, `riser`, `glass_crack`, `rumble`, `alarm`, `whoosh`, `heartbeat`. 0–2 per scene, and
   map the cue to the beat the visuals are selling (no `alarm` on a calm scene).

## Workflow

1. **Generate or write the spec.**
   ```bash
   node generate_spec.js --dry-run --prompt "What if the earth stopped rotating?"   # inspect the prompt
   node generate_spec.js --prompt "What if the earth stopped rotating?" --out studio/src/specs/stopped-rotating.json
   ```
   Needs `GOOGLE_GENERATIVE_API_KEY` for a real call. Writing the JSON by hand for full control is
   equally valid — see `studio/src/specs/time-stopped.json`.
2. **Read the timing warnings.** The generator checks scene count, total length, cue coverage, cue
   order and the SFX vocabulary, and prints `!` lines when the spec drifted off target. Fix the JSON
   rather than ignoring them.
3. **Register it** in `studio/src/specs/index.ts` (`SPECS`). `validateSpec` runs at module load, so a
   malformed spec fails fast with a list of problems.
4. **Verify stills before committing to a render.** An 8-minute episode is ~14,400 frames; at
   `--concurrency=2` that is roughly an hour of CPU, so check frames first:
   ```bash
   cd studio && LD_LIBRARY_PATH=/tmp/chromelibs/usr/lib/x86_64-linux-gnu npx remotion still Spec-<slug> out/f-1000.png --frame=1000
   ```
   Pick frames at scene starts, mid-scene and the final beat.
5. **Typecheck, smoke-test, then render.**
   ```bash
   cd studio && npm run typecheck && npm run validate
   LD_LIBRARY_PATH=/tmp/chromelibs/usr/lib/x86_64-linux-gnu npx remotion render Spec-<slug> out/<slug>.mp4 --concurrency=2
   ```
   `npm run validate` bundles the studio, evaluates every composition's props (including
   `calculateMetadata`) and renders two stills each into `out/validate/`, so a missing `staticFile()`
   asset or a bad spec fails in seconds. Pass a spec to include it:
   `npm run validate -- ../animation_spec.json`.

   **Or skip registration entirely** — `Spec-External` takes the spec as render props. `npm run render`
   already points it at the repo-root `animation_spec.json` and writes `out/<slug>.mp4`:
   ```bash
   cd studio && npm run render                    # ../animation_spec.json
   cd studio && npm run render -- ../other.json   # any spec file
   ```
   It resolves the path from the repo root, so it does not matter which directory you run it from, and
   it falls back to the reference cut only when the default `animation_spec.json` is absent.
   Its `calculateMetadata` validates the file and throws with the validator's problem list before
   frame 1. `./run_pipeline.sh --prompt "…"` does generate → check → render in one command.
   In this sandbox Chrome's shared libraries are installed outside the loader path, hence
   `LD_LIBRARY_PATH`; on a normal machine plain `npx remotion render` works. Two cores here — higher
   concurrency fails.

## Schema quick reference

Theme: `primaryColor` is the light (gold/amber/orange), `secondaryColor` the shadow (indigo/navy);
never two warms together. Elements: `character`, `text_overlay`, `hud_chip`, `fracture`, `particles`,
`glow`. Backgrounds: `dusk_room`, `twilight_skyline`, `floating_staircase`, `dome_interior`,
`open_horizon`. Full contract: `studio/src/spec/types.ts`. To add an element or background, follow the
three-file / two-file recipes in `AGENTS.md` — keep the generator's enums in sync.

Directing rules that review enforces: a hook inside the first 90 frames; one hero text per scene and at
most one chip; text and character in opposite thirds; a camera move in every scene, alternating; spring
entrances, not linear fades; silhouettes layered three deep for parallax; deterministic output (no
`Math.random`, `Date.now`, `useState`, timers — seeded from `backgroundOptions.seed`).

## Audio reality check

`Spec-*` compositions render **silent** today: `narration[]` and `sfx[]` are metadata that is validated
and timed, but no audio stage consumes them for specs. The soundtrack (Kokoro voiceover plus a numpy
SFX bed, `studio/src/EpisodeAudio.tsx`) is hand-wired for the original `WhatIfMoon` cut only. Say so
when describing what a spec render will actually contain — do not promise narration audio in a spec.

## Invariants

- `timingFor` sums scene durations; `totalDurationFrames` is advisory and must repeat that sum.
- Only bundled fonts render (`StudioSans`, `StudioSansBold`, `StudioMono`).
- Element coordinates are absolute composition pixels; `character.y` is the feet position.
- Keep secrets out of specs and commits; keys live in environment variables.
- Renders belong in `studio/out/` (git-ignored), never in the repo.
