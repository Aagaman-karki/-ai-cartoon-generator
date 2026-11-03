import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Character } from './Character';
import { HudChip, Particles, Ridge, Sky, Title, Vignette } from './Atmosphere';
import { PALETTE, camera, fadeIn, pop, track } from './theme';
import { useVideoConfig } from 'remotion';

/**
 * Chapter 02 — "Gravity Lets Go".
 *
 * The staircase floats free against a burning dusk sky: a flight of steps climbs out of frame while
 * two of them have already torn loose and drift. The cat hangs in mid-air, the character panics, and
 * debris rises past the camera.
 *
 * The staircase is a single deterministic array, so the camera pan and the drifting steps stay in
 * sync at any frame rate.
 */

const DURATION = 400;

type Step = { x: number; y: number; detached: boolean; phase: number };

const STEPS: Step[] = Array.from({ length: 10 }, (_, index) => ({
  x: 128 + index * 154,
  y: 1012 - index * 74,
  detached: index === 4 || index === 7,
  phase: index * 1.7,
}));

/** Floating rock, used for the debris field. */
const Rock: React.FC<{ x: number; y: number; size: number; phase: number; rotate: number }> = ({
  x,
  y,
  size,
  phase,
  rotate,
}) => {
  const frame = useCurrentFrame();
  const lift = Math.sin(frame * 0.045 + phase) * 14;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + lift,
        width: size,
        height: size * 0.8,
        background: `linear-gradient(140deg, ${PALETTE.shadowLift}, ${PALETTE.shadowDeep})`,
        border: `2px solid ${PALETTE.amber}44`,
        borderRadius: '44% 56% 48% 52% / 52% 48% 56% 44%',
        transform: `rotate(${rotate + lift * 0.6}deg)`,
        boxShadow: `0 0 26px ${PALETTE.ink}AA`,
      }}
    />
  );
};

/** Stylised floating cat: body, ears, curved tail and two gold eyes. */
const Cat: React.FC<{ x: number; y: number; scale: number }> = ({ x, y, scale }) => {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame * 0.05) * 18;
  const tilt = Math.sin(frame * 0.035) * 6;
  return (
    <svg
      width={220}
      height={200}
      viewBox="0 0 220 200"
      style={{
        position: 'absolute',
        left: x,
        top: y + bob,
        transform: `rotate(${tilt}deg) scale(${scale})`,
        transformOrigin: '50% 50%',
        filter: `drop-shadow(0 20px 40px ${PALETTE.ink})`,
      }}
    >
      <path d="M36 128 q-30 -26 -18 -58 q4 26 22 38 z" fill={PALETTE.shadowDeep} stroke={PALETTE.ink} strokeWidth={3} />
      <ellipse cx={112} cy={116} rx={68} ry={52} fill={PALETTE.shadow} stroke={PALETTE.ink} strokeWidth={3} />
      <circle cx={112} cy={62} r={44} fill={PALETTE.shadow} stroke={PALETTE.ink} strokeWidth={3} />
      <path d="M78 34 l6 -30 l24 24 z" fill={PALETTE.shadow} stroke={PALETTE.ink} strokeWidth={3} strokeLinejoin="round" />
      <path d="M146 34 l-6 -30 l-24 24 z" fill={PALETTE.shadow} stroke={PALETTE.ink} strokeWidth={3} strokeLinejoin="round" />
      <ellipse cx={96} cy={60} rx={8} ry={10} fill={PALETTE.gold} />
      <ellipse cx={128} cy={60} rx={8} ry={10} fill={PALETTE.gold} />
      <ellipse cx={96} cy={60} rx={2.6} ry={8} fill={PALETTE.ink} />
      <ellipse cx={128} cy={60} rx={2.6} ry={8} fill={PALETTE.ink} />
      <path d="M106 74 q6 6 12 0" stroke={PALETTE.goldSoft} strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M164 140 q26 10 22 32" stroke={PALETTE.shadow} strokeWidth={16} fill="none" strokeLinecap="round" />
      <path d="M164 140 q26 10 22 32" stroke={PALETTE.amber} strokeOpacity={0.4} strokeWidth={4} fill="none" strokeLinecap="round" />
    </svg>
  );
};

export const StaircaseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rise = track(frame, [0, DURATION], [0, -44]);
  const stepGlow = 0.35 + 0.25 * Math.sin(frame * 0.06);
  const heroStep = STEPS[1];

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={camera(frame, DURATION, { from: 1.03, to: 1.09, origin: '58% 72%' })}>
        <Sky sun={{ x: 1452, y: 704, r: 132, rays: true }} stars={54} seed={9} />

        {/* Far ridges, then a closer bank of hills the staircase climbs over */}
        <Ridge baseline={828} amplitude={86} color={PALETTE.violet} seed={21} opacity={0.55} drift={18} />
        <Ridge baseline={900} amplitude={64} color={PALETTE.shadow} seed={37} opacity={0.85} drift={42} />
        <Ridge baseline={1004} amplitude={44} color={PALETTE.ink} seed={53} opacity={1} drift={70} />

        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${rise}px)` }}>
          {/* Floating staircase */}
          {STEPS.map((step, index) => {
            const detachedLift = step.detached ? Math.sin(frame * 0.05 + step.phase) * 26 : 0;
            const detachedTilt = step.detached ? Math.sin(frame * 0.04 + step.phase) * 4 : 0;
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: step.x,
                  top: step.y + detachedLift,
                  width: 236,
                  height: 34,
                  transform: `skewX(-18deg) rotate(${detachedTilt}deg)`,
                  transformOrigin: '0% 100%',
                }}
              >
                {/* Front face */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: 34,
                    background: `linear-gradient(180deg, ${PALETTE.shadowLift}, ${PALETTE.shadowDeep})`,
                    boxShadow: `inset 0 -8px 0 ${PALETTE.ink}55`,
                  }}
                />
                {/* Lit top edge, catching the sun */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: 6,
                    background: `linear-gradient(90deg, ${PALETTE.gold}, ${PALETTE.ember})`,
                    opacity: step.detached ? 0.85 : 0.6,
                    boxShadow: `0 0 ${18 + stepGlow * 22}px ${PALETTE.amber}99`,
                  }}
                />
              </div>
            );
          })}

          {/* Debris */}
          <Rock x={880} y={430} size={54} phase={1.2} rotate={12} />
          <Rock x={1330} y={540} size={38} phase={3.4} rotate={-18} />
          <Rock x={700} y={660} size={30} phase={0.6} rotate={26} />
          <Rock x={1600} y={330} size={44} phase={2.1} rotate={-8} />

          {/* Character, riding the second step up */}
          <Character
            x={heroStep.x + 118}
            y={heroStep.y}
            scale={0.98}
            action='panicked'
            actionStart={4}
            expression='shocked'
          />

          <Cat x={1082} y={412} scale={1} />
        </div>

        <Particles count={40} seed={23} opacity={0.7} />
      </AbsoluteFill>

      <Title
        eyebrow='CHAPTER 02'
        header='GRAVITY LETS GO'
        sub='Nothing stays put for long.'
        x={132}
        y={150}
        delay={10}
        ruleWidth={280}
      />
      <HudChip label='GRAVITY FIELD' value='UNSTABLE' tone='alert' x={132} y={430} />
      {/* Light spill from the sun over the type side, keeps the left edge from going flat */}
      <div
        style={{
          position: 'absolute',
          left: -260,
          top: -180,
          width: 1200,
          height: 1200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${PALETTE.ember}22 0%, transparent 62%)`,
          opacity: pop(frame, fps, 0, { damping: 30 }),
        }}
      />

      <AbsoluteFill style={{ backgroundColor: PALETTE.ink, opacity: 1 - fadeIn(frame, 0, 12) }} />
      <Vignette strength={1.05} />
    </AbsoluteFill>
  );
};
