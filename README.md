# AI Cartoon Generator

An experimental pipeline for producing short **"What If…?" explainer cartoons**: an LLM writes a
timed script and storyboard, a human (or coding agent) turns that storyboard into
[Remotion](https://www.remotion.dev/) (React) scenes, and Remotion renders the animation to MP4.

The only episode so far is **"What If the Moon Vanished?"** — a ~15-second short whose generated
storyboard lives in `cartoon_script.json` and whose scenes live in `studio/src/`. The checked-in
`what-if-moon.mp4` is an earlier 18.7-second edit of that episode; the current studio renders a
53.3-second narrated version (see [Video provenance](#video-provenance)).

> **Status:** the studio builds, typechecks and renders (verified with Remotion 4 + headless Chrome).
> Script generation works end to end. Episodes carry a generated soundtrack — Kokoro neural voiceover
> plus a synthesised SFX bed. The hand-authored cut wires that mix by hand in
> `studio/src/EpisodeAudio.tsx`; spec-driven episodes are scored automatically per spec and pick the
> placement up from `studio/src/spec/audio/manifest.json`. The scene art is deliberately minimal —
> see [Known gaps](#known-gaps).

---

## Pipeline overview

Two paths share one studio — the automated spec engine and the hand-authored original cut.

```
  concept prompt  ──►  generate_spec.js  ──►  Respan gateway (or Google Gemini API)
                              │
                              ▼
                    studio/src/specs/<slug>.json   (AnimationSpec)
                              │  validated at build time (validateSpec)
                              ▼
                    Studio: register in specs/index.ts → composition "Spec-<slug>"
                              │            (or skip registration entirely: point
                              │             "Spec-External" at the file with --props)
                              ▼
                    UniversalScene + BACKGROUNDS + ElementView
                              │  (schema → declarative elements → React)
                              ▼
         spec_audio.py  (Kokoro VO per cue + ambience bed + sting per sfx tag)
                              │  writes public/audio/spec/<slug>/ + audio/manifest.json
                              ▼
                    remotion render  ──►  studio/out/<slug>.mp4   (video + audio track)

  One command for the whole loop:  ./run_pipeline.sh --prompt "…"   (generate → check → render)

  Hand-authored reference cut (unaffected by the above):
  MainSequence.tsx ──► Desk → Staircase → CitySkyline → Observatory ──► composition "WhatIfMoon"

  Legacy storyboard path (still manual):
  generate.js ──► Gemini ──► cartoon_script.json (storyboard table for a human to read)
```

The spec engine is the intended way to make new episodes: a model (or you) writes JSON, the factory
components render it. The original episode is kept as `WhatIfMoon` for reference art. Both paths are
scored: the hand-authored cut through `EpisodeAudio.tsx`, and spec-driven episodes through
`scripts/spec_audio.py`, which reads `narration[]` and `scenes[].sfx` and lays the generated audio out
by frame. `npm run render` runs that step for you; `--no-audio` renders silent.

---

## Quick start

```bash
# 1. Storyboard (optional — one is already committed)
export GOOGLE_GENERATIVE_API_KEY="…"    # Google AI Studio key
node generate.js                        # → animation_spec.json (repo root)

# 2. Studio
cd studio
npm install
npm run dev                             # opens Remotion Studio (preview + scrubbing)
npm run render                          # animation_spec.json → out/<slug>.mp4, or the reference cut
npm run render:reference                # out/what-if-moon.mp4  (hand-authored cut, always)
npm run typecheck                       # tsc --noEmit
npm run validate                        # bundle + render a still per composition
npm run still -- --frame=150            # single PNG at a given frame
```

Spec-driven episodes:

```bash
# Inspect the exact request the generator would send (no key needed)
node generate_spec.js --prompt "What if gravity turned off?" --dry-run

# Generate a spec, register it in studio/src/specs/index.ts, then render it
node generate_spec.js --prompt "What if gravity turned off?" --out studio/src/specs/gravity-off.json
cd studio && npm run render:spec -- Spec-gravity-off out/gravity-off.mp4 --concurrency=2
```

**One command, generation included** (writes `animation_spec.json`, then renders it):

```bash
./run_pipeline.sh --prompt "What if the Earth stopped rotating?"
./run_pipeline.sh --spec animation_spec.json      # render an existing spec, no API call
./run_pipeline.sh --prompt "…" --model gemini-3.8-flash --frames 3600   # pick the model, shorter cut
CONCURRENCY=2 ./run_pipeline.sh --prompt "…"      # small machine
```

**Linux prerequisites.** Remotion drives headless Chrome, so the machine needs the Chrome shared
libraries (`libnspr4`, `libnss3`, plus the usual X/GBM set — `alsa`, `atk`, `cups`, `drm`, `gbm`,
`xkbcommon`, `xcomposite`, `xdamage`, `xfixes`, `xrandr`). On Debian/Ubuntu:
`sudo apt-get install -y libnss3 libnspr4 libasound2t64 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2`.
No system fonts are needed — the studio bundles its own (see `studio/src/fonts.ts`).

---

## Repository layout

| Path | Kind | Purpose |
| :--- | :--- | :--- |
| `AGENTS.md` | Instructions | The engine blueprint for AI agents: architecture, directing rules, extension points, invariants. |
| `generate.js` | Node script | Prompt → Gemini → `animation_spec.json` at the repo root: retries 408/429/5xx with backoff, rotates models on 404, strips a pasted `models/…` path from `--model`, `--list-models` to see what the key can call. |
| `run_pipeline.sh` | Shell | Generate → check the spec → render it through `Spec-External`, in one command. |
| `generate_spec.js` | Node script | Stage 1 of the engine: prompt → Gemini (via the Respan gateway when `RESPAN_API_KEY` is set) → validated `AnimationSpec` JSON (`--dry-run` needs no key). |
| `cartoon_script.json` | Data (JSON) | Saved, unmodified Gemini response for the Moon episode. Source of truth for the storyboard. |
| `studio/package.json` | Manifest | Remotion/React dependencies and the `dev`/`render`/`render:reference`/`validate`/`still`/`typecheck` scripts. |
| `studio/tsconfig.json` | Config | `react-jsx`, strict, bundler resolution; scoped to `studio/src`. |
| `studio/src/index.ts` | Entry | `registerRoot(RemotionRoot)`; also imports the font registration. |
| `studio/src/Root.tsx` | Composition | Registers `WhatIfMoon`, one `Spec-<slug>` per registered spec, and `Spec-External` (any spec passed with `--props`, validated in `calculateMetadata`). |
| `studio/scripts/validate-render.mjs` | Script | Bundles the studio, evaluates every composition's props and renders two stills each — the `npm run validate` smoke test. |
| `studio/scripts/render.mjs` | Script | What `npm run render` runs: resolves `animation_spec.json` from the repo root, checks it, and renders it through `Spec-External`. Falls back to the reference cut only when the default path is absent. |
| `studio/src/MainSequence.tsx` | Timeline | Lays the four scenes out as sequential 400-frame `<Sequence>` blocks and dips each chapter in/out of black. |
| `studio/src/theme.ts` | Design system | Palette, sky gradients, `track`/`fadeIn`/`pop`/`camera` motion helpers, type scale. |
| `studio/src/Atmosphere.tsx` | Components | `Sky` (gradient + sun + rotating rays + stars), `Ridge`, `CityLine`, `Particles`, `Vignette`, `Title`, `HudChip`. |
| `studio/src/DeskScene.tsx` | Scene 1 | Dusk bedroom; the Moon bursts at frame 110, the sky drains, the title lands. |
| `studio/src/StaircaseScene.tsx` | Scene 2 | Floating staircase over a burning horizon, drifting rocks, hovering cat, "GRAVITY LETS GO". |
| `studio/src/CitySkylineScene.tsx` | Scene 3 | Three parallax skyline bands under a setting sun, gold fractures, "THE SKY CRACKS". |
| `studio/src/ObservatoryScene.tsx` | Scene 4 | Domed control room, amber consoles, sweeping beacon, "SYNC LOST". |
| `studio/src/Character.tsx` | Component | Shared SVG character (`x`, `y`, `scale`, `action`, `expression`, `actionStart`, `flip`). |
| `studio/src/fonts.ts` | Module | Registers the bundled DejaVu Sans / Sans Bold / Sans Mono faces with `loadFont`. |
| `studio/src/ChapterFade.tsx` | Component | Dips a chapter in/out of black; used by both timelines. |
| `studio/src/EpisodeAudio.tsx` | Component | The soundtrack: ambience bed with ducking, four voiceovers, four event stings. |
| `studio/scripts/narration.json` | Data | Per-chapter voiceover lines, voice, speed and frame markers. |
| `studio/scripts/tts.py` | Python | Kokoro (ONNX) → `public/audio/ch{1..4}-vo.wav`. |
| `studio/scripts/sfx.py` | Python | numpy synthesis of the ambience bed and the four stings. |
| `studio/scripts/spec_audio.py` | Python | Scores a spec: Kokoro VO per narration cue, ambience bed, sting per `sfx` tag → `public/audio/spec/<slug>/` + `src/spec/audio/manifest.json`. |
| `studio/src/spec/SpecAudio.tsx` | Component | Plays that manifest for any spec (bed ducking, VO envelopes, event stings). |
| `studio/src/spec/audio/manifest.json` | Data | Generated audio placement per slug; imported by `SpecMovie`, committed so renders need no Python. |
| `studio/public/audio/*.wav` | Audio | Committed soundtrack layers (44.1 kHz 16-bit mono). |
| `studio/src/spec/types.ts` | Schema | `AnimationSpec` and every element/background/camera variant. |
| `studio/src/spec/validate.ts` | Validator | Turns untrusted model output into a typed spec + derived timing; readable error list. |
| `studio/src/spec/backgrounds.tsx` | Factory | Five environments built from the atmosphere primitives, keyed by `BackgroundType`. |
| `studio/src/spec/UniversalScene.tsx` | Factory | Renders one scene: background + camera move + elements, all from JSON. |
| `studio/src/spec/SpecMovie.tsx` | Timeline | One `<Sequence>` per scene, chapter dips, optional burned-in narration, plus `SpecAudio` when the spec has been scored. |
| `studio/src/specs/*.json` | Data | Example specs: `what-if-moon`, `time-stopped`. |
| `studio/src/specs/index.ts` | Registry | Validates every spec at import time and exposes `SPECS`. |
| `studio/public/fonts/` | Assets | Bundled `DejaVuSans.ttf`, `DejaVuSans-Bold.ttf` and `DejaVuSansMono.ttf` (Bitstream Vera / DejaVu licence). |
| `studio/out/` | Output | Renders and stills; git-ignored (`out` is in `.gitignore`). |
| `what-if-moon.mp4` | Video | Earlier Moon edit (17,003,667 bytes, 1920×1080, **18.7 s, with AAC audio**). It predates the current scenes and is *not* reproducible from `studio/` — see [Video provenance](#video-provenance). |
| `opencode.json` | Config | [opencode](https://opencode.ai) agent config: free OpenRouter Llama 3 8B model. |
| `cartoons/.opencode/commands/what-if.md` | Command | opencode slash-command that loads a `what-if-animation` skill. |
| `cartoons/.claude/skills/what-if-animation` | Git submodule | Episode workflow skill. **Not initialised** — the directory is empty. |
| `package-lock.json`, `cartoons/package-lock.json` | Lockfiles | Empty leftovers; no matching `package.json` exists. `studio/package-lock.json` is real. |
| `glm.js.save` | Scratch | Junk file containing typed shell text (`exit`). Not used by anything. |
| `LICENSE` | MIT | Copyright 2026 Aagaman-karki. |

---

## Studio reference

### Composition and timing

`WhatIfMoon` is 1920×1080 at 30 fps with 1,600 frames (~53 s). `MainSequence` splits that into four
400-frame sequences — ~13.3 s each — so every scene receives local frames `0…399` from
`useCurrentFrame()` and owns its own animation. Changing a scene's length means editing both the
`durationInFrames` in `MainSequence` and the composition total in `Root.tsx`.

The storyboard beats map onto the timeline as follows:

| Time | Storyboard beat | Scene |
| :--- | :--- | :--- |
| 0:00–0:13 | The Moon pops like a bubble; sky goes black | `DeskScene` |
| 0:13–0:26 | *(ocean collapse, reinterpreted)* Gravity instability, floating cat | `StaircaseScene` |
| 0:26–0:40 | Earth wobbles; sky fractures | `CitySkylineScene` |
| 0:40–0:53 | Freeze, fry, total systems failure | `ObservatoryScene` |

The scenes are thematic interpretations of the storyboard, not literal frames of it.

### Visual language

The studio renders in a flat-vector, warm-twilight style: layered silhouettes, glowing skies, gold
key light, and heavy display type. The rules live in `theme.ts` (`PALETTE`, `SKY`, `NIGHT_SKY`,
`TYPE`) and `Atmosphere.tsx` (the primitives), so a new scene composes the same film rather than
inventing its own look:

* **Layering** — `<Sky>` (gradient, sun disc with soft halo and slowly rotating masked rays, seeded
  stars, horizon haze) → `<Ridge>` / `<CityLine>` (midground silhouettes at increasing drift speed) →
  the scene's own set → `<Particles>` + `<Vignette>` (foreground depth).
* **Palette** — deep indigo/violet shadows (`ink` → `violet`) against a magenta→ember→amber horizon,
  with `gold`/`goldSoft` reserved for light sources, lit windows and focal type. `signal` blue is the
  only cool accent and is used for system readouts.
* **Typography** — `Title` draws a tracked uppercase eyebrow, a heavy gold header, a gold gradient
  rule that wipes in, and white subtext, all on the real 700-weight face with layered text shadows.
  `HudChip` is the small mono readout, deliberately quieter than the header.
* **Motion** — entrances use `pop()` (spring physics); camera moves and reveals use `track()` (eased,
  clamped `interpolate`); loops use sines of the frame number. `camera()` returns a slow push for the
  whole scene. `ChapterFade` dips each chapter to black at its edges, so the hard cuts read as breaks.

### Scenes

* **`DeskScene`** — Dusk room with a four-pane window onto a violet horizon, hills and a lit city. A
  cratered Moon swells and bursts at `POP = 110`: a ring and twelve gold puffs expand, the sky drains
  via `<Sky dim>`, the lamp gutters, and the character springs from `idle/neutral` to
  `panicked/shocked` (`actionStart={POP}`). The title lands at frame ≈236; the chip flips
  `LUNAR SIGNAL: STABLE` → `LOST`. A floor lamp on the right is the room's warm key light.
* **`StaircaseScene`** — A ten-step staircase climbing across a burning horizon, built from one
  deterministic `STEPS` array; steps 4 and 7 have torn loose and drift on `sin(frame * 0.05)`. A
  single sun disc drives the background (`sun={{ x: 1452, y: 704 }}`), with four floating rocks and a
  vector cat (gold eyes, curved tail) hovering above the flight. The character rides step 1.
* **`CitySkylineScene`** — The sun sits above the rooflines with rotating rays while three
  `CityLine` bands drift at 14/32/56 px per scene for parallax. Two gold fractures are drawn as SVG
  polylines revealed by `strokeDashoffset` and jittered by `sin(frame * 0.22) * 5`. The character
  stands on the foreground rooftop (top edge y=910, sun bounce along the parapet, AC units and a mast
  on the right).
* **`ObservatoryScene`** — Domed room with a ribbed ceiling, a rounded dome slit (`<Sky>` + two
  ridges) and a beacon whose soft light pool rotates about the lamp on the right. Three `Console`
  panels animate their bars and status strips with frame-seeded sines; the centred readout counts up
  to `SYNC LOSS 88.4%`. The character stands in the foreground in front of the left console, lit from
  behind by it.

### `Character`

A single inline `<svg>` on a 160×320 base box — semi-chibi proportions, black hoodie with drawstrings
and kangaroo pocket, slate cargo pants, chunky white sneakers, spiked black hair — positioned by its
**feet** (`x`, `y`), scaled by `scale`, and animated from the frame number (breathing, a blink every
72 frames, springed arm poses, panicked jitter):

| Prop | Type | Default | Effect |
| :--- | :--- | :--- | :--- |
| `x`, `y` | `number` | required | Center/feet position in composition pixels. |
| `scale` | `number` | `1` | Uniform scale about the feet. |
| `action` | `'idle' \| 'panicked'` | `'idle'` | `panicked` springs both arms up from the shoulders and adds a ±2.5 px jitter. |
| `expression` | `'neutral' \| 'shocked' \| 'happy'` | `'neutral'` | `shocked` gives wide white eyes, raised brows and an open mouth; `happy` a broad smile. |
| `actionStart` | `number` | `0` | Frame at which the current pose began, so a mid-scene change springs instead of snapping. |
| `flip` | `boolean` | `false` | Mirrors the figure horizontally. |
| `shadow` | `boolean` | `true` | Draws the soft contact shadow under the feet. |

### Fonts

`studio/src/fonts.ts` registers three bundled faces — `StudioSans` (DejaVu Sans), `StudioSansBold`
(DejaVu Sans Bold, the real 700 weight) and `StudioMono` (DejaVu Sans Mono) — via `@remotion/fonts`'
`loadFont`, which keeps the render blocked until they parse. Scenes and `Atmosphere.tsx` reference
these constants instead of `sans-serif`/`monospace`, because a bare container (or CI runner) has no
system fonts and Chrome would silently render every label blank. Keep new scenes on the same
families, or add another face to `public/fonts/` and register it there.

### Conventions

* Keep components **deterministic**: derive everything from `useCurrentFrame()`; no `useState`,
  `useEffect`, timers, `Math.random()` or `Date.now()`. Random-looking data (e.g. the star field) is
  generated once at module load from a fixed seed.
* One scene per file, named `<Name>Scene.tsx`, exporting a named `React.FC` that takes no props.
* Take colour from `PALETTE` and timing from `theme.ts`; compose backgrounds from `Sky` / `Ridge` /
  `CityLine` rather than re-deriving gradients, and announce each chapter with `Title` plus one
  `HudChip`. Styles stay inline objects (Remotion-friendly), but nothing hard-codes a colour that
  belongs in the palette.
* Light comes from one warm source per scene (sun, lamp, console, beacon); keep gold for what the
  viewer should look at and let shadows stay indigo.

---

## Animation engine (spec → video)

A video is data. One `AnimationSpec` JSON file describes the whole film, and the studio renders it as a
`Spec-<slug>` composition — no per-episode React code.

### The contract

```jsonc
{
  "title": "The Day Time Stopped Synchronizing",
  "slug": "time-stopped",
  "fps": 30, "width": 1920, "height": 1080,
  "theme": { "primaryColor": "#FF9D00", "secondaryColor": "#1A1A2E", "accentColor": "#FF5E3A", "fontFamily": "StudioSansBold" },
  "showNarration": true,
  "narration": [ { "frameStart": 12, "text": "At 8:14 AM, the universe forgot how to tick." } ],
  "scenes": [
    {
      "id": "scene_1",
      "type": "vector_environment",
      "durationFrames": 360,
      "background": "open_horizon",
      "backgroundOptions": { "sun": { "x": 960, "y": 660, "r": 180, "rays": true }, "seed": 5 },
      "camera": "slow_zoom_out",
      "elements": [
        { "type": "character", "x": 760, "y": 1000, "scale": 1.3, "action": "panicked", "actionStart": 120, "expression": "shocked" },
        { "type": "text_overlay", "text": "8:14 AM", "eyebrow": "CHAPTER 01", "sub": "Then the second hand stopped.", "x": 132, "y": 200, "size": "hero", "animation": "slide_up", "delay": 18 },
        { "type": "hud_chip", "label": "CLOCK DRIFT", "value": "0.000 s", "tone": "alert", "x": 132, "y": 520 }
      ],
      "sfx": ["tick", "tick_stop"]
    }
  ]
}
```

| Element | Fields | Renders as |
| :--- | :--- | :--- |
| `character` | `x`, `y` (feet), `scale`, `action`, `expression`, `actionStart`, `flip` | `Character` — springed pose, breathing, blink |
| `text_overlay` | `text`, `x`, `y`, `eyebrow`, `sub`, `size` (`hero`/`header`/`sub`), `align`, `animation` (`spring_pop`/`fade`/`slide_up`), `delay` | `Title` |
| `hud_chip` | `label`, `value`, `x`, `y`, `tone` (`gold`/`alert`), `align`, `delay` | `HudChip` |
| `fracture` | `path` (SVG `M…L…`), `strokeWidth`, `color`, `delay`, `revealFrames` | Glowing fissure revealed by `strokeDashoffset` |
| `particles` | `count`, `seed`, `opacity` | Deterministic dust motes |
| `glow` | `x`, `y`, `width`, `height`, `color`, `intensity` | Soft key-light bloom |

**Environments** (`background` + `backgroundOptions`): `dusk_room`, `twilight_skyline`,
`floating_staircase`, `dome_interior`, `open_horizon`. Each is assembled from `Sky`, `Ridge`,
`CityLine`, `Particles` and `Vignette`; the theme's `primaryColor` becomes the light source and
`secondaryColor` tints the frame.

### Validation and timing

`validateSpec` (in `studio/src/spec/validate.ts`) is the gate between model output and the renderer. It
returns either a typed spec or a list of readable errors — unknown background, duplicate scene id, bad
hex colour, missing text, negative duration, unknown element type — and warnings for non-blocking
problems (unbundled font, `totalDurationFrames` disagreeing with the scene sum, narration past the last
frame). `specs/index.ts` calls it at import time, so a malformed spec fails the build instead of
crashing 4,000 frames into a render.

`durationInFrames` is always the **sum of scene durations** (`timingFor`), which is what `Root.tsx` and
`SpecMovie` both use — the composition length cannot drift away from the timeline.

`npm run validate` goes one step further than the type checker: it bundles `src/index.ts`, asks Remotion
to evaluate every composition's props (running `calculateMetadata`), and renders two stills per
composition into `out/validate/`. Missing `staticFile()` assets, invalid specs and components that throw
on mount fail in seconds instead of mid-render. Pass a spec to include it:
`npm run validate -- ../animation_spec.json`.

### Rendering a spec file — `Spec-External`

A spec does not have to be imported into `src/specs/index.ts` to render. `Spec-External` accepts the
spec itself as render props:

```bash
cd studio && npx remotion render Spec-External out/episode.mp4 --props=../animation_spec.json
```

The composition validates those props in `calculateMetadata`, derives `durationInFrames`, fps and size
from the spec, and throws with the validator's problem list before frame 1 if the file is malformed.
Without `--props` it renders a single placeholder card that says so.

`npm run render` is the shorthand, and the only render command you need after generation. From
`studio/` it resolves `../animation_spec.json` from the repo root (not the current directory), prints
the scene count and duration, and renders to `out/<slug>.mp4`:

```bash
cd studio && npm run render                       # ../animation_spec.json
cd studio && npm run render -- ../other.json      # any spec
cd studio && npm run render -- ../s.json --frames=0-59
```

It refuses an unreadable file, a spec with no scenes, and a path you named that does not exist. With
no `animation_spec.json` present it renders the hand-authored reference cut and says so, so the
command still works on a fresh clone.

### `generate_spec.js`

```bash
node generate_spec.js --prompt "What if the earth stopped rotating?" --out studio/src/specs/stopped.json
node generate_spec.js --prompt "…" --dry-run        # print the request, send nothing
```

One Gemini call, `responseMimeType: application/json`, with a system instruction containing the schema
and the directing rules (hook within 90 frames, one hero text per scene, alternating camera moves,
warm-primary/cool-secondary palette, narration written for the ear). Output is fenced-JSON tolerant,
checked structurally, and written with a summary line. No retries and no model fallback; `--dry-run`
prints the exact request body so the prompt can be reviewed without a key.

With `RESPAN_API_KEY` set, that call goes through the Respan gateway's Gemini proxy
(`https://api.respan.ai/api/google/gemini/v1beta/models/<model>:generateContent`) and every generation
is logged as a trace in Respan; the request body and response parsing are unchanged. With the variable
empty the script calls `generativelanguage.googleapis.com` directly on `GOOGLE_GENERATIVE_API_KEY`, so a
checkout without a Respan account still generates. See `.env.example`.

### Extending it

Add an element in three places — `types.ts` (union variant), `validate.ts` (`validateElement` case),
`UniversalScene.tsx` (`ElementView` case). Add a background in `backgrounds.tsx` (`BACKGROUNDS`) plus
`BackgroundType`, and in the generator's `BACKGROUNDS` list. `AGENTS.md` documents the same workflow for
AI agents.

### What the engine does not do yet

* **Mixing beyond the bed, voice and one sting per scene.** A spec can carry several `sfx` tags per
  scene (all land on the scene start) and one voice line per cue, but there is no per-element cue
  placement, no music, and no bus compression — the level rules are the constants in
  `SpecAudio.tsx` (`BED_VOLUME`, `DUCK`).
* **Arbitrary art.** Six element types and five environments — a concept that needs anything else needs
  a new element or environment first.
* **Pixel parity with the hand-authored cut.** `Spec-what-if-moon` approximates the `WhatIfMoon` scenes;
  the factory version omits details the element vocabulary cannot express.

---

## Audio (voiceover + SFX)

The 53-second cut is scored: four narration lines, one ambience bed, four event stings. All of it is
generated by two scripts in `studio/scripts/`, and the resulting WAVs are committed to
`studio/public/audio/` so rendering needs neither Python nor a model download.

```
frame   0        110            400       800    826        1200      1236            1600
        │          │              │         │      │          │         │                │
VO      ch1 ──────────────────────┼─────────┼──────┼──────────┼─────────┼────────────────┤
                      ch2 ─────────┘         │      │          ch3 ────┘  ch4 ──────────┐
bed     ══════════════════════════════════════════════════════════════════════════════════
SFX     ticks ──┘  pop ─┘      riser+drop ────────┘  crack ────────┘      alarm ──────────┘
```

### Voiceover — `scripts/tts.py`

Kokoro, an open-source neural TTS model (Apache-2.0 weights) served through ONNX Runtime, so there is
no PyTorch install and no GPU. Lines and per-chapter frame markers live in `scripts/narration.json`:

```json
{ "voice": "af_heart", "speed": 0.98,
  "chapters": [ { "id": "ch1", "frame": 0, "voiceover": "What if the Moon vanished, right now? …" } ] }
```

One-time setup (about 360 MB of model files, outside the repo), then:

```bash
python3 -m venv /tmp/ttsenv && /tmp/ttsenv/bin/pip install kokoro-onnx
/tmp/ttsenv/bin/python studio/scripts/tts.py                  # → public/audio/ch{1..4}-vo.wav
/tmp/ttsenv/bin/python studio/scripts/tts.py --only ch3 --voice am_onyx --speed 1.05
```

Kokoro emits 24 kHz float32; the script peak-normalises to −1.5 dBFS, pads a 0.35 s tail and writes
44.1 kHz 16-bit PCM. `--only`, `--voice` and `--speed` are overrides for auditioning a single line.

### Sound design — `scripts/sfx.py`

Every layer is synthesised from noise and oscillators with numpy — deterministic (fixed RNG seed),
licence-free, no sample library, and reviewable as code:

| File | Length | At frame | Design |
| :--- | :--- | :--- | :--- |
| `ambience.wav` | 53.33 s | 0 | Brown-noise dusk wind under a 36/41.5 Hz drone, plus a whisper of airy top; slow LFO swell |
| `ch1-ticks.wav` | 3.80 s | 0 | Clock ticks that accelerate, then stop dead |
| `ch1-pop.wav` | 1.00 s | 110 | 760→130 Hz blip plus a soft noise puff — the Moon bursting like a bubble |
| `ch2-release.wav` | 3.60 s | 386 | Noise riser into a 95→30 Hz sub drop, thump, long floor shake |
| `ch3-crack.wav` | 2.00 s | 826 | 6 ms bright transient, four inharmonic rings, debris tail |
| `ch4-alarm.wav` | 6.00 s | 1236 | Two-tone warning beeps that tighten, then a falling chime |

```bash
python3 -m pip install numpy && python3 studio/scripts/sfx.py
```

The event frame numbers are mix decisions and appear twice on purpose: in `sfx.py`'s docstring and in
`EVENTS` in `src/EpisodeAudio.tsx`. Move an event in one, move it in the other.

### The mix — `src/EpisodeAudio.tsx`

`EpisodeAudio` renders alongside the chapter `<Sequence>`s in `MainSequence`, so it spans the whole
composition:

* **Bed** — `ambience.wav` at 0.55, ducked to 0.40 under each narration line with a 10-frame ramp in
  and 22-frame ramp out, so the level never clicks.
* **Voice** — each clip starts 12 frames into its chapter (after the dip from black) and fades over 5
  frames in / 8 frames out.
* **Stings** — placed against the scene constants: `POP = 110` in `DeskScene`, the crack reveal at
  local frame 26 of `CitySkylineScene` (826), the alert ramp at local 40 of `ObservatoryScene` (1240).
* **Ducking lengths** — `VOICEOVER[].frames` is each clip's length rounded to frames. If you
  re-render a line with different text, update that number or the bed will un-duck slightly early.

### Spec-driven episodes — `scripts/spec_audio.py`

A spec is data, so nobody hand-places its audio. `spec_audio.py` reads the JSON and writes the whole
soundtrack plus the manifest that says where each file goes:

| From the spec | Becomes |
| :--- | :--- |
| `narration[]` (each cue) | `public/audio/spec/<slug>/vo-<n>.wav` via Kokoro, starting at `frameStart` |
| episode length (sum of `scenes[].durationFrames`) | `bed.wav` — the same ambience mix, spanning the cut |
| `scenes[].sfx[]` tags | one `sting-<tag>.wav` per distinct tag, landed on that scene's first frame |
| all of the above | `src/spec/audio/manifest.json`, keyed by `slug` |

`SpecMovie` imports that manifest and renders `SpecAudio`, so both `Spec-<slug>` and `Spec-External`
are scored with no per-episode React. A spec with no manifest entry renders silently rather than
failing, and a machine without Python still renders — it just has no voiceover.

```bash
cd studio
npm run audio:spec -- src/specs/moon-vanished.json     # score only
npm run render -- studio/src/specs/moon-vanished.json  # scores, then renders
npm run render -- studio/src/specs/moon-vanished.json --no-audio   # silently
```

Setup is the same Kokoro venv as `tts.py` (`python3 -m venv .audiovenv && .audiovenv/bin/pip install
kokoro-onnx`, model in `~/kokoro`); `render.mjs` prefers `repo/.audiovenv/bin/python` and then
`python3`, and honours `$SPEC_AUDIO_PYTHON`. Known `sfx` tags are the `STINGS` table in
`spec_audio.py`; an unknown tag prints a warning naming the valid ones instead of failing the render.

### Re-cutting the audio

1. Edit the line in `scripts/narration.json`, re-run `tts.py`.
2. If the scene timing changed, update `EVENTS`/`VOICEOVER` offsets in `EpisodeAudio.tsx`.
3. `npm run render` (adds an AAC track automatically when any `<Audio>` is present).

---

## `generate.js` — prompt → JSON utility

The generic Gemini call: one prompt in, one JSON file out. It does **not** validate the result, so it
is not the episode path — `generate_spec.js` is. Use it for one-off prompts and for checking that a key
and model combination works at all.

```bash
node generate.js                                  # → animation_spec.json (repo root)
node generate.js --prompt "…" --out spec.json     # relative to the repo root, not the cwd
node generate.js --list-models                    # what this key can actually call
node generate.js --model models/gemini-3.8-flash  # pasted paths are normalised
node generate.js --api-version v1 --dry-run       # request body, key redacted
```

* **Model:** `gemini-3.8-flash` (GA, current). On a 404 it rotates through `gemini-3.6-flash` →
  `gemini-3.5-flash-lite` → `gemini-2.5-flash`, because a 404 from `generateContent` usually means
  *this project cannot call the model*, not that the id is misspelled. `--model` pins one.
* **Auth:** `x-goog-api-key` header, never `?key=` (query strings leak into logs). Key precedence:
  `GEMINI_API_KEY` → `GOOGLE_GENERATIVE_API_KEY` → `GOOGLE_API_KEY`.
* **Retries:** `408/429/500/502/503/504` up to 5 attempts, 1→2→4→8 s with jitter and a 60 s cap,
  honouring `Retry-After` and a `retryDelay` in the error body. `400/401/403` fail immediately.
* **Timeouts:** 240 s per attempt (`--timeout`), aborted sockets are retried.
* **Output:** parsed JSON written to the file, code fences stripped; non-JSON replies are saved as
  `<out>.txt` with an explanation instead of a broken `.json`. Token usage is printed. `--out`
  resolves against the repo root (the script's own directory), so running it from `studio/` still
  writes the file the render step looks for.
* **Endpoint:** `https://generativelanguage.googleapis.com/{v1beta,v1}/models/{model}:generateContent`,
  built in one place. `--model` accepts `models/x`, `/v1beta/models/x`, a full URL or `x:generateContent`
  and is reduced to the bare id, so a pasted path can no longer produce the doubled
  `v1beta/models/x/v1beta/models/x` 404.

Change the prompt with `--prompt`; the model default lives in `MODELS` at the top of the script.

### `cartoon_script.json`

An API response dump kept verbatim for provenance:

* `candidates[0].content.parts[0].text` — Markdown with the title, a 15-second four-scene table
  (time range, visual layout, voiceover, SFX) and production notes (flat-vector 2D style in the spirit
  of *Kurzgesagt*, bold kinetic on-screen text).
* `candidates[0].content.parts[0].thoughtSignature` — opaque reasoning token; irrelevant to rendering.
* `candidates[0].finishReason`, `modelVersion` (`gemini-3.8-flash`), `responseId` — run metadata.
* `usageMetadata` — 22 prompt tokens, 576 candidate tokens, 616 thinking tokens, 1,214 total.

---

## Video provenance

The two video artifacts in this repo are **not the same edit**:

| File | Length | Audio | Reproducible from `studio/`? |
| :--- | :--- | :--- | :--- |
| `what-if-moon.mp4` | 18.71 s, 6,959 kb/s | AAC, 48 kHz stereo | No — predates the current scenes and timeline |
| `studio/out/what-if-moon-audio.mp4` (git-ignored) | 53.33 s | AAC 44.1 kHz mono: voiceover + SFX | Yes — `npm run render` |

The checked-in video is kept as the finished earlier cut; the studio source is a later, longer rebuild
with a full soundtrack. Pick one as canonical before publishing either — the studio cut is now the
more complete of the two, and re-cutting it to 18.7 s would mean rewriting `narration.json` and the
`EVENTS`/`VOICEOVER` tables in `EpisodeAudio.tsx`.

## Known gaps

| Issue | Impact | Suggested fix |
| :--- | :--- | :--- |
| Studio cut (53 s) and committed video (18.7 s) diverged | Two different edits of the same episode | Re-cut the composition to the shorter edit, or adopt the 53 s cut and replace the video |
| Set dressing is still procedural | Roofs, rooms and hills are built from rectangles and sines; no drawn props or textures | Add a small asset layer (SVG props) for foreground detail |
| `what-if-animation` submodule uninitialised | Workflow skill unavailable on a fresh clone | Add `.gitmodules`, or vendor the skill into `cartoons/.claude/skills/what-if-animation/` |
| Root and `cartoons/` lockfiles are empty | Misleading; implies npm projects that do not exist | Delete them, or scaffold the matching `package.json` files |
| `glm.js.save` | Noise | Delete |
| 17 MB MP4 in Git (with audio) | Slow clones; binary in history | Move renders to releases/LFS, or git-ignore them |
| `opencode.json` points at an 8B Llama model | Fine for scaffolding, weak for production scripts | Point at a stronger model via OpenRouter |

## License

MIT © 2026 Aagaman-karki — see [LICENSE](LICENSE). Bundled DejaVu fonts retain their own
(Bitstream Vera / DejaVu) licence.
