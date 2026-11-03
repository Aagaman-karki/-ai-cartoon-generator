import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SANS_BOLD } from './fonts';
import { PALETTE } from './theme';

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
 */

export type CharacterAction = 'idle' | 'panicked';
export type CharacterExpression = 'neutral' | 'shocked' | 'happy';

export type CharacterProps = {
  /** Horizontal position of the character's center, in composition pixels. */
  x: number;
  /** Vertical position of the character's feet, in composition pixels. */
  y: number;
  /** Uniform scale applied to the base 160×320 figure. */
  scale?: number;
  /** Pose: `panicked` throws the arms up and adds a nervous shake. */
  action?: CharacterAction;
  /** Face: `shocked` gives wide eyes and raised brows, `happy` a broad smile. */
  expression?: CharacterExpression;
  /** Frame (local to the scene) at which the current `action` began, used to spring the pose. */
  actionStart?: number;
  /** Mirror the figure horizontally. */
  flip?: boolean;
  /** Draw the soft contact shadow under the feet. */
  shadow?: boolean;
};

const HAIR = '#141020';
const HOODIE = '#1C1628';
const HOODIE_SHADE = '#120D1B';
const HOODIE_LIGHT = '#2A2138';
const PANTS = '#414D66';
const PANTS_SHADE = '#333E54';
const SKIN = '#FFF1DF';
const SHOE = '#F4EFE3';
const OUTLINE = '#0D0917';

/** Eye centres, used for both the open and blinking states. */
const EYE = { left: 66, right: 94, y: 96 };

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

  const panicked = action === 'panicked';
  const pose = spring({
    frame: frame - actionStart,
    fps,
    config: { damping: 12, stiffness: 120, mass: 0.7 },
  });

  // Breathing plus a nervous jitter while panicked.
  const breath = Math.sin(frame * 0.06);
  const jitter = panicked ? Math.sin(frame * 0.9) * 2.5 * pose : 0;
  const bodyY = breath * 1.5 * pose + jitter * 0.4;

  // Arms: rest at a relaxed outward angle, throw up and out when panicked.
  const swing = Math.sin(frame * 0.55) * 5 * pose;
  const idleAngle = 9 + breath * 1.5;
  const panicAngle = 148 + swing;
  const leftArm = idleAngle + (panicAngle - idleAngle) * pose;
  const rightArm = -leftArm;

  // Blink every ~2.4 s (frames), quick and crisp.
  const blinkPhase = frame % 72;
  const blink = blinkPhase > 66 ? 1 - Math.abs(blinkPhase - 69) / 3 : 0;

  const headTilt = Math.sin(frame * 0.045) * 1.2 + (panicked ? Math.sin(frame * 0.7) * 2 * pose : 0);
  const browLift = expression === 'shocked' ? -6 : expression === 'happy' ? -2 : 0;

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
          <radialGradient id="character-ground" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={PALETTE.ink} stopOpacity="0.55" />
            <stop offset="100%" stopColor={PALETTE.ink} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="character-hoodie" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={HOODIE_LIGHT} />
            <stop offset="45%" stopColor={HOODIE} />
            <stop offset="100%" stopColor={HOODIE_SHADE} />
          </linearGradient>
          <linearGradient id="character-pants" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PANTS} />
            <stop offset="100%" stopColor={PANTS_SHADE} />
          </linearGradient>
        </defs>

        {shadow ? <ellipse cx={80} cy={313} rx={52} ry={11} fill="url(#character-ground)" /> : null}

        <g transform={`translate(0 ${bodyY}) rotate(${headTilt * 0.25} 80 300)`}>
          {/* Legs */}
          <rect x={56} y={238} width={25} height={68} rx={10} fill="url(#character-pants)" stroke={OUTLINE} strokeWidth={2.5} />
          <rect x={79} y={238} width={25} height={68} rx={10} fill="url(#character-pants)" stroke={OUTLINE} strokeWidth={2.5} />
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
            fill="url(#character-hoodie)"
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

          {/* Arms, pivoting at the shoulders */}
          <g transform={`rotate(${leftArm} 56 156)`}>
            <rect x={47} y={152} width={18} height={70} rx={9} fill={HOODIE_LIGHT} stroke={OUTLINE} strokeWidth={2.5} />
            <rect x={47} y={152} width={6} height={70} rx={3} fill={PALETTE.amber} opacity={0.35} />
            <circle cx={56} cy={224} r={8} fill={SKIN} stroke={OUTLINE} strokeWidth={2.2} />
          </g>
          <g transform={`rotate(${rightArm} 104 156)`}>
            <rect x={95} y={152} width={18} height={70} rx={9} fill={HOODIE_LIGHT} stroke={OUTLINE} strokeWidth={2.5} />
            <rect x={107} y={152} width={6} height={70} rx={3} fill={PALETTE.amber} opacity={0.45} />
            <circle cx={104} cy={224} r={8} fill={SKIN} stroke={OUTLINE} strokeWidth={2.2} />
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
            {/* Brows */}
            <line x1={58} y1={82 + browLift} x2={72} y2={79 + browLift} stroke={HAIR} strokeWidth={3.4} strokeLinecap="round" />
            <line x1={88} y1={79 + browLift} x2={102} y2={82 + browLift} stroke={HAIR} strokeWidth={3.4} strokeLinecap="round" />

            {/* Eyes: solid ovals when calm, wide and white when shocked */}
            <g transform={`translate(0 ${EYE.y}) scale(1 ${1 - blink * 0.92}) translate(0 ${-EYE.y})`}>
              {expression === 'shocked' ? (
                <>
                  <circle cx={EYE.left} cy={EYE.y} r={11} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={2} />
                  <circle cx={EYE.right} cy={EYE.y} r={11} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={2} />
                  <circle cx={EYE.left + 1} cy={EYE.y + 1} r={4.2} fill={HAIR} />
                  <circle cx={EYE.right + 1} cy={EYE.y + 1} r={4.2} fill={HAIR} />
                </>
              ) : (
                <>
                  <ellipse cx={EYE.left} cy={EYE.y} rx={5.6} ry={8.4} fill={HAIR} />
                  <ellipse cx={EYE.right} cy={EYE.y} rx={5.6} ry={8.4} fill={HAIR} />
                  <circle cx={EYE.left + 2} cy={EYE.y - 3} r={1.6} fill={PALETTE.white} opacity={0.85} />
                  <circle cx={EYE.right + 2} cy={EYE.y - 3} r={1.6} fill={PALETTE.white} opacity={0.85} />
                </>
              )}
            </g>

            {/* Cheek warmth */}
            <ellipse cx={56} cy={108} rx={7} ry={4.5} fill={PALETTE.ember} opacity={0.22} />
            <ellipse cx={104} cy={108} rx={7} ry={4.5} fill={PALETTE.ember} opacity={0.22} />

            {/* Mouth */}
            {expression === 'shocked' ? (
              <ellipse cx={80} cy={116} rx={7.5} ry={9} fill="#3A1E2B" stroke={OUTLINE} strokeWidth={2} />
            ) : expression === 'happy' ? (
              <path d="M66 112 q14 16 28 0 q-14 8 -28 0 z" fill="#3A1E2B" stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round" />
            ) : (
              <path d="M72 113 q8 7 16 0" stroke={OUTLINE} strokeWidth={2.6} fill="none" strokeLinecap="round" />
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};
