#!/usr/bin/env python3
"""Per-spec soundtrack: voiceover for every narration cue, an ambience bed, and scene stings.

`Spec-*` / `Spec-External` renders are driven by an `AnimationSpec` JSON, so the soundtrack cannot be
hand-placed in a component the way `EpisodeAudio` does it for the hand-authored cut. This script reads a
spec and writes what that episode needs:

    spec/<slug>/vo-<n>.wav        one Kokoro clip per `narration[]` cue, at `frameStart`
    spec/<slug>/bed.wav           ambience filling the whole episode
    spec/<slug>/sting-<tag>.wav   one sting per distinct `scenes[].sfx` tag
    src/spec/audio/manifest.json  where each file goes on the timeline (merged, keyed by slug)

`SpecMovie` imports that manifest and renders an `<Audio>` per entry, so both `Spec-<slug>` and
`Spec-External` get sound with no per-episode React.

    .audiovenv/bin/python scripts/spec_audio.py --spec src/specs/moon-vanished.json
    .audiovenv/bin/python scripts/spec_audio.py --spec ../animation_spec.json --no-vo
    .audiovenv/bin/python scripts/spec_audio.py --spec x.json --voice am_onyx --speed 1.05

Setup (once, outside the repo — same model as `tts.py`):

    python3 -m venv .audiovenv && .audiovenv/bin/pip install kokoro-onnx
    mkdir -p ~/kokoro && cd ~/kokoro
    curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
    curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

The model paths default to `$KOKORO_MODEL` / `$KOKORO_VOICES` or `~/kokoro/…`. Without the model the
script still writes the bed and stings and simply skips the voiceover with a warning, so a machine with
Python but no 340 MB download is not blocked.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import sys
from pathlib import Path

import numpy as np

# Reuse the existing generators instead of growing a third audio implementation.
SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))
import sfx  # noqa: E402  (path set up above)
import tts  # noqa: E402

STUDIO = SCRIPTS.parent
OUT_RATE = 44_100
DEFAULT_MODEL = os.environ.get("KOKORO_MODEL", str(Path.home() / "kokoro" / "kokoro-v1.0.onnx"))
DEFAULT_VOICES = os.environ.get("KOKORO_VOICES", str(Path.home() / "kokoro" / "voices-v1.0.bin"))
VO_TAIL_SECONDS = 0.25


# ---------------------------------------------------------------------------------------- new stings

def rumble() -> np.ndarray:
    """Low roll under a reveal: filtered noise with a slow sub swell."""
    total = 2.4
    n = int(total * OUT_RATE)
    t = np.arange(n) / OUT_RATE
    body = sfx.lowpass(sfx.white(n), 90, 2) * sfx.env_decay(n, 0.08, 0.85)
    sub = np.sin(2 * np.pi * 34 * t) * sfx.env_decay(n, 0.05, 0.65)
    return sfx.normalize(0.75 * sfx.normalize(body) + 0.45 * sfx.normalize(sub))


def whoosh() -> np.ndarray:
    """Air passing: band noise swept up then cut, for scene transitions."""
    total = 1.5
    n = int(total * OUT_RATE)
    band = sfx.bandpass(sfx.white(n), 380, 7_000, 2)
    shape = np.concatenate([
        np.linspace(0.05, 1.0, int(n * 0.55)) ** 2,
        np.linspace(1.0, 0.0, n - int(n * 0.55)) ** 1.6,
    ])
    return sfx.normalize(band * shape)


def hum_stop() -> np.ndarray:
    """A city/machine hum that dies — the sound of something switching off."""
    total = 2.6
    n = int(total * OUT_RATE)
    t = np.arange(n) / OUT_RATE
    hum = 0.5 * np.sin(2 * np.pi * 110 * t) + 0.3 * np.sin(2 * np.pi * 165 * t)
    hum += 0.2 * sfx.normalize(sfx.bandpass(sfx.white(n), 200, 900, 2))
    gate = np.clip(1.0 - t / (total * 0.85), 0, 1) ** 1.7
    return sfx.normalize(hum * gate)


def impact() -> np.ndarray:
    """Short punch with a tail: a single beat landing."""
    total = 1.1
    n = int(total * OUT_RATE)
    thump = np.sin(2 * np.pi * 52 * np.arange(n) / OUT_RATE) * sfx.env_decay(n, 0.003, 0.20)
    air = sfx.normalize(sfx.bandpass(sfx.white(n), 300, 4_000, 2) * sfx.env_decay(n, 0.002, 0.09))
    return sfx.normalize(0.9 * sfx.normalize(thump) + 0.35 * air)


def riser() -> np.ndarray:
    """Tension climbing: swept noise and a rising tone, cut dead at the top."""
    total = 2.8
    n = int(total * OUT_RATE)
    climb = np.linspace(0.0, 1.0, n) ** 2.2
    air = sfx.normalize(sfx.bandpass(sfx.white(n), 400, 9_000, 2)) * climb
    tone = sfx.sweep(160, 620, n) * (0.30 * climb)
    return sfx.normalize(air + tone)


def heartbeat() -> np.ndarray:
    """Two low thumps and a quieter echo — fear under the frame."""
    total = 1.8
    n = int(total * OUT_RATE)
    out = np.zeros(n)
    for start, gain in ((0.0, 1.0), (0.27, 0.62), (0.95, 0.80), (1.22, 0.50)):
        i = int(start * OUT_RATE)
        m = n - i
        out[i:] += gain * sfx.sweep(58, 40, m) * sfx.env_decay(m, 0.004, 0.11)
    return sfx.normalize(out)


def shimmer() -> np.ndarray:
    """High, glassy confirmation for a resolution beat."""
    total = 2.0
    n = int(total * OUT_RATE)
    t = np.arange(n) / OUT_RATE
    tone = sum(
        0.4 * np.sin(2 * np.pi * f * t + phase) * sfx.env_decay(n, 0.01, decay)
        for f, decay, phase in ((1_320, 0.55, 0.0), (1_760, 0.42, 0.7), (2_640, 0.30, 1.3))
    )
    return sfx.normalize(tone)


# `scenes[].sfx` tags are free-form, so unknown tags warn instead of failing the build. The generator
# prompt (`SFX` list in generate_spec.js) offers ambience, clock_tick, pop, sub_drop, riser,
# glass_crack, rumble, alarm, whoosh and heartbeat — every one of those must resolve here.
STINGS = {
    "pop": (sfx.pop, 0.85),
    "clock_tick": (sfx.ticks, 0.55),
    "glass_crack": (sfx.crack, 0.85),
    "riser": (riser, 0.60),
    "heartbeat": (heartbeat, 0.80),
    "release": (sfx.release, 0.90),
    "sub_drop": (sfx.release, 0.85),
    "crack": (sfx.crack, 0.85),
    "fracture": (sfx.crack, 0.75),
    "alarm": (sfx.alarm, 0.70),
    "tick": (sfx.ticks, 0.55),
    "ticks": (sfx.ticks, 0.55),
    "tick_stop": (sfx.ticks, 0.50),
    "city_hum_stop": (hum_stop, 0.55),
    "reverse_whoosh": (whoosh, 0.60),
    "whoosh": (whoosh, 0.60),
    "rumble": (rumble, 0.65),
    "thunder": (rumble, 0.65),
    "impact": (impact, 0.80),
    "shimmer": (shimmer, 0.55),
}

# Cover the whole episode, not just the scenes — no sting needed.
BED_TAGS = {"ambience", "bed", "wind"}


# ------------------------------------------------------------------------------------------- helpers

def frame_total(spec: dict) -> tuple[int, int]:
    """(fps, frames) — frames always sum from the scenes, matching `timingFor` on the TS side."""
    fps = int(spec.get("fps") or 30)
    frames = sum(int(scene.get("durationFrames") or 0) for scene in spec.get("scenes") or [])
    return fps, frames


def write_clip(path: Path, samples: np.ndarray, peak: float) -> tuple[float, float]:
    """Write a fad-ed, peak-normalised 44.1 kHz mono WAV. Returns (seconds, rms dBFS)."""
    samples = np.asarray(samples, dtype=np.float64)
    if samples.size:
        samples = sfx.fade_edges(sfx.normalize(samples, peak), fade_in=0.005, fade_out=0.02)
    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    import wave

    with wave.open(str(path), "wb") as fh:
        fh.setnchannels(1)
        fh.setsampwidth(2)
        fh.setframerate(OUT_RATE)
        fh.writeframes(pcm.tobytes())
    seconds = samples.shape[0] / OUT_RATE
    rms = 20 * math.log10(float(np.sqrt(np.mean(samples**2 if samples.size else [0]))) + 1e-12)
    return seconds, rms


def voiceover(cues: list[dict], fps: int, out_dir: Path, args) -> list[dict]:
    """One Kokoro clip per narration cue. Missing model → warning, not a failure."""
    if args.no_vo or not cues:
        return []
    model, voices = Path(args.model), Path(args.voices)
    missing = [str(p) for p in (model, voices) if not p.exists()]
    if missing:
        print(f"! voiceover skipped — model files not found: {', '.join(missing)}")
        print("  see the setup block in scripts/spec_audio.py, or pass --model/--voices")
        return []

    from kokoro_onnx import Kokoro

    print(f"loading Kokoro ({model.name}) …")
    kokoro = Kokoro(str(model), str(voices))
    voice = args.voice
    entries: list[dict] = []

    for index, cue in enumerate(cues):
        text = (cue.get("text") or "").strip()
        if not text:
            continue
        samples, rate = kokoro.create(text, voice=cue.get("voice") or voice, speed=args.speed, lang="en-us")
        samples = tts.resample(np.asarray(samples, dtype=np.float32), rate, OUT_RATE)
        samples = np.concatenate([samples, np.zeros(int(VO_TAIL_SECONDS * OUT_RATE), dtype=np.float32)])

        file = out_dir / f"vo-{index}.wav"
        seconds, rms = write_clip(file, samples, peak=0.95)
        frames = max(1, int(round(seconds * fps)))
        entries.append({
            "index": index,
            "text": text,
            "from": int(cue.get("frameStart") or 0),
            "frames": frames,
            "file": f"audio/spec/{out_dir.name}/{file.name}",
        })
        print(f"  {file.name:<10} {seconds:5.2f}s  rms {rms:6.1f} dBFS  @{entries[-1]['from']:<5} “{text[:44]}…”")

    # Two voices talking over each other is a script bug worth flagging, not a silent mix.
    for current, following in zip(entries, entries[1:]):
        overlap = current["from"] + current["frames"] - following["from"]
        if overlap > 12:
            print(f"! vo-{current['index']} overruns the next cue by {overlap} frames — shorten the line")
    return entries


def merge_manifest(path: Path, slug: str, entry: dict) -> None:
    """Replace this slug's entry, keeping every other slug's soundtrack intact."""
    manifest: dict = {}
    if path.exists():
        try:
            manifest = json.loads(path.read_text()) or {}
        except json.JSONDecodeError:
            print(f"! {path.name} was not valid JSON — rewriting it")
            manifest = {}
    manifest[slug] = entry
    manifest = {key: manifest[key] for key in sorted(manifest)}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--spec", type=Path, required=True, help="AnimationSpec JSON to score")
    parser.add_argument("--out-dir", type=Path, default=STUDIO / "public" / "audio" / "spec")
    parser.add_argument("--manifest", type=Path, default=STUDIO / "src" / "spec" / "audio" / "manifest.json")
    parser.add_argument("--voice", default="af_heart")
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--voices", default=DEFAULT_VOICES)
    parser.add_argument("--no-vo", action="store_true", help="skip Kokoro, keep bed + stings")
    parser.add_argument("--no-bed", action="store_true", help="skip the ambience bed")
    parser.add_argument("--keep", action="store_true", help="keep existing clips in the output directory")
    args = parser.parse_args()

    spec = json.loads(args.spec.read_text())
    if not isinstance(spec, dict):
        parser.error(f"{args.spec} is not a spec object")
    slug = (spec.get("slug") or "").strip()
    if not slug:
        parser.error(f"{args.spec} has no `slug` — the manifest is keyed by it")

    fps, frames = frame_total(spec)
    if frames <= 0:
        parser.error(f"{args.spec} has no scene durations")
    duration = frames / fps
    out_dir: Path = args.out_dir / slug
    if out_dir.exists() and not args.keep:
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Clear this slug's cues *before* writing new clips: the old files are gone, and a crash midway
    # would otherwise leave the manifest pointing at WAVs that no longer exist, failing the render.
    merge_manifest(args.manifest, slug, {
        "slug": slug,
        "fps": fps,
        "durationFrames": frames,
        "bed": None,
        "voiceover": [],
        "events": [],
    })

    print(f"{slug}: {len(spec.get('scenes') or [])} scenes, {frames} frames, {duration:.1f}s")

    bed = None
    if not args.no_bed:
        seconds, rms = write_clip(out_dir / "bed.wav", sfx.ambience(duration), peak=0.30)
        bed = f"audio/spec/{slug}/bed.wav"
        print(f"  bed.wav    {seconds:5.2f}s  rms {rms:6.1f} dBFS")

    events: list[dict] = []
    unknown: set[str] = set()
    starts, cursor = {}, 0
    for scene in spec.get("scenes") or []:
        starts[scene.get("id")] = cursor
        cursor += int(scene.get("durationFrames") or 0)

    for scene in spec.get("scenes") or []:
        for tag in scene.get("sfx") or []:
            key = str(tag).lower()
            if key in BED_TAGS:
                continue
            if key not in STINGS:
                unknown.add(key)
                continue
            generator, peak = STINGS[key]
            file = out_dir / f"sting-{key}.wav"
            if not file.exists():
                seconds, rms = write_clip(file, generator(), peak)
                print(f"  sting-{key:<10} {seconds:5.2f}s  rms {rms:6.1f} dBFS")
            seconds = (_wav_seconds(file))
            events.append({
                "tag": key,
                "from": starts.get(scene.get("id"), 0),
                "frames": max(1, int(round(seconds * fps))),
                "volume": 0.85,
                "file": f"audio/spec/{slug}/{file.name}",
            })

    if unknown:
        print(f"! no sting for tag(s) {', '.join(sorted(unknown))} — known: {', '.join(sorted(STINGS))}")

    entries = voiceover(spec.get("narration") or [], fps, out_dir, args)

    merge_manifest(args.manifest, slug, {
        "slug": slug,
        "fps": fps,
        "durationFrames": frames,
        "voice": None if not entries else args.voice,
        "bed": bed,
        "voiceover": entries,
        "events": events,
    })

    print(f"→ {len(entries)} voice clip(s), {len(events)} event(s), bed {'yes' if bed else 'no'}")
    print(f"→ manifest {args.manifest}")
    return 0


def _wav_seconds(path: Path) -> float:
    import wave

    with wave.open(str(path), "rb") as fh:
        return fh.getnframes() / fh.getframerate()


if __name__ == "__main__":
    raise SystemExit(main())
