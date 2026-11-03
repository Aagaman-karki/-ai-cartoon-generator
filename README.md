# AI Cartoon Generator

An experimental pipeline for producing short **"What If…?" explainer cartoons**: an LLM writes a
timed script and storyboard, a human (or coding agent) turns that storyboard into
[Remotion](https://www.remotion.dev/) (React) scenes, and Remotion renders the animation to MP4.

The only episode so far is **"What If the Moon Vanished?"** — a ~15-second short whose generated
storyboard lives in `cartoon_script.json` and whose scenes live in `studio/src/`. The checked-in
`what-if-moon.mp4` is an earlier 18.7-second edit of that episode; the current studio renders a
53.3-second silent version (see [Video provenance](#video-provenance)).

> **Status:** the studio builds, typechecks and renders (verified with Remotion 4 + headless Chrome).
> Script generation works end to end. The studio has no audio track or narration, and the scene art is
> deliberately minimal — see [Known gaps](#known-gaps).

---

## Pipeline overview

```
   prompt (hard-coded in generate.js)
            │
            ▼
   Google Gemini API  ──────────────►  cartoon_script.json
   (generate.js)                       (raw API response: title, 4-scene
            │                           storyboard table, VO, SFX, style notes)
            ▼
   manual translation of the storyboard into React/Remotion scenes
            │
            ▼
   studio/src/MainSequence.tsx  ──►  4 × 400-frame <Sequence> blocks
            │                         (Desk → Staircase → CitySkyline → Observatory)
            ▼
   remotion render  ────────────────►  studio/out/*.mp4  (1920×1080, 53.3 s, silent)
```

There is no automation joining the stages: the script JSON is an input for a human, not something the
studio parses. Each stage is currently run by hand, which is why the two halves of the repo only share
the storyboard document.

---

## Quick start

```bash
# 1. Storyboard (optional — one is already committed)
export GOOGLE_GENERATIVE_API_KEY="…"    # Google AI Studio key
node generate.js                        # prints the JSON response to stdout

# 2. Studio
cd studio
npm install
npm run dev                             # opens Remotion Studio (preview + scrubbing)
npm run render                          # out/what-if-moon.mp4
npm run typecheck                       # tsc --noEmit
npm run still -- --frame=150            # single PNG at a given frame
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
| `generate.js` | Node script | Calls the Gemini `generateContent` endpoint and prints the script/storyboard JSON. |
| `cartoon_script.json` | Data (JSON) | Saved, unmodified Gemini response for the Moon episode. Source of truth for the storyboard. |
| `studio/package.json` | Manifest | Remotion/React dependencies and the `dev`/`render`/`still`/`typecheck` scripts. |
| `studio/tsconfig.json` | Config | `react-jsx`, strict, bundler resolution; scoped to `studio/src`. |
| `studio/src/index.ts` | Entry | `registerRoot(RemotionRoot)`; also imports the font registration. |
| `studio/src/Root.tsx` | Composition | Registers `WhatIfMoon`: 1920×1080, 30 fps, 1,600 frames. |
| `studio/src/MainSequence.tsx` | Timeline | Lays the four scenes out as sequential 400-frame `<Sequence>` blocks and dips each chapter in/out of black. |
| `studio/src/theme.ts` | Design system | Palette, sky gradients, `track`/`fadeIn`/`pop`/`camera` motion helpers, type scale. |
| `studio/src/Atmosphere.tsx` | Components | `Sky` (gradient + sun + rotating rays + stars), `Ridge`, `CityLine`, `Particles`, `Vignette`, `Title`, `HudChip`. |
| `studio/src/DeskScene.tsx` | Scene 1 | Dusk bedroom; the Moon bursts at frame 110, the sky drains, the title lands. |
| `studio/src/StaircaseScene.tsx` | Scene 2 | Floating staircase over a burning horizon, drifting rocks, hovering cat, "GRAVITY LETS GO". |
| `studio/src/CitySkylineScene.tsx` | Scene 3 | Three parallax skyline bands under a setting sun, gold fractures, "THE SKY CRACKS". |
| `studio/src/ObservatoryScene.tsx` | Scene 4 | Domed control room, amber consoles, sweeping beacon, "SYNC LOST". |
| `studio/src/Character.tsx` | Component | Shared SVG character (`x`, `y`, `scale`, `action`, `expression`, `actionStart`, `flip`). |
| `studio/src/fonts.ts` | Module | Registers the bundled DejaVu Sans / Sans Bold / Sans Mono faces with `loadFont`. |
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

## `generate.js` — script generator

* **Input:** the prompt is hard-coded — *"Write a short 15-second script and visual layout for a What If
  animation about the moon disappearing."*
* **Request:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=$GOOGLE_GENERATIVE_API_KEY`
* **Output:** the full JSON response, pretty-printed to stdout after a `RESULT:` marker. It does **not**
  write `cartoon_script.json`; saving the output is a manual step. Errors go through
  `.catch(console.error)` — no retries, no schema validation, no non-zero exit code on API failure.

Change the prompt string for a new episode, or the model id in the URL.

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
| `studio/out/what-if-moon-full.mp4` (git-ignored) | 53.33 s, 317 kb/s | None | Yes — `npm run render` |

The checked-in video is kept as the finished earlier cut; the studio source is a later, longer
rebuild that has not yet been re-cut to that 18.7-second edit or given audio. Pick one as canonical
before publishing either.

## Known gaps

| Issue | Impact | Suggested fix |
| :--- | :--- | :--- |
| Studio renders are silent | Storyboard specifies VO and SFX | Add `<Audio>` / `<Series>` with voice clips and an SFX bed, then re-render |
| Studio cut (53 s) and committed video (18.7 s) diverged | Two different edits of the same episode | Re-cut the composition to the shorter edit, or adopt the 53 s cut and replace the video |
| Set dressing is still procedural | Roofs, rooms and hills are built from rectangles and sines; no drawn props or textures | Add a small asset layer (SVG props) for foreground detail |
| `what-if-animation` submodule uninitialised | Workflow skill unavailable on a fresh clone | Add `.gitmodules`, or vendor the skill into `cartoons/.claude/skills/what-if-animation/` |
| `generate.js` hard-codes prompt and model | One episode per source edit | Accept `--prompt`/`--out` args and a `MODEL` env var; write output to a file; exit non-zero on API errors |
| Root and `cartoons/` lockfiles are empty | Misleading; implies npm projects that do not exist | Delete them, or scaffold the matching `package.json` files |
| `glm.js.save` | Noise | Delete |
| 17 MB MP4 in Git (with audio) | Slow clones; binary in history | Move renders to releases/LFS, or git-ignore them |
| `opencode.json` points at an 8B Llama model | Fine for scaffolding, weak for production scripts | Point at a stronger model via OpenRouter |

## License

MIT © 2026 Aagaman-karki — see [LICENSE](LICENSE). Bundled DejaVu fonts retain their own
(Bitstream Vera / DejaVu) licence.
