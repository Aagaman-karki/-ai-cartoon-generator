# Agent guide — the "What If…?" animation engine

This repository compiles a **text concept into a rendered video**. Your job, when asked to "generate a
video about X", is to author an `AnimationSpec` JSON file — not to write React scenes. The factory
components already cover the visual language; new scenes should need data, not code.

Build the docs and the pipeline around those facts.

## Architecture map

| Stage | Location | What it does |
| :--- | :--- | :--- |
| 1. Schema | `studio/src/spec/types.ts`, `studio/src/spec/validate.ts` | The contract: `AnimationSpec`, and a validator that turns untrusted model output into a typed spec plus derived timing. |
| 2. Factory | `studio/src/spec/UniversalScene.tsx`, `studio/src/spec/backgrounds.tsx`, `studio/src/Atmosphere.tsx`, `studio/src/Character.tsx` | Declarative elements and environments → React. `BACKGROUNDS` is the environment registry; `ElementView` is the element registry. |
| 2b. Timeline | `studio/src/spec/SpecMovie.tsx`, `studio/src/ChapterFade.tsx` | One `<Sequence>` per scene, chapter dips, optional burned-in narration. |
| 2c. Audio | `studio/src/EpisodeAudio.tsx`, `studio/scripts/tts.py`, `studio/scripts/sfx.py` | Voiceover (Kokoro neural TTS) and a synthesised SFX bed, placed on the timeline by frame. |
| 3. Automation | `generate_spec.js` | Prompt → Gemini → validated spec JSON written to `studio/src/specs/`. |
| 4. Rendering | `studio/src/Root.tsx`, `studio/src/specs/index.ts` | Every spec becomes a `Spec-<slug>` composition, timed from `timingFor(spec)`. |

The original hand-authored episode (`MainSequence.tsx` + the four `*Scene.tsx` files) is still
registered as `WhatIfMoon`. It is the reference art for what the factory approximates; new work should
extend the factory instead of adding a fifth hand-written scene.

## Workflow for a new episode

1. Author the spec. Either let the model write it:
   `node generate_spec.js --prompt "What if the earth stopped rotating?" --out studio/src/specs/stopped-rotating.json`
   or write the JSON by hand for full control (see `studio/src/specs/time-stopped.json`).
2. Register it: add the import and entry to `SPECS` in `studio/src/specs/index.ts`. Validation runs at
   module load, so a bad spec fails fast with a list of problems.
3. Preview: `cd studio && npm run dev`, open the `Spec-<slug>` composition.
4. Verify stills before a full render:
   `LD_LIBRARY_PATH=/tmp/chromelibs/usr/lib/x86_64-linux-gnu npx remotion still Spec-<slug> out/f.png --frame=N`
5. Render: `LD_LIBRARY_PATH=… npx remotion render Spec-<slug> out/<slug>.mp4 --concurrency=2`
   (2 CPU cores in this sandbox — higher concurrency fails.)
6. Typecheck: `cd studio && npm run typecheck`.

## Directing rules (enforced by review, encoded in the generator prompt)

* **Hook in the first 90 frames.** Every episode opens with a pattern break by frame 30–90: a `hero`
  text overlay or a character beat that begins by frame 20. No slow ambient openers.
* **One idea per frame.** One hero text per scene, at most one `hud_chip`, and text never overlaps the
  character — figures sit in one third, type in the other.
* **Motion everywhere.** Every scene gets a `camera` move, alternating between scenes. Entrances use
  springs (`spring_pop`), never linear fades on the focal element.
* **Parallax depth.** Prefer backgrounds that layer three silhouette bands (`twilight_skyline`,
  `open_horizon`, `floating_staircase`) over flat colour fields.
* **Palette harmonisation.** `primaryColor` is the light source (gold/amber/orange), `secondaryColor`
  the shadow (deep indigo/navy). Never pair two warms as primary+secondary; keep saturated colour for
  what the viewer must look at.
* **Determinism.** No `Math.random()`, `Date.now()`, `useState` or timers. Random-looking data is
  seeded from the spec (`backgroundOptions.seed`) so a render is reproducible frame-for-frame.

## Extending the engine

Adding an element type is a three-file change — keep them in sync:

1. `studio/src/spec/types.ts` — add a variant to `SceneElement` (and to the union in `types.ts` docs).
2. `studio/src/spec/validate.ts` — validate its required fields in `validateElement`.
3. `studio/src/spec/UniversalScene.tsx` — render it in `ElementView`.

Adding a background is two files: `studio/src/spec/backgrounds.tsx` (component + `BACKGROUNDS` entry)
and `BackgroundType` in `types.ts`, plus the enum in `generate_spec.js` (`BACKGROUNDS`). Prefer building
new environments from `Sky`, `Ridge`, `CityLine`, `Particles` and `Vignette` rather than new gradients.

## Audio

Sound is generated, not sampled, and committed as WAVs in `studio/public/audio/` — a render needs no
Python at all. Two scripts produce it:

* `studio/scripts/tts.py` — Kokoro (Apache-2.0, ONNX Runtime, no PyTorch) reads
  `studio/scripts/narration.json` and writes `ch{1..4}-vo.wav`. Setup is in the script's docstring; the
  model lives outside the repo (`/tmp/kokoro`, ~360 MB).
* `studio/scripts/sfx.py` — numpy synthesis of `ambience.wav` and four event stings. Fixed RNG seed, so
  the same command always produces the same audio.

`EpisodeAudio` is rendered by `MainSequence` above the chapter Sequences. Levels, offsets and ducking
are plain numbers in that file — edit them there rather than mixing in post, so the mix stays
reproducible from source. Event frame numbers are duplicated in `sfx.py`'s docstring by design.

If you add narration for a new episode, extend `narration.json` (id, frame marker, line), re-run
`tts.py`, and add a matching entry — with the clip's length rounded to frames — to `VOICEOVER` so the
bed ducks under it.

## Invariants

* `durationInFrames` is always the sum of scene durations (`timingFor`). `totalDurationFrames` in a spec
  is advisory only — the sum wins, and a mismatch produces a warning.
* Only the bundled fonts render reliably (`StudioSans`, `StudioSansBold`, `StudioMono`); a host has no
  system fonts. Unknown `fontFamily` values fall back with a warning.
* Composition is 1920×1080 at 30 fps unless a spec overrides it. Element coordinates are absolute
  composition pixels; `Character`'s `y` is the feet position.
* Never commit `studio/out/` (git-ignored) or a generated spec containing secrets. API keys live in
  environment variables (`GOOGLE_GENERATIVE_API_KEY`), never in the repo.

## Known limitations

* **Spec episodes are silent.** `Spec-*` compositions ignore `narration[]` and `sfx[]`; the soundtrack
  exists only for the hand-authored `WhatIfMoon` cut, wired by hand in `EpisodeAudio`. Generalising it
  to specs means generating one clip per narration cue and placing it by `frameStart`.
* **Audio is verified by measurement, not by ear.** Renders were checked with `ffprobe` (stream present,
  duration matches) and the voiceover was transcribed back to text to confirm intelligibility. Nobody
  has listened for timbre or mix balance.
* The factory has six element types and five environments. It cannot express arbitrary art; anything
  outside the vocabulary needs a new element or background.
* `Spec-*` compositions are approximations of the hand-authored cut, not pixel matches.
