#!/usr/bin/env python3
"""Sound design for the "What If…?" episode — synthesised, not sampled.

Every layer is generated from noise and oscillators with numpy, so the bed is reproducible, licence-free
and needs no sample library. Output: 44.1 kHz 16-bit mono WAVs in `public/audio/`, which `EpisodeAudio`
places on the timeline.

    python3 -m pip install numpy        # or use the venv from scripts/tts.py
    cd studio && python3 scripts/sfx.py

Layers, and what each one is for:

| file              | length | where        | design |
| :---------------- | :----- | :----------- | :----- |
| `ambience.wav`    | full   | whole video  | Brown-noise dusk wind (band-limited, slow LFO swell) over a 36/41.5 Hz rumble drone. |
| `ch1-ticks.wav`   | 3.8 s  | frame 0      | Clock ticks that accelerate, then stop dead — the room going quiet before the burst. |
| `ch1-pop.wav`     | 1.0 s  | frame 110    | Pitch-down blip plus a soft noise puff: the Moon bursting like a bubble. |
| `ch2-release.wav` | 3.6 s  | frame 386    | Noise riser into a 95→30 Hz sub drop with a thump and a long floor shake. |
| `ch3-crack.wav`   | 2.0 s  | frame 826    | 6 ms bright noise transient, three inharmonic metallic rings, debris tail. |
| `ch4-alarm.wav`   | 6.0 s  | frame 1236   | Two-tone warning beeps that tighten, then a falling chime as sync is lost. |

The frame numbers above are duplicated (deliberately, they are the mix decision) in
`src/EpisodeAudio.tsx`; if you move an event here, move it there too.
"""

from __future__ import annotations

import argparse
import wave
from pathlib import Path

import numpy as np

SR = 44_100
RNG = np.random.default_rng(20261103)  # fixed seed: same noise every run


# --------------------------------------------------------------------------------------------- helpers


def seconds(n: int) -> np.ndarray:
    return np.arange(n, dtype=np.float64) / SR


def white(n: int) -> np.ndarray:
    return RNG.standard_normal(n)


def spectral(sig: np.ndarray, gain_fn) -> np.ndarray:
    """Shape a signal by scaling its spectrum: `gain_fn(freqs) -> gains`."""
    spectrum = np.fft.rfft(sig)
    freqs = np.fft.rfftfreq(sig.shape[0], 1 / SR)
    return np.fft.irfft(spectrum * gain_fn(freqs), n=sig.shape[0])


def lowpass(sig: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    return spectral(sig, lambda f: 1 / np.sqrt(1 + (f / cutoff) ** (2 * order)))


def highpass(sig: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    return spectral(sig, lambda f: np.sqrt(1 / (1 + (cutoff / np.maximum(f, 1e-6)) ** (2 * order))))


def bandpass(sig: np.ndarray, low: float, high: float, order: int = 2) -> np.ndarray:
    return lowpass(highpass(sig, low, order), high, order)


def env_decay(n: int, attack: float, decay: float) -> np.ndarray:
    t = seconds(n)
    rise = np.clip(t / max(attack, 1e-6), 0, 1)
    return (rise * np.exp(-t / max(decay, 1e-6))).astype(np.float64)


def sweep(f0: float, f1: float, n: int) -> np.ndarray:
    """Sine whose frequency glides f0 → f1 (phase is integrated, so there is no pitch kink)."""
    freq = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR)


def normalize(sig: np.ndarray, peak: float = 1.0) -> np.ndarray:
    top = float(np.max(np.abs(sig))) or 1.0
    return sig * (peak / top)


def pad(sig: np.ndarray, seconds_: float) -> np.ndarray:
    return np.concatenate([sig, np.zeros(int(seconds_ * SR))])


def place(buf: np.ndarray, sig: np.ndarray, at: float, gain: float = 1.0) -> None:
    """Mix `sig` into `buf` at `at` seconds (in place, clipped to the buffer)."""
    start = int(at * SR)
    end = min(start + sig.shape[0], buf.shape[0])
    if start >= buf.shape[0]:
        return
    buf[start:end] += sig[: end - start] * gain


def fade_edges(sig: np.ndarray, fade_in: float = 0.01, fade_out: float = 0.01) -> np.ndarray:
    out = sig.copy()
    a = max(int(fade_in * SR), 1)
    b = max(int(fade_out * SR), 1)
    n = out.shape[0]
    # A clip shorter than its fades (a 3-second cut gets a 2.4 s fade-out) has to scale them down
    # instead of multiplying by a longer window, which broadcasts to a ValueError.
    if n and a + b > n:
        scale = n / (a + b)
        a, b = max(int(a * scale), 1), max(int(b * scale), 1)
    out[:a] *= np.linspace(0, 1, a)
    out[-b:] *= np.linspace(1, 0, b)
    return out


def write_wav(path: Path, sig: np.ndarray, peak: float) -> None:
    sig = fade_edges(normalize(sig, peak))
    pcm = (np.clip(sig, -1, 1) * 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as fh:
        fh.setnchannels(1)
        fh.setsampwidth(2)
        fh.setframerate(SR)
        fh.writeframes(pcm.tobytes())
    rms = 20 * np.log10(float(np.sqrt(np.mean(sig**2))) + 1e-12)
    print(f"  {path.name:<18} {sig.shape[0] / SR:5.2f}s  peak {peak:.2f}  rms {rms:6.1f} dBFS")


# ----------------------------------------------------------------------------------------------- layers


def ambience(duration: float) -> np.ndarray:
    n = int(duration * SR)
    t = seconds(n)

    # Dusk wind: brown noise (integrated white) with the highs taken off, swelling slowly.
    brown = np.cumsum(white(n))
    brown -= np.linspace(brown[0], brown[-1], n)  # remove the integration ramp
    wind = bandpass(brown, 45, 380, 2)
    swell = 0.75 + 0.25 * np.sin(2 * np.pi * 0.055 * t) + 0.12 * np.sin(2 * np.pi * 0.013 * t + 1.7)
    wind = normalize(wind) * swell

    # Sub-bass drone: two detuned sines an atmosphere below the wind.
    drone = 0.6 * np.sin(2 * np.pi * 36 * t) + 0.4 * np.sin(2 * np.pi * 41.5 * t + 0.6)
    drone *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.035 * t)

    # Airy top: a whisper of filtered noise so the bed is not a pure low rumble.
    air = normalize(bandpass(white(n), 1_400, 3_200, 2)) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.09 * t + 0.4))

    bed = 0.55 * wind + 0.32 * drone + 0.13 * air
    return fade_edges(bed, fade_in=1.2, fade_out=2.4)


def ticks() -> np.ndarray:
    """Accelerating clock ticks that stop — the room holding its breath before the burst."""
    total = 3.8
    buf = np.zeros(int(total * SR))
    for at in (0.25, 0.95, 1.60, 2.18, 2.66, 3.02, 3.28):
        n = int(0.06 * SR)
        tick = highpass(white(n), 2_600, 2) * env_decay(n, 0.0008, 0.006)
        tick += 0.5 * np.sin(2 * np.pi * 2_400 * seconds(n)) * env_decay(n, 0.001, 0.008)
        place(buf, normalize(tick, 0.85), at)
    return buf


def pop() -> np.ndarray:
    total = 1.0
    n = int(total * SR)
    buf = np.zeros(n)

    blip = sweep(760, 130, int(0.22 * SR)) * env_decay(int(0.22 * SR), 0.002, 0.07)
    place(buf, normalize(blip, 0.9), 0.0)

    puff_n = int(0.55 * SR)
    puff = lowpass(white(puff_n), 1_100, 2) * env_decay(puff_n, 0.004, 0.16)
    place(buf, normalize(puff, 0.5), 0.01)

    click_n = int(0.05 * SR)
    click = highpass(white(click_n), 3_500, 2) * env_decay(click_n, 0.0005, 0.004)
    place(buf, normalize(click, 0.35), 0.0)
    return buf


def release() -> np.ndarray:
    """Gravity letting go: riser, sub drop, floor shake."""
    total = 3.6
    buf = np.zeros(int(total * SR))

    riser_n = int(0.75 * SR)
    riser = bandpass(white(riser_n), 500, 6_000, 2)
    riser *= np.linspace(0.05, 1.0, riser_n) ** 2
    place(buf, normalize(riser, 0.5), 0.0)

    drop_n = int(1.9 * SR)
    drop = sweep(95, 30, drop_n) * env_decay(drop_n, 0.006, 0.55)
    drop += 0.35 * sweep(150, 48, drop_n) * env_decay(drop_n, 0.004, 0.22)
    place(buf, normalize(drop, 0.95), 0.75)

    thump_n = int(0.7 * SR)
    thump = np.sin(2 * np.pi * 44 * seconds(thump_n)) * env_decay(thump_n, 0.002, 0.18)
    place(buf, normalize(thump, 0.8), 0.76)

    # Long low shake: the furniture leaving the floor.
    shake_n = buf.shape[0] - int(0.78 * SR)
    shake = lowpass(white(shake_n), 120, 2) * env_decay(shake_n, 0.05, 1.1)
    place(buf, normalize(shake, 0.35), 0.78)
    return buf


def crack() -> np.ndarray:
    total = 2.0
    buf = np.zeros(int(total * SR))

    trans_n = int(0.09 * SR)
    transient = highpass(white(trans_n), 1_800, 2) * env_decay(trans_n, 0.0004, 0.012)
    place(buf, normalize(transient, 0.95), 0.0)

    # Inharmonic partials read as glass/energy rather than a drum.
    for freq, decay, gain in ((1_830, 0.42, 0.30), (2_745, 0.30, 0.22), (4_210, 0.20, 0.16), (6_130, 0.12, 0.10)):
        ring_n = int(1.2 * SR)
        ring = np.sin(2 * np.pi * freq * seconds(ring_n) + 0.3) * env_decay(ring_n, 0.001, decay)
        place(buf, ring, 0.005, gain)

    debris_n = int(1.6 * SR)
    debris = bandpass(white(debris_n), 400, 4_500, 2) * env_decay(debris_n, 0.004, 0.35)
    place(buf, normalize(debris, 0.28), 0.02)

    shimmer_n = int(1.4 * SR)
    shimmer = highpass(white(shimmer_n), 5_500, 2) * env_decay(shimmer_n, 0.02, 0.5)
    place(buf, normalize(shimmer, 0.18), 0.03)
    return buf


def alarm() -> np.ndarray:
    """Sync warning: beeps that tighten, then a falling chime as the timeline gives up."""
    total = 6.0
    buf = np.zeros(int(total * SR))

    def beep(freq: float, length: float) -> np.ndarray:
        n = int(length * SR)
        t = seconds(n)
        tone = np.sin(2 * np.pi * freq * t) + 0.45 * np.sin(2 * np.pi * freq * 2 * t)
        tone += 0.2 * np.sin(2 * np.pi * freq * 3 * t)
        return lowpass(tone, 5_000, 2) * env_decay(n, 0.012, 0.16)

    # Gaps shrink 0.95 → 0.62 s, so the warning feels like it is speeding up on its own.
    at = 0.10
    gap = 0.95
    for index in range(5):
        place(buf, normalize(beep(880 if index % 2 == 0 else 660, 0.22), 0.5), at)
        at += gap
        gap = max(0.62, gap - 0.08)

    chime_n = int(2.2 * SR)
    chime = (
        0.5 * sweep(1_046, 512, chime_n)
        + 0.34 * sweep(1_568, 764, chime_n)
        + 0.16 * sweep(2_093, 1_020, chime_n)
    ) * env_decay(chime_n, 0.004, 0.75)
    place(buf, normalize(chime, 0.7), at + 0.25)
    return buf


# ------------------------------------------------------------------------------------------------- main


def main() -> int:
    studio = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out-dir", type=Path, default=studio / "public" / "audio")
    parser.add_argument("--duration", type=float, default=1600 / 30, help="episode length in seconds (1600 frames)")
    args = parser.parse_args()

    layers = [
        ("ambience.wav", ambience(args.duration), 0.30),
        ("ch1-ticks.wav", ticks(), 0.55),
        ("ch1-pop.wav", pop(), 0.85),
        ("ch2-release.wav", release(), 0.90),
        ("ch3-crack.wav", crack(), 0.85),
        ("ch4-alarm.wav", alarm(), 0.70),
    ]
    print(f"writing {len(layers)} layers to {args.out_dir}")
    for name, sig, peak in layers:
        write_wav(args.out_dir / name, sig, peak)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
