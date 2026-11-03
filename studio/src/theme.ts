import { Easing, interpolate, spring } from 'remotion';

/**
 * The studio's design system: one palette, one set of gradients, one motion vocabulary.
 *
 * Every scene pulls colour from `PALETTE` and timing from the helpers here so the four beats read as
 * one film. Nothing in this module touches the host's fonts or assets.
 *
 * Palette intent — cinematic warm twilight: deep indigo/violet shadows, a magenta-to-ember transition
 * low in the sky, and gold highlights reserved for the things the viewer must look at (the sun, focal
 * titles, lit windows).
 */
export const PALETTE = {
  /** Near-black violet, used for the deepest shadows and silhouettes. */
  ink: '#0A0614',
  shadowDeep: '#140C28',
  shadow: '#20143C',
  shadowLift: '#2E1C52',
  /** Mid-tone purple for atmospheric bodies and secondary structures. */
  violet: '#4A2A6B',
  dusk: '#6B3475',
  rose: '#B8436A',
  ember: '#E8683F',
  amber: '#FF9A3C',
  gold: '#FFC857',
  goldSoft: '#FFE3A8',
  cream: '#FFF4E1',
  white: '#FFFDF6',
  /** Accent used only for "system" readouts, so they never compete with the warm key light. */
  signal: '#7BD3FF',
} as const;

/** Vertical twilight sky used by every daylight/dusk scene. */
export const SKY = `linear-gradient(180deg,
  ${PALETTE.ink} 0%,
  ${PALETTE.shadowDeep} 22%,
  ${PALETTE.shadow} 42%,
  ${PALETTE.violet} 58%,
  ${PALETTE.rose} 72%,
  ${PALETTE.ember} 86%,
  ${PALETTE.amber} 100%)`;

/** Colder night sky for interior/exterior beats that happen after the Moon is gone. */
export const NIGHT_SKY = `linear-gradient(180deg,
  ${PALETTE.ink} 0%,
  #120B2A 38%,
  #1E1240 62%,
  #3A1C4C 82%,
  #5A2A45 100%)`;

/** Symmetric ease-out used for camera moves and mask reveals. */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
/** Ease-in-out for loops (sweeps, ray rotation, drift). */
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);

/**
 * Clamped, eased interpolation. `range` and `output` follow `interpolate`'s signature, so this is a
 * shorter way to write "animate this between these frames and never overshoot".
 */
export const track = (
  frame: number,
  range: [number, number],
  output: [number, number],
  easing: (input: number) => number = EASE_OUT,
): number =>
  interpolate(frame, range, output, {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Fade a value in over `duration` frames starting at `start`, eased out. */
export const fadeIn = (frame: number, start: number, duration = 18): number =>
  track(frame, [start, start + duration], [0, 1]);

/** Fade a value out over `duration` frames ending at `end`, eased in-out. */
export const fadeOut = (frame: number, end: number, duration = 18): number =>
  track(frame, [end - duration, end], [1, 0], EASE_IN_OUT);

/**
 * Spring-driven entrance progress in `[0, 1]`, for tactile "pops" that easing curves can't give.
 * `delay` is in frames and is measured from the start of the enclosing sequence.
 */
export const pop = (
  frame: number,
  fps: number,
  delay = 0,
  config: { damping?: number; stiffness?: number; mass?: number } = { damping: 16, stiffness: 110, mass: 0.7 },
): number =>
  spring({
    frame: frame - delay,
    fps,
    config,
    durationInFrames: undefined,
  });

/**
 * Camera push: a slow, eased scale about `origin` plus optional rotation. Returned as a CSS
 * `transform` string so a whole scene can be wrapped in it.
 */
export const camera = (
  frame: number,
  frames: number,
  { from = 1, to = 1.06, rotate = 0, origin = '50% 60%' }: { from?: number; to?: number; rotate?: number; origin?: string } = {},
): { transform: string; transformOrigin: string } => ({
  transform: `scale(${track(frame, [0, frames], [from, to], EASE_IN_OUT)}) rotate(${rotate}deg)`,
  transformOrigin: origin,
});

/** Type scale (px) for 1920×1080 titles, so headers keep a consistent hierarchy across scenes. */
export const TYPE = {
  hero: 118,
  header: 82,
  sub: 30,
  eyebrow: 22,
  chip: 18,
} as const;
