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
| `studio/src/MainSequence.tsx` | Timeline | Lays the four scenes out as sequential 400-frame `<Sequence>` blocks. |
| `studio/src/DeskScene.tsx` | Scene 1 | Bedroom window; the Moon pops at frame 110, sky dies, "RIGHT NOW" lands. |
| `studio/src/StaircaseScene.tsx` | Scene 2 | Floating cat, drifting dust, panicked character, "ANOMALY SECTOR: HALLWAY". |
| `studio/src/CitySkylineScene.tsx` | Scene 3 | Skyline under a widening "temporal rift", "GLOBAL HORIZON: FRACTURED". |
| `studio/src/ObservatoryScene.tsx` | Scene 4 | Pulsing control room, "CRITICAL ERROR: TIME CHANNELS DESYNCHRONIZED". |
| `studio/src/Character.tsx` | Component | Shared vector character (`x`, `y`, `scale`, `action`, `expression`). |
| `studio/src/fonts.ts` | Module | Registers the bundled DejaVu Sans / Sans Mono faces with `loadFont`. |
| `studio/public/fonts/` | Assets | Bundled `DejaVuSans.ttf` and `DejaVuSansMono.ttf` (Bitstream Vera / DejaVu licence). |
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

### Scenes

* **`DeskScene`** — Gradient room, four-pane window, seeded star field (46 stars, twinkling), a glowing
  cratered Moon that swells and vanishes at `POP = 110`. Eight blurred puffs drift outward as smoke
  over 70 frames, the stars fade, a black overlay ramps to 0.92 opacity, and the caption "RIGHT NOW"
  scales in at frame ~240. The HUD badge flips from "LUNAR SIGNAL: STABLE" to "LOST"; the character
  flinches from `idle/neutral` to `panicked/shocked`.
* **`StaircaseScene`** — Whole-set pan of 50 px over 400 frames over an indigo gradient; a hallway
  floor at y=450 with faint receding perspective lines and two wall guide lines meeting behind the
  character; a cat made of divs (clip-path ears, glowing eyes, rotated tail) bobs on
  `sin(frame * 0.08) * 12` above it; three dust specks; character at (580, 450) standing on the floor.
* **`CitySkylineScene`** — Six flex-sized silhouette blocks; two rift bars grow from 0 % to
  100 % / 80 % width across the sequence, the upper one jittering by `sin(frame * 0.2) * 8`; a
  foreground rooftop (top edge y=960, two vents) gives the character at (480, 960) something to stand
  on while it looks up.
* **`ObservatoryScene`** — Radial control-room gradient; console row whose side panels alternate
  between red and indigo every half cycle of `sin(frame * 0.3)`; central readout whose glow fades in
  from 0.5 to 1; centered critical-error banner; the character (feet at y=900) is drawn *before* the
  console row so the desk occludes its legs.

### `Character`

A flat-vector figure drawn entirely from divs on a 120×240 base box, positioned by its **feet**
(`x`, `y`), scaled by `scale`, and animated from the frame number:

| Prop | Type | Default | Effect |
| :--- | :--- | :--- | :--- |
| `x`, `y` | `number` | required | Center/feet position in composition pixels. |
| `scale` | `number` | `1` | Uniform scale about the feet. |
| `action` | `'idle' \| 'panicked'` | `'idle'` | `panicked` raises both arms from the shoulders and adds a ±3 px jitter. |
| `expression` | `'neutral' \| 'shocked' \| 'happy'` | `'neutral'` | `shocked` widens the eyes/brows and opens a red mouth. |

### Fonts

`studio/src/fonts.ts` registers two bundled faces — `StudioSans` (DejaVu Sans) and `StudioMono`
(DejaVu Sans Mono) — via `@remotion/fonts`' `loadFont`, which keeps the render blocked until they
parse. Scenes reference these constants instead of `sans-serif`/`monospace`, because a bare container
(or CI runner) has no system fonts and Chrome would silently render every HUD label blank. Keep new
scenes on the same two families, or add another face to `public/fonts/` and register it there.

### Conventions

* Keep components **deterministic**: derive everything from `useCurrentFrame()`; no `useState`,
  `useEffect`, timers, `Math.random()` or `Date.now()`. Random-looking data (e.g. the star field) is
  generated once at module load from a fixed seed.
* One scene per file, named `<Name>Scene.tsx`, exporting a named `React.FC` that takes no props.
* Palette: near-black `#090D16` / `#030712` / `#0F172A`, indigo `#1E1B4B` / `#1E293B`, slate
  `#334155` / `#94A3B8`, cyan `#38BDF8`, amber `#FBBF24`, red `#EF4444`.
* Each scene ends with a monospace HUD badge that states its "status" diegetically. Reuse that motif.
* Styles are inline objects; there is no theme module or shared HUD component yet.

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
| Scene art is sparse | Little mid-ground detail; scenes are flat colour blocks | Add set dressing and parallax layers |
| `what-if-animation` submodule uninitialised | Workflow skill unavailable on a fresh clone | Add `.gitmodules`, or vendor the skill into `cartoons/.claude/skills/what-if-animation/` |
| `generate.js` hard-codes prompt and model | One episode per source edit | Accept `--prompt`/`--out` args and a `MODEL` env var; write output to a file; exit non-zero on API errors |
| Root and `cartoons/` lockfiles are empty | Misleading; implies npm projects that do not exist | Delete them, or scaffold the matching `package.json` files |
| `glm.js.save` | Noise | Delete |
| 17 MB MP4 in Git (with audio) | Slow clones; binary in history | Move renders to releases/LFS, or git-ignore them |
| `opencode.json` points at an 8B Llama model | Fine for scaffolding, weak for production scripts | Point at a stronger model via OpenRouter |

## License

MIT © 2026 Aagaman-karki — see [LICENSE](LICENSE). Bundled DejaVu fonts retain their own
(Bitstream Vera / DejaVu) licence.
