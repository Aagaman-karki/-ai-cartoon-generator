#!/usr/bin/env python3
"""Chapter voiceover for the "What If…?" episode.

Renders every `chapters[].voiceover` in `narration.json` to a 44.1 kHz mono WAV, using Kokoro — an
open-source neural TTS model (Apache-2.0 weights) running on ONNX Runtime, so there is no PyTorch
install and no GPU requirement.

Setup (outside the repo, ~360 MB of model files):

    python3 -m venv /tmp/ttsenv
    /tmp/ttsenv/bin/pip install kokoro-onnx
    mkdir -p /tmp/kokoro && cd /tmp/kokoro
    curl -L -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
    curl -L -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

Then, from `studio/`:

    /tmp/ttsenv/bin/python scripts/tts.py                    # writes public/audio/ch{1..4}-vo.wav
    /tmp/ttsenv/bin/python scripts/tts.py --voice am_onyx    # other Kokoro voice

The generated WAVs are committed, so a render needs neither Python nor the model. Re-run this only when
the script text or voice changes.

Kokoro emits 24 kHz float32 samples, so each clip is peak-normalised, padded with a short tail and
written as 44.1 kHz 16-bit PCM — the format Remotion decodes most predictably in Chrome.
"""

from __future__ import annotations

import argparse
import json
import os
import wave
from pathlib import Path

import numpy as np

DEFAULT_MODEL = os.environ.get("KOKORO_MODEL", "/tmp/kokoro/kokoro-v1.0.onnx")
DEFAULT_VOICES = os.environ.get("KOKORO_VOICES", "/tmp/kokoro/voices-v1.0.bin")
OUT_RATE = 44_100
TAIL_SECONDS = 0.35


def resample(samples: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    """Linear resample. Good enough for speech at 24 kHz → 44.1 kHz."""
    if src_rate == dst_rate:
        return samples
    duration = samples.shape[0] / src_rate
    dst_n = int(round(duration * dst_rate))
    src_x = np.arange(samples.shape[0], dtype=np.float64)
    dst_x = np.linspace(0.0, samples.shape[0] - 1, dst_n)
    return np.interp(dst_x, src_x, samples).astype(np.float32)


def write_wav(path: Path, samples: np.ndarray, rate: int) -> None:
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    if peak > 0:
        samples = samples * (10 ** (-1.5 / 20) / peak)  # leave 1.5 dB of headroom
    pcm = np.clip(samples, -1.0, 1.0)
    pcm = (pcm * 32767.0).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as fh:
        fh.setnchannels(1)
        fh.setsampwidth(2)
        fh.setframerate(rate)
        fh.writeframes(pcm.tobytes())


def main() -> int:
    studio = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--manifest", type=Path, default=studio / "scripts" / "narration.json")
    parser.add_argument("--out-dir", type=Path, default=studio / "public" / "audio")
    parser.add_argument("--model", type=Path, default=Path(DEFAULT_MODEL))
    parser.add_argument("--voices", type=Path, default=Path(DEFAULT_VOICES))
    parser.add_argument("--voice", default=None, help="override the manifest voice, e.g. am_onyx")
    parser.add_argument("--speed", type=float, default=None, help="override the manifest speed")
    parser.add_argument("--only", default=None, help="render a single chapter id (ch1…ch4)")
    args = parser.parse_args()

    for label, path in (("model", args.model), ("voices", args.voices)):
        if not path.exists():
            parser.error(f"{label} not found at {path} — see the setup block in this file's docstring")

    from kokoro_onnx import Kokoro  # imported late so --help works without the dependency

    manifest = json.loads(args.manifest.read_text())
    voice = args.voice or manifest.get("voice", "af_heart")
    speed = args.speed if args.speed is not None else manifest.get("speed", 1.0)

    print(f"loading Kokoro ({args.model.name}) …")
    kokoro = Kokoro(str(args.model), str(args.voices))

    for chapter in manifest["chapters"]:
        if args.only and chapter["id"] != args.only:
            continue
        text = chapter["voiceover"]
        samples, rate = kokoro.create(text, voice=voice, speed=speed, lang="en-us")
        samples = resample(np.asarray(samples, dtype=np.float32), rate, OUT_RATE)
        samples = np.concatenate([samples, np.zeros(int(TAIL_SECONDS * OUT_RATE), dtype=np.float32)])

        out = args.out_dir / f"{chapter['id']}-vo.wav"
        write_wav(out, samples, OUT_RATE)
        seconds = samples.shape[0] / OUT_RATE
        rms = 20 * np.log10(float(np.sqrt(np.mean(samples**2))) + 1e-9)
        print(f"  {out.name:<12} {seconds:5.2f}s  rms {rms:6.1f} dBFS  “{text[:48]}…”")

    print(f"voiceover written to {args.out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
