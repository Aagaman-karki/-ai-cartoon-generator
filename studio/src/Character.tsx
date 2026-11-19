import React, { useId } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SANS_BOLD } from './fonts';
import { PALETTE } from './theme';
import type { CharacterAction, CharacterExpression } from './spec/types';

/**
 * The studio's stylised vector character: a semi-chibi figure in a black hoodie, slate cargo pants and
 * white sneakers, drawn as a single SVG so it scales cleanly at any size.
 *
 * Position is given in composition pixels and refers to the character's **feet**; `scale` multiplies
 * the base 160×320 figure. All motion derives from `useCurrentFrame()` — breathing, blinking, arm
 * springs and the panicked jitter are deterministic, so renders repeat exactly.
 *
 * Props are intentionally small: scenes choose a pose (`action`) and a face (`expression`) and may
 * pass `actionStart` to have the pose change spring in mid-scene.
 *
 * Faces are a table (`FACES`), not a chain of ternaries, and it is typed `Record<CharacterExpression,
 * Face>` so adding an expression to the schema fails the typecheck until it gets a face. Every
 * expression changes at least two of brows / eyes / mouth, so it still reads at the small scales the
 * factory uses (`scale` well under 1) and never relies on a single exaggerated feature.
 */

export type CharacterProps = {
  /** Horizontal position of the character's center, in composition pixels. */
  x: number;
  /** Vertical position of the character's feet, in composition pixels. */
  y: number;
  /** Uniform scale applied to the base 160×320 figure. */
  scale?: number;
  /** Pose: `panicked` throws the arms up and adds a nervous shake. */
  action?: CharacterAction;
  /** Face: one of the eight expressions in `FACES`. */
  expression?: CharacterExpression;
  /** Frame (local to the scene) at which the current `action` began, used to spring the pose. */
  actionStart?: number;
  /** Mirror the figure horizontally. */
  flip?: boolean;
  /** Draw the soft contact shadow under the feet. */
  shadow?: boolean;
};

const HAIR = '#141020';
/** Brows are lifted off pure black: the hairline covers most of the forehead, and a brow matching the
 * hair disappears into it exactly when an expression raises it. */
const BROW = '#2C2238';
const HOODIE = '#1C1628';
const HOODIE_SHADE = '#120D1B';
const HOODIE_LIGHT = '#2A2138';
const PANTS = '#414D66';
const PANTS_SHADE = '#333E54';
const SKIN = '#FFF1DF';
const SHOE = '#F4EFE3';
const MOUTH = '#3A1E2B';
const TEETH = '#FFFDF6';
const OUTLINE = '#0D0917';

/** Eye centres, used by every eye shape. */
const EYE = { left: 66, right: 94, y: 96 };
/** Mouth centre. */
const MOUTH_Y = 116;

type EyeShape = 'dot' | 'wide' | 'bright' | 'squint' | 'happy';
type MouthShape = 'neutral' | 'smile' | 'grin' | 'open' | 'small' | 'frownSmall' | 'frownWide' | 'wavy';

type Face = {
  /** Extra head rotation in degrees, added to the idle sway. */
  tilt: number;
  /** Whole-brow vertical offset; negative raises the brows. */
  browLift: number;
  /** Extra offset of the *inner* brow ends; negative lifts the inner ends (worry). */
  browInner: number;
  /** Extra offset of the *left* inner brow end only, for a one-brow-raised look. */
  browSkew?: number;
  /** Upward bow of the brow line in pixels (0 = straight). */
  browArch: number;
  eye: EyeShape;
  /** Eye centres are nudged by this much, so a face can glance somewhere without moving the head. */
  glance?: readonly [number, number];
  /** Shrink the eye relative to its shape default. */
  eyeScale?: number;
  mouth: MouthShape;
  /** Cheek blush opacity. */
  cheek: number;
};

const FACES: Record<CharacterExpression, Face> = {
  neutral: { tilt: 0, browLift: 0, browInner: 0, browArch: 0, eye: 'dot', mouth: 'neutral', cheek: 0.22 },
  shocked: { tilt: -3, browLift: -3, browInner: 0, browArch: 3, eye: 'wide', mouth: 'open', cheek: 0.16 },
  happy: { tilt: 2, browLift: -2, browInner: 0, browArch: 3, eye: 'happy', mouth: 'smile', cheek: 0.34 },
  confused: { tilt: -5, browLift: 1, browInner: 2, browSkew: -7, browArch: 0, eye: 'dot', glance: [2, 1], mouth: 'wavy', cheek: 0.2 },
  worried: { tilt: -4, browLift: 2, browInner: -7, browArch: 0, eye: 'dot', glance: [0, 1], eyeScale: 0.95, mouth: 'frownSmall', cheek: 0.16 },
  angry: { tilt: 0, browLift: 2, browInner: 7, browArch: -1, eye: 'squint', eyeScale: 0.92, mouth: 'frownWide', cheek: 0.3 },
  curious: { tilt: 5, browLift: -2, browInner: 0, browArch: 2, eye: 'dot', glance: [0, -2], mouth: 'small', cheek: 0.24 },
  excited: { tilt: 3, browLift: -4, browInner: -2, browArch: 4, eye: 'bright', mouth: 'grin', cheek: 0.38 },
};

/** Eyebrows: two short tapered strokes that sit on the hairline, so they are drawn in `BROW`. */
const Brows: React.FC<{ face: Face }> = ({ face }) => {
  const outerY = 82 + face.browLift;
  const innerY = 80 + face.browLift + face.browInner;
  const innerLeftY = innerY + (face.browSkew ?? 0);
  const arch = face.browArch;
  const stroke = {
    stroke: BROW,
    strokeWidth: 3.6,
    strokeLinecap: 'round' as const,
    fill: 'none',
  };
  // The outer end is higher than the inner end by default (a calm brow); `innerY` moves the inner tip.
  return (
    <>
      <path d={`M58 ${outerY} Q64 ${Math.min(outerY, innerLeftY) - arch} 73 ${innerLeftY}`} {...stroke} />
      <path d={`M102 ${outerY} Q96 ${Math.min(outerY, innerY) - arch} 87 ${innerY}`} {...stroke} />
    </>
  );
};

/** Eyes: one shape per mood, all built from the same two centres. `blink` squashes the open shapes. */
const Eyes: React.FC<{ face: Face; blink: number }> = ({ face, blink }) => {
  const [dx, dy] = face.glance ?? [0, 0];
  const scale = face.eyeScale ?? 1;
  const left = EYE.left + dx;
  const right = EYE.right + dx;
  const y = EYE.y + dy;
  // The happy face is *drawn* with closed eyes, so a blink has nothing to close; every other shape
  // squashes (the narrowed `squint` lids included, which otherwise leaves an angry face that never
  // blinks while the same rig blinks beside it).
  const open = face.eye !== 'happy';
  const squash = open ? 1 - blink * 0.9 : 1;
  const lid = `translate(0 ${y}) scale(1 ${squash}) translate(0 ${-y})`;
  const stroke = { stroke: OUTLINE, strokeWidth: 2 };

  return (
    <g transform={lid}>
      {face.eye === 'wide' ? (
        <>
          <circle cx={left} cy={y} r={11} fill={PALETTE.white} {...stroke} />
          <circle cx={right} cy={y} r={11} fill={PALETTE.white} {...stroke} />
          <circle cx={left + 1} cy={y + 1} r={4.4} fill={HAIR} />
          <circle cx={right + 1} cy={y + 1} r={4.4} fill={HAIR} />
        </>
      ) : face.eye === 'bright' ? (
        <>
          <ellipse cx={left} cy={y} rx={7} ry={9} fill={PALETTE.white} {...stroke} />
          <ellipse cx={right} cy={y} rx={7} ry={9} fill={PALETTE.white} {...stroke} />
          <circle cx={left} cy={y} r={4.2} fill={HAIR} />
          <circle cx={right} cy={y} r={4.2} fill={HAIR} />
          <circle cx={left + 2.6} cy={y - 3} r={1.9} fill={TEETH} />
          <circle cx={right - 2.6} cy={y - 3} r={1.9} fill={TEETH} />
        </>
      ) : face.eye === 'happy' ? (
        <>
          <path d={`M${left - 7} ${y + 2} q7 -9 14 0`} stroke={HAIR} strokeWidth={3.4} fill='none' strokeLinecap='round' />
          <path d={`M${right - 7} ${y + 2} q7 -9 14 0`} stroke={HAIR} strokeWidth={3.4} fill='none' strokeLinecap='round' />
        </>
      ) : face.eye === 'squint' ? (
        <>
          <ellipse cx={left} cy={y} rx={5.6 * scale} ry={5.2 * scale} fill={HAIR} />
          <ellipse cx={right} cy={y} rx={5.6 * scale} ry={5.2 * scale} fill={HAIR} />
          {/* Heavy upper lids: reads as narrowed even when the figure is small. */}
          <path d={`M${left - 7} ${y - 2.4} h14`} stroke={HAIR} strokeWidth={2.4} strokeLinecap='round' />
          <path d={`M${right - 7} ${y - 2.4} h14`} stroke={HAIR} strokeWidth={2.4} strokeLinecap='round' />
          <circle cx={left + 1.6} cy={y + 1.6} r={1.4} fill={PALETTE.white} opacity={0.8} />
          <circle cx={right + 1.6} cy={y + 1.6} r={1.4} fill={PALETTE.white} opacity={0.8} />
        </>
      ) : (
        <>
          <ellipse cx={left} cy={y} rx={5.6 * scale} ry={8.4 * scale} fill={HAIR} />
          <ellipse cx={right} cy={y} rx={5.6 * scale} ry={8.4 * scale} fill={HAIR} />
          <circle cx={left + 2} cy={y - 3} r={1.6} fill={PALETTE.white} opacity={0.85} />
          <circle cx={right + 2} cy={y - 3} r={1.6} fill={PALETTE.white} opacity={0.85} />
        </>
      )}
    </g>
  );
};

/** Mouths: shape carries the mood, so the differences survive a sub-pixel-scale reduction. */
const Mouth: React.FC<{ face: Face }> = ({ face }) => {
  const line = { stroke: OUTLINE, strokeWidth: 2.8, strokeLinecap: 'round' as const, fill: 'none' };
  switch (face.mouth) {
    case 'smile':
      return (
        <path
          d={`M64 ${MOUTH_Y - 6} q16 14 32 0 q-16 8 -32 0 z`}
          fill={MOUTH}
          stroke={OUTLINE}
          strokeWidth={2}
          strokeLinejoin='round'
        />
      );
    case 'grin':
      return (
        <>
          <path
            d={`M62 ${MOUTH_Y - 7} q18 24 36 0 q-18 13 -36 0 z`}
            fill={MOUTH}
            stroke={OUTLINE}
            strokeWidth={2}
            strokeLinejoin='round'
          />
          <path d={`M64 ${MOUTH_Y - 6} q16 6 32 0 q-16 5 -32 0 z`} fill={TEETH} />
        </>
      );
    case 'open':
      return <ellipse cx={80} cy={MOUTH_Y} rx={7.5} ry={9} fill={MOUTH} stroke={OUTLINE} strokeWidth={2} />;
    case 'small':
      return <circle cx={80} cy={MOUTH_Y} r={4.4} fill={MOUTH} stroke={OUTLINE} strokeWidth={2} />;
    case 'frownSmall':
      return <path d={`M71 ${MOUTH_Y + 4} q9 -7 18 0`} {...line} />;
    case 'frownWide':
      return <path d={`M64 ${MOUTH_Y + 3} q16 -8 32 0`} {...line} />;
    case 'wavy':
      return <path d={`M69 ${MOUTH_Y} q6 -4 12 0 q6 4 11 0`} {...line} />;
    default:
      return <path d={`M73 ${MOUTH_Y - 2} q7 5 14 0`} {...line} />;
  }
};

export const Character: React.FC<CharacterProps> = ({
  x,
  y,
  scale = 1,
  action = 'idle',
  expression = 'neutral',
  actionStart = 0,
  flip = false,
  shadow = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Several characters can share a composition (and the expression grid shows eight at once), so the
  // gradient ids are per-instance: a duplicated id makes every later character reuse the first one's
  // paint server, which only shows up as wrong shading on a multi-character frame.
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const groundId = `character-ground-${instance}`;
  const hoodieId = `character-hoodie-${instance}`;
  const pantsId = `character-pants-${instance}`;

  const face = FACES[expression];

  const panicked = action === 'panicked';
  // `pose` is the blend *into* the panic pose, so it only advances when the character is actually
  // panicked. Springing it unconditionally made every idle character raise its arms about half a
  // second into a scene, wherever `actionStart` defaulted to 0.
  const pose = panicked
    ? spring({
        frame: frame - actionStart,
        fps,
        config: { damping: 12, stiffness: 120, mass: 0.7 },
      })
    : 0;

  // Breathing is always on (it is the idle tell); the jitter and sway are panic only.
  const breath = Math.sin(frame * 0.06);
  const jitter = panicked ? Math.sin(frame * 0.9) * 2.5 * pose : 0;
  const bodyY = breath * 1.5 + jitter * 0.4;

  // Arms: rest just outside the torso, throw up and out when panicked. A positive rotation on the
  // left arm swings it away from the body (SVG rotations are clockwise), so the idle angle is positive
  // on the left and negated for the right; the sign matters, and getting it backwards folds both
  // sleeves across the chest.
  const swing = Math.sin(frame * 0.55) * 5 * pose;
  const idleAngle = 6 + breath * 1.5;
  const panicAngle = 148 + swing;
  const leftArm = idleAngle + (panicAngle - idleAngle) * pose;
  const rightArm = -leftArm;

  // Blink every ~2.4 s (frames). The lid shuts in two frames and opens over three: a symmetric
  // triangle reads as a mechanical wiggle, and eyes really do snap closed faster than they open.
  const blinkPhase = frame % 72;
  const blink =
    blinkPhase === 67
      ? 1
      : blinkPhase === 66
        ? 0.4
        : blinkPhase === 68
          ? 0.72
          : blinkPhase === 69
            ? 0.38
            : blinkPhase === 70
              ? 0.14
              : 0;

  const headTilt =
    Math.sin(frame * 0.045) * 1.2 + (panicked ? Math.sin(frame * 0.7) * 2 * pose : 0) + face.tilt;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 160,
        height: 320,
        transform: `translate(-50%, -100%) scale(${flip ? -scale : scale}, ${scale})`,
        transformOrigin: '50% 100%',
        fontFamily: SANS_BOLD,
      }}
    >
      <svg width="160" height="320" viewBox="0 0 160 320" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id={groundId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PALETTE.ink} stopOpacity="0.55" />
            <stop offset="100%" stopColor={PALETTE.ink} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={hoodieId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={HOODIE_LIGHT} />
            <stop offset="45%" stopColor={HOODIE} />
            <stop offset="100%" stopColor={HOODIE_SHADE} />
          </linearGradient>
          <linearGradient id={pantsId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PANTS} />
            <stop offset="100%" stopColor={PANTS_SHADE} />
          </linearGradient>
        </defs>

        {shadow ? <ellipse cx={80} cy={313} rx={52} ry={11} fill={`url(#${groundId})`} /> : null}

        <g transform={`translate(0 ${bodyY}) rotate(${headTilt * 0.25} 80 300)`}>
          {/* Legs */}
          <rect x={56} y={238} width={25} height={68} rx={10} fill={`url(#${pantsId})`} stroke={OUTLINE} strokeWidth={2.5} />
          <rect x={79} y={238} width={25} height={68} rx={10} fill={`url(#${pantsId})`} stroke={OUTLINE} strokeWidth={2.5} />
          {/* Cargo pocket */}
          <rect x={80} y={256} width={23} height={19} rx={4} fill={PANTS_SHADE} stroke={OUTLINE} strokeWidth={2} />
          <line x1={80} y1={262} x2={103} y2={262} stroke={OUTLINE} strokeWidth={1.5} opacity={0.6} />

          {/* Chunky white sneakers with dark soles */}
          <g stroke={OUTLINE} strokeWidth={2.6} strokeLinejoin="round">
            <path d="M48 302 q0 -8 10 -8 h20 q8 0 8 8 v6 q0 4 -4 4 h-30 q-4 0 -4 -4 z" fill={SHOE} />
            <path d="M82 302 q0 -8 8 -8 h20 q10 0 10 8 v6 q0 4 -4 4 h-30 q-4 0 -4 -4 z" fill={SHOE} />
            <path d="M48 304 h38 v4 q0 2 -3 2 h-32 q-3 0 -3 -2 z" fill={OUTLINE} stroke="none" />
            <path d="M82 304 h38 v4 q0 2 -3 2 h-32 q-3 0 -3 -2 z" fill={OUTLINE} stroke="none" />
            <path d="M58 305 l7 4 M67 305 l7 4 M92 305 l7 4 M101 305 l7 4" stroke={OUTLINE} strokeWidth={1.6} fill="none" opacity={0.75} />
          </g>

          {/* Hood, behind the torso */}
          <path d="M50 150 q0 -22 30 -26 q30 4 30 26 q-14 12 -30 12 q-16 0 -30 -12 z" fill={HOODIE_LIGHT} stroke={OUTLINE} strokeWidth={2.5} />

          {/* Torso: hoodie */}
          <path
            d="M46 156 q0 -18 16 -24 q18 10 36 0 q18 6 18 24 v74 q0 14 -14 14 h-42 q-14 0 -14 -14 z"
            fill={`url(#${hoodieId})`}
            stroke={OUTLINE}
            strokeWidth={2.5}
          />
          {/* Warm rim light from the key light */}
          <path d="M110 158 q8 38 0 78" stroke={PALETTE.amber} strokeOpacity={0.45} strokeWidth={3} fill="none" strokeLinecap="round" />
          {/* Kangaroo pocket */}
          <path d="M58 206 q22 12 44 0 l-5 32 q-17 8 -34 0 z" fill={HOODIE_SHADE} stroke={OUTLINE} strokeWidth={2.2} />
          <path d="M58 206 q22 12 44 0" stroke={HOODIE_LIGHT} strokeWidth={2} fill="none" opacity={0.5} />
          {/* Drawstrings */}
          <line x1={70} y1={152} x2={68} y2={180} stroke={PALETTE.goldSoft} strokeWidth={2.6} strokeLinecap="round" />
          <line x1={90} y1={152} x2={92} y2={180} stroke={PALETTE.goldSoft} strokeWidth={2.6} strokeLinecap="round" />
          <circle cx={68} cy={182} r={2.6} fill={PALETTE.goldSoft} />
          <circle cx={92} cy={182} r={2.6} fill={PALETTE.goldSoft} />
          {/* Hem band */}
          <rect x={46} y={232} width={68} height={13} rx={5} fill={HOODIE_SHADE} stroke={OUTLINE} strokeWidth={2.2} />

          {/* Arms, pivoting at the shoulders. The sleeves straddle the torso outline (x 39–57 and
              103–121 against a 46–114 torso) so they read as arms at the side rather than as stripes
              painted down the chest. */}
          <g transform={`rotate(${leftArm} 48 156)`}>
            <rect x={39} y={152} width={18} height={70} rx={9} fill={HOODIE_LIGHT} stroke={OUTLINE} strokeWidth={2.5} />
            <rect x={39} y={152} width={6} height={70} rx={3} fill={PALETTE.amber} opacity={0.35} />
            <circle cx={48} cy={224} r={8} fill={SKIN} stroke={OUTLINE} strokeWidth={2.2} />
          </g>
          <g transform={`rotate(${rightArm} 112 156)`}>
            <rect x={103} y={152} width={18} height={70} rx={9} fill={HOODIE_LIGHT} stroke={OUTLINE} strokeWidth={2.5} />
            <rect x={115} y={152} width={6} height={70} rx={3} fill={PALETTE.amber} opacity={0.45} />
            <circle cx={112} cy={224} r={8} fill={SKIN} stroke={OUTLINE} strokeWidth={2.2} />
          </g>

          {/* Head */}
          <g transform={`rotate(${headTilt} 80 150)`}>
            <circle cx={80} cy={92} r={40} fill={SKIN} stroke={OUTLINE} strokeWidth={3} />
            {/* Spiky hair mass */}
            <path
              d="M40 104 L44 60 L54 80 L58 34 L70 66 L80 22 L90 64 L102 32 L108 74 L118 54 L122 104
                 C114 82 102 76 86 78 C68 80 52 88 40 104 Z"
              fill={HAIR}
              stroke={OUTLINE}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <Brows face={face} />

            <Eyes face={face} blink={blink} />

            {/* Cheek warmth */}
            <ellipse cx={56} cy={108} rx={7} ry={4.5} fill={PALETTE.ember} opacity={face.cheek} />
            <ellipse cx={104} cy={108} rx={7} ry={4.5} fill={PALETTE.ember} opacity={face.cheek} />

            <Mouth face={face} />
          </g>
        </g>
      </svg>
    </div>
  );
};
