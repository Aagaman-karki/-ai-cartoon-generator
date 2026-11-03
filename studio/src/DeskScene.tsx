import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Character } from './Character';
import { CityLine, HudChip, Particles, Ridge, Sky, Title, Vignette } from './Atmosphere';
import { PALETTE, camera, fadeIn, track } from './theme';

/**
 * Chapter 01 — "The Pop".
 *
 * A quiet room at dusk. Through the window the last light sits on a violet horizon; the Moon hangs
 * above it, swells, and bursts at frame 110. The sky drains to indigo while the lamp gutters, and the
 * chapter title lands.
 *
 * Layering: sky and ridges live inside the window (clipped), the room sits above them, the desk and
 * particles sit in the foreground. All motion is a function of `useCurrentFrame()`.
 */

/** Frame at which the Moon bursts. */
const POP = 110;
const DURATION = 400;

const WINDOW = { left: 470, top: 96, width: 940, height: 620 };
const MOON = { x: 520, y: 232, r: 66 };

export const DeskScene: React.FC = () => {
  const frame = useCurrentFrame();

  const popped = frame >= POP;
  const puff = track(frame, [POP, POP + 46], [0, 1], (input) => input);
  const douse = track(frame, [POP + 8, POP + 96], [0, 0.62]);
  const swell = track(frame, [POP - 10, POP], [1, 1.45]);
  const lampFlicker = popped && frame < POP + 26 ? 0.55 + 0.45 * Math.abs(Math.sin(frame * 0.8)) : 1;
  const roomGlow = track(frame, [0, POP], [0.55, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={camera(frame, DURATION, { from: 1.02, to: 1.08, origin: '62% 58%' })}>
        {/* Room wall */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(120% 90% at 78% 34%, ${PALETTE.shadowLift} 0%, ${PALETTE.shadowDeep} 46%, ${PALETTE.ink} 100%)`,
          }}
        />
        {/* Wall panel seams, kept very low contrast */}
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: 0,
              bottom: '26%',
              left: 180 + index * 420,
              width: 2,
              backgroundColor: PALETTE.violet,
              opacity: 0.12,
            }}
          />
        ))}

        {/* Window */}
        <div
          style={{
            position: 'absolute',
            left: WINDOW.left,
            top: WINDOW.top,
            width: WINDOW.width,
            height: WINDOW.height,
            borderRadius: 26,
            border: `16px solid ${PALETTE.shadow}`,
            boxSizing: 'border-box',
            overflow: 'hidden',
            boxShadow: `0 40px 90px ${PALETTE.ink}, inset 0 0 80px ${PALETTE.ink}AA, 0 0 0 3px ${PALETTE.gold}22`,
          }}
        >
          {/* The city and hills stay put — only the sky above them drains away */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <Sky
              variant={popped ? 'night' : 'dusk'}
              stars={44}
              seed={31}
              dim={douse}
              sun={popped ? undefined : { x: MOON.x, y: MOON.y, r: MOON.r, color: PALETTE.goldSoft }}
            />
            <Ridge baseline={430} amplitude={54} color={PALETTE.shadow} seed={12} opacity={0.95} drift={8} />
            <Ridge baseline={480} amplitude={40} color={PALETTE.ink} seed={44} opacity={1} drift={16} />
            <CityLine baseline={560} height={150} color={PALETTE.ink} seed={19} windows={0.7} drift={26} />
            <div style={{ position: 'absolute', inset: 0, backgroundColor: PALETTE.ink, opacity: douse * 0.55 }} />
          </div>

          {/* Moon crater detail and glow, drawn over the sky's disc */}
          {!popped ? (
            <div
              style={{
                position: 'absolute',
                left: MOON.x - MOON.r,
                top: MOON.y - MOON.r,
                width: MOON.r * 2,
                height: MOON.r * 2,
                borderRadius: '50%',
                transform: `scale(${swell})`,
                boxShadow: `0 0 120px ${PALETTE.goldSoft}88`,
              }}
            >
              <div style={{ position: 'absolute', top: 22, left: 30, width: 20, height: 20, borderRadius: '50%', backgroundColor: PALETTE.goldSoft, opacity: 0.45 }} />
              <div style={{ position: 'absolute', top: 58, left: 78, width: 14, height: 14, borderRadius: '50%', backgroundColor: PALETTE.goldSoft, opacity: 0.4 }} />
            </div>
          ) : null}

          {/* The burst */}
          {popped && puff < 1
            ? Array.from({ length: 12 }).map((_, index) => {
                const angle = (index / 12) * Math.PI * 2;
                const distance = puff * 210;
                const size = 20 + puff * 54;
                return (
                  <div
                    key={index}
                    style={{
                      position: 'absolute',
                      left: MOON.x + Math.cos(angle) * distance - size / 2,
                      top: MOON.y + Math.sin(angle) * distance - size / 2,
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${PALETTE.goldSoft} 0%, ${PALETTE.amber}00 70%)`,
                      opacity: (1 - puff) * 0.9,
                    }}
                  />
                );
              })
            : null}
          {popped && puff < 1 ? (
            <div
              style={{
                position: 'absolute',
                left: MOON.x - 200 * puff,
                top: MOON.y - 200 * puff,
                width: 400 * puff,
                height: 400 * puff,
                borderRadius: '50%',
                border: `4px solid ${PALETTE.goldSoft}`,
                opacity: (1 - puff) * 0.7,
              }}
            />
          ) : null}

          {/* Mullions */}
          <div style={{ position: 'absolute', left: '52%', top: 0, width: 14, height: '100%', marginLeft: -7, backgroundColor: PALETTE.shadowDeep }} />
          <div style={{ position: 'absolute', top: '56%', left: 0, width: '100%', height: 14, marginTop: -7, backgroundColor: PALETTE.shadowDeep }} />
          {/* Glass reflection */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(118deg, ${PALETTE.cream}14 0%, transparent 38%, transparent 62%, ${PALETTE.cream}0D 100%)`,
            }}
          />
        </div>

        {/* Floor lamp on the right: the room's only warm source */}
        <div
          style={{
            position: 'absolute',
            left: 1400,
            top: 220,
            width: 520,
            height: 720,
            background: `radial-gradient(ellipse 50% 44% at 55% 46%, ${PALETTE.amber}44 0%, transparent 100%)`,
            opacity: lampFlicker * roomGlow,
          }}
        />
        <div style={{ position: 'absolute', left: 1694, top: 400, width: 12, height: 466, backgroundColor: PALETTE.shadow, borderRadius: 5 }} />
        <div style={{ position: 'absolute', left: 1650, top: 856, width: 100, height: 16, borderRadius: 8, backgroundColor: PALETTE.shadow }} />
        <div
          style={{
            position: 'absolute',
            left: 1636,
            top: 336,
            width: 128,
            height: 66,
            background: `linear-gradient(180deg, ${PALETTE.goldSoft} 0%, ${PALETTE.amber} 100%)`,
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
            boxShadow: `0 0 80px ${PALETTE.amber}BB`,
            opacity: 0.55 + lampFlicker * 0.45,
          }}
        />
        {/* Blur lives on the wrapper: blurring a clipped child leaves the clip edge sharp */}
        <div style={{ position: 'absolute', left: 1600, top: 396, width: 200, height: 470, filter: 'blur(18px)', opacity: lampFlicker * 0.7 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, ${PALETTE.gold}33 0%, ${PALETTE.gold}00 100%)`,
              clipPath: 'polygon(34% 0%, 66% 0%, 100% 100%, 0% 100%)',
            }}
          />
        </div>

        {/* Character, standing behind the desk, flinching when the Moon goes */}
        <Character
          x={1440}
          y={906}
          scale={1.2}
          action={popped ? 'panicked' : 'idle'}
          actionStart={POP}
          expression={popped ? 'shocked' : 'neutral'}
        />

        {/* Desk */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 210 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, ${PALETTE.shadow} 0%, ${PALETTE.shadowDeep} 40%, ${PALETTE.ink} 100%)`,
            }}
          />
          <div style={{ position: 'absolute', top: -10, left: 0, right: 0, height: 10, background: `linear-gradient(180deg, ${PALETTE.amber}66, ${PALETTE.shadow})` }} />
          {/* Panel seam across the desk front */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 76, height: 2, backgroundColor: PALETTE.violet, opacity: 0.22 }} />
          {/* Notebook with a lit top edge */}
          <div style={{ position: 'absolute', left: 470, top: -34, width: 300, height: 34, borderRadius: '6px 6px 2px 2px', background: `linear-gradient(180deg, ${PALETTE.cream}33, ${PALETTE.shadowDeep})`, border: `2px solid ${PALETTE.amber}44` }} />
          <div style={{ position: 'absolute', left: 470, top: -34, width: 300, height: 4, borderRadius: 2, background: PALETTE.goldSoft, opacity: 0.55 }} />
          {/* Book stack */}
          <div style={{ position: 'absolute', left: 1120, top: -22, width: 150, height: 22, borderRadius: 3, background: PALETTE.shadowDeep, border: `2px solid ${PALETTE.amber}66` }} />
          <div style={{ position: 'absolute', left: 1132, top: -40, width: 126, height: 20, borderRadius: 3, background: PALETTE.shadow, border: `2px solid ${PALETTE.violet}88` }} />
          {/* Mug catching the lamp */}
          <div style={{ position: 'absolute', left: 880, top: -56, width: 64, height: 56, borderRadius: '8px 8px 14px 14px', background: `linear-gradient(140deg, ${PALETTE.shadow}, ${PALETTE.ink})`, border: `2px solid ${PALETTE.amber}88` }} />
          <div style={{ position: 'absolute', left: 880, top: -56, width: 64, height: 5, borderRadius: 3, background: PALETTE.goldSoft, opacity: 0.6 }} />
          <div style={{ position: 'absolute', left: 944, top: -44, width: 22, height: 26, border: `5px solid ${PALETTE.amber}66`, borderRadius: '0 14px 14px 0' }} />
        </div>

        <Particles count={26} seed={17} opacity={0.5} />
      </AbsoluteFill>

      <Title
        eyebrow='CHAPTER 01 · THE POP'
        header='RIGHT NOW'
        sub='The Moon is simply… gone.'
        x={132}
        y={548}
        delay={236}
        ruleWidth={260}
      />
      <HudChip label='LUNAR SIGNAL' value={popped ? 'LOST' : 'STABLE'} tone={popped ? 'alert' : 'gold'} x={132} y={92} />

      {/* Opening fade so the chapter starts from black */}
      <AbsoluteFill style={{ backgroundColor: PALETTE.ink, opacity: 1 - fadeIn(frame, 0, 12) }} />
      <Vignette strength={1.1} />
    </AbsoluteFill>
  );
};
