import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Character } from './Character';
import { CityLine, HudChip, Particles, Sky, Title, Vignette } from './Atmosphere';
import { PALETTE, camera, fadeIn, track } from './theme';

/**
 * Chapter 03 — "The Sky Cracks".
 *
 * The city at the last light of day: three parallax bands of towers, gold windows coming on, the sun
 * sinking behind the skyline — and two fractures tearing open above it. The character watches from a
 * foreground rooftop.
 *
 * Depth comes from drift speed (far layers barely move, near ones move most) plus a slow camera push.
 */

const DURATION = 400;

/** The two fractures, as SVG polylines in composition space. */
const CRACK_A = 'M672 96 L806 208 L748 250 L918 352 L858 398 L980 470';
const CRACK_B = 'M1180 150 L1092 236 L1160 292 L1054 372';

export const CitySkylineScene: React.FC = () => {
  const frame = useCurrentFrame();

  const reveal = track(frame, [26, 150], [0, 1], (input) => input);
  const pulse = 0.65 + 0.35 * Math.sin(frame * 0.12);
  const glitch = Math.sin(frame * 0.22) * 5;
  const sunShimmer = 0.85 + 0.15 * Math.sin(frame * 0.05);

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={camera(frame, DURATION, { from: 1.04, to: 1.1, origin: '52% 68%' })}>
        <Sky sun={{ x: 1250, y: 632, r: 148, rays: true }} stars={38} seed={61} />

        {/* Sun heat shimmer sitting on the horizon */}
        <div
          style={{
            position: 'absolute',
            left: 880,
            top: 500,
            width: 820,
            height: 380,
            borderRadius: '50%',
            background: `radial-gradient(ellipse, ${PALETTE.amber}44 0%, transparent 68%)`,
            opacity: sunShimmer,
          }}
        />

        {/* Three bands of city, back to front */}
        <CityLine baseline={780} height={200} color={PALETTE.violet} seed={71} opacity={0.45} windows={0.4} drift={14} haze={0.6} />
        <CityLine baseline={860} height={260} color={PALETTE.shadow} seed={83} opacity={0.85} windows={0.7} drift={32} haze={0.3} />
        <CityLine baseline={912} height={170} color={PALETTE.ink} seed={97} opacity={1} windows={1} drift={56} />

        {/* Fractures */}
        <svg
          width={1920}
          height={1080}
          viewBox='0 0 1920 1080'
          style={{ position: 'absolute', left: 0, top: 0, transform: `translateX(${glitch}px)` }}
        >
          <defs>
            <linearGradient id='crack-fill' x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0%' stopColor={PALETTE.goldSoft} />
              <stop offset='55%' stopColor={PALETTE.gold} />
              <stop offset='100%' stopColor={PALETTE.ember} />
            </linearGradient>
          </defs>
          {[
            { path: CRACK_A, width: 6, delay: 0 },
            { path: CRACK_B, width: 4, delay: 0.25 },
          ].map((crack, index) => {
            const length = 1400;
            const progress = track(frame, [26 + crack.delay * 160, 150 + crack.delay * 160], [0, 1], (input) => input);
            return (
              <g key={index}>
                <path
                  d={crack.path}
                  fill='none'
                  stroke={PALETTE.amber}
                  strokeWidth={crack.width * 5}
                  strokeOpacity={0.18 * pulse}
                  strokeLinejoin='round'
                  strokeLinecap='round'
                  strokeDasharray={length}
                  strokeDashoffset={length * (1 - progress)}
                />
                <path
                  d={crack.path}
                  fill='none'
                  stroke='url(#crack-fill)'
                  strokeWidth={crack.width}
                  strokeLinejoin='round'
                  strokeLinecap='round'
                  strokeDasharray={length}
                  strokeDashoffset={length * (1 - progress)}
                  style={{ filter: `drop-shadow(0 0 16px ${PALETTE.gold})` }}
                />
              </g>
            );
          })}
        </svg>

        {/* Birds, for scale */}
        {[
          { x: 380, y: 300, size: 1 },
          { x: 452, y: 264, size: 0.8 },
          { x: 330, y: 352, size: 0.7 },
        ].map((bird, index) => (
          <svg
            key={index}
            width={54}
            height={30}
            viewBox='0 0 54 30'
            style={{
              position: 'absolute',
              left: bird.x + index * 10,
              top: bird.y + Math.sin(frame * 0.04 + index) * 12,
              transform: `scale(${bird.size})`,
              opacity: 0.6,
            }}
          >
            <path d='M2 12 q12 -12 25 0 q13 -12 25 0' stroke={PALETTE.ink} strokeWidth={3} fill='none' strokeLinecap='round' />
          </svg>
        ))}

        {/* Foreground rooftop (top edge y=910 — the character's feet) */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 170 }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${PALETTE.shadowDeep} 0%, ${PALETTE.ink} 100%)` }} />
          {/* Parapet lip, lit along its top edge by the sunset */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 18, background: `linear-gradient(180deg, ${PALETTE.shadow}, ${PALETTE.shadowDeep})` }} />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background: `linear-gradient(90deg, transparent, ${PALETTE.gold}AA 38%, ${PALETTE.ember}88 62%, transparent)`,
            }}
          />
          {/* Vents and an aerial mast */}
          <div style={{ position: 'absolute', bottom: 46, left: 1210, width: 150, height: 104, borderRadius: 8, background: PALETTE.ink, border: `2px solid ${PALETTE.violet}66` }} />
          <div style={{ position: 'absolute', bottom: 70, left: 1240, width: 90, height: 12, background: PALETTE.ink, border: `2px solid ${PALETTE.amber}44` }} />
          <div style={{ position: 'absolute', bottom: 46, left: 1400, width: 96, height: 62, borderRadius: 6, background: PALETTE.ink, border: `2px solid ${PALETTE.violet}55` }} />
          <div style={{ position: 'absolute', bottom: 84, left: 1600, width: 4, height: 150, background: PALETTE.ink }} />
          <div style={{ position: 'absolute', bottom: 210, left: 1584, width: 36, height: 4, background: PALETTE.ink }} />
          <div style={{ position: 'absolute', bottom: 224, left: 1597, width: 10, height: 10, borderRadius: '50%', background: PALETTE.ember, boxShadow: `0 0 18px ${PALETTE.ember}`, opacity: pulse }} />

          {/* Warm bounce on the roof surface */}
          <div
            style={{
              position: 'absolute',
              top: 18,
              left: 0,
              right: 0,
              height: 120,
              background: `linear-gradient(180deg, ${PALETTE.ember}1F 0%, transparent 100%)`,
            }}
          />
        </div>

        {/* Character on the rooftop, lit from behind by the sun */}
        <div
          style={{
            position: 'absolute',
            left: 300,
            top: 500,
            width: 620,
            height: 440,
            background: `radial-gradient(ellipse 50% 50% at 62% 72%, ${PALETTE.amber}38 0%, transparent 100%)`,
          }}
        />
        <Character x={500} y={910} scale={1.24} action='panicked' actionStart={2} expression='shocked' />

        <Particles count={30} seed={41} opacity={0.55} />
      </AbsoluteFill>

      <Title
        eyebrow='CHAPTER 03'
        header='THE SKY CRACKS'
        sub='Above the city, the horizon gives way.'
        x={118}
        y={142}
        delay={14}
        ruleWidth={300}
      />
      <HudChip label='TIMELINE INTEGRITY' value='42%' tone='alert' x={118} y={448} />

      <AbsoluteFill style={{ backgroundColor: PALETTE.ink, opacity: 1 - fadeIn(frame, 0, 12) }} />
      <Vignette strength={1.05} />
    </AbsoluteFill>
  );
};
