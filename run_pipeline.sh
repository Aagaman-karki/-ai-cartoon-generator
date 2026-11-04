#!/usr/bin/env bash
#
# End-to-end: prompt → animation_spec.json → rendered MP4.
#
#   ./run_pipeline.sh --prompt "What if the earth stopped rotating?"
#   ./run_pipeline.sh --spec animation_spec.json        # render an existing spec, no API call
#   ./run_pipeline.sh --prompt "…" --out out/earth.mp4
#   ./run_pipeline.sh --prompt "…" --model gemini-3.8-flash --frames 3600 --scenes 6-8
#
# Generation flags (--model, --frames, --scenes) are forwarded to generate_spec.js; see its --help.
#
# Steps, each of which fails loudly instead of handing a broken spec to the renderer:
#   1. generate   — generate_spec.js writes a validated AnimationSpec (needs a Gemini key)
#   2. check      — the file exists, parses as JSON, and has scenes summing to a real duration
#   2b. score      — spec_audio.py writes the voiceover, bed and stings + the manifest they're
#                    placed by (skipped with a warning if Python is unavailable)
#   3. render     — Remotion renders it through the Spec-External composition
#
# Why generate_spec.js and not generate.js: generate.js is the generic prompt → JSON utility and
# returns whatever shape the model invents. generate_spec.js enforces the AnimationSpec contract,
# which is what Spec-External (and therefore this pipeline) can actually render.
#
# The spec is passed to Remotion with --props, so nothing has to be imported into src/specs/index.ts.
# Set CONCURRENCY=2 on a small machine (Remotion otherwise uses half the cores).

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

SPEC_FILE="animation_spec.json"
OUT_FILE=""
PROMPT=""
MODEL=""
FRAMES=""
SCENES=""
SKIP_GENERATE=0

usage() {
  sed -n '2,24p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt) PROMPT="${2:-}"; shift 2 ;;
    --spec) SPEC_FILE="${2:-}"; shift 2 ;;
    --out) OUT_FILE="${2:-}"; shift 2 ;;
    --model) MODEL="${2:-}"; shift 2 ;;
    --frames) FRAMES="${2:-}"; shift 2 ;;
    --scenes) SCENES="${2:-}"; shift 2 ;;
    --skip-generate) SKIP_GENERATE=1; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown argument: $1" >&2; usage 1 ;;
  esac
done

if [[ $SKIP_GENERATE -eq 0 && -z "$PROMPT" ]]; then
  echo "error: --prompt is required unless you pass --skip-generate --spec <file>" >&2
  usage 1
fi

# 1. Generate -------------------------------------------------------------------------------------
if [[ $SKIP_GENERATE -eq 0 ]]; then
  echo "==> Generating spec for: $PROMPT"
  GENERATE_ARGS=(--prompt "$PROMPT" --out "$SPEC_FILE")
  [[ -n "$MODEL" ]] && GENERATE_ARGS+=(--model "$MODEL")
  [[ -n "$FRAMES" ]] && GENERATE_ARGS+=(--frames "$FRAMES")
  [[ -n "$SCENES" ]] && GENERATE_ARGS+=(--scenes "$SCENES")
  node generate_spec.js "${GENERATE_ARGS[@]}"
else
  echo "==> Skipping generation, using $SPEC_FILE"
fi

# 2. Check ----------------------------------------------------------------------------------------
[[ -f "$SPEC_FILE" ]] || { echo "error: $SPEC_FILE was not created" >&2; exit 1; }
[[ -s "$SPEC_FILE" ]] || { echo "error: $SPEC_FILE is empty" >&2; exit 1; }

read -r SLUG SPEC_FRAMES SCENE_COUNT CUES <<<"$(node -e '
  const fs = require("node:fs");
  const spec = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const scenes = Array.isArray(spec.scenes) ? spec.scenes : [];
  if (scenes.length === 0) { console.error("no scenes in the spec"); process.exit(1); }
  const frames = scenes.reduce((sum, scene) => sum + (Number(scene.durationFrames) || 0), 0);
  if (!(frames > 0)) { console.error("scene durations sum to 0"); process.exit(1); }
  console.log([spec.slug || "spec", frames, scenes.length, (spec.narration || []).length].join(" "));
' "$SPEC_FILE")" || { echo "error: $SPEC_FILE is not a usable spec (see above)" >&2; exit 1; }

echo "==> Spec OK: $SPEC_FILE — $SCENE_COUNT scenes, $CUES narration cues, $SPEC_FRAMES frames ($(awk "BEGIN{printf \"%.1f\", $SPEC_FRAMES/30}")s)"

[[ -n "$OUT_FILE" ]] || OUT_FILE="studio/out/${SLUG}.mp4"
mkdir -p "$(dirname "$OUT_FILE")"

# Checked before the audio stage, which is slow and pointless if the render cannot start.
# `npx remotion` in an uninstalled tree answers with "could not determine executable to run", which
# reads like a broken repo rather than a missing install.
REMOTION_BIN="studio/node_modules/.bin/remotion"
[[ -f "$REMOTION_BIN.exe" ]] && REMOTION_BIN="$REMOTION_BIN.exe"
if [[ ! -x "$REMOTION_BIN" ]]; then
  echo "error: Remotion is not installed in studio/node_modules." >&2
  echo "       Run:  cd studio && npm install && npx remotion browser ensure" >&2
  exit 1
fi

# 2b. Score ---------------------------------------------------------------------------------------
# Must happen before the bundle is built: SpecMovie imports src/spec/audio/manifest.json, so the
# manifest has to be on disk or the render comes out silent. Missing Python is a warning, not an error.
PYTHON_BIN="${SPEC_AUDIO_PYTHON:-}"
if [[ -z "$PYTHON_BIN" ]]; then
  for candidate in "$PWD/.audiovenv/bin/python" python3; do
    if [[ -x "$candidate" ]] || command -v "$candidate" >/dev/null 2>&1; then PYTHON_BIN="$candidate"; break; fi
  done
fi
if [[ -n "$PYTHON_BIN" ]]; then
  echo "==> Scoring audio: voiceover + bed + stings ($PYTHON_BIN)"
  "$PYTHON_BIN" studio/scripts/spec_audio.py --spec "$SPEC_FILE" \
    || echo "warning: audio stage failed — rendering without voiceover" >&2
else
  echo "==> No Python interpreter found — rendering without voiceover" >&2
fi

# 3. Render ---------------------------------------------------------------------------------------
# Rendering from studio/ so Remotion picks up its package.json/config; --props is resolved from there.
SPEC_ABS="$(cd "$(dirname "$SPEC_FILE")" && pwd)/$(basename "$SPEC_FILE")"
OUT_ABS="$(cd "$(dirname "$OUT_FILE")" && pwd)/$(basename "$OUT_FILE")"

RENDER_ARGS=(render Spec-External "$OUT_ABS" "--props=$SPEC_ABS")
if [[ -n "${CONCURRENCY:-}" ]]; then RENDER_ARGS+=("--concurrency=$CONCURRENCY"); fi

echo "==> Rendering Spec-External → $OUT_FILE"
(cd studio && "./node_modules/.bin/${REMOTION_BIN##*/}" "${RENDER_ARGS[@]}")

echo "==> Done: $OUT_FILE"
