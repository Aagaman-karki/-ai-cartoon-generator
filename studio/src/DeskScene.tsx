import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Character } from './Character';
import { MONO, SANS } from './fonts';

/**
 * Storyboard beat 1 — "The Pop".
 *
 * A quiet bedroom at night: the Moon hangs in the window, pops like a bubble around frame 110,
 * and the sky goes black. The character reacts in shock while a kinetic caption lands.
 *
 * Deterministic throughout: all motion derives from `useCurrentFrame()`, and the star field is a
 * fixed, seeded layout so every render is identical.
 */

/** Frame at which the Moon pops. */
const POP = 110;

const seededRandom = (seed: number) => {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

/** Fixed star field (x/y as a fraction of the window interior) — same on every render. */
const STARS = (() => {
  const random = seededRandom(20261103);
  return Array.from({ length: 46 }, () => ({
    x: random(),
    y: random(),
    size: 2 + random() * 3,
    twinkle: random() * Math.PI * 2,
  }));
})();

const WINDOW = { left: 560, top: 110, width: 800, height: 580 };
const MOON = { x: 320, y: 220, r: 74 };

export const DeskScene: React.FC = () => {
  const frame = useCurrentFrame();

  const popped = frame >= POP;

  // Moon: swells for a few frames, then is gone.
  const moonScale = interpolate(frame, [POP - 8, POP], [1, 1.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const moonVisible = frame < POP;

  // Smoke puff: eight puffs drifting out and fading over 70 frames.
  const smokeT = frame - POP;
  const smokeActive = smokeT >= 0 && smokeT < 70;
  const smokeProgress = Math.min(Math.max(smokeT / 70, 0), 1);

  // Stars fade out once the Moon is gone; the window goes black.
  const starOpacity = interpolate(frame, [POP + 10, POP + 90], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const darkness = interpolate(frame, [POP + 10, POP + 100], [0, 0.92], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Caption ("RIGHT NOW" kinetic text from the storyboard) lands after the sky dies.
  const captionIn = interpolate(frame, [232, 250], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#050912', overflow: 'hidden', fontFamily: SANS }}>
      {/* Room */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(180deg, #0B1220 0%, #141B2E 55%, #090D16 100%)' }} />

      {/* Window */}
      <div
        style={{
          position: 'absolute',
          left: WINDOW.left,
          top: WINDOW.top,
          width: WINDOW.width,
          height: WINDOW.height,
          borderRadius: 18,
          border: '14px solid #1E293B',
          boxSizing: 'border-box',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(2, 6, 23, 0.8), inset 0 0 60px rgba(56, 189, 248, 0.08)',
          background: 'linear-gradient(180deg, #101A3A 0%, #0B1120 100%)',
        }}
      >
        {/* Stars */}
        {STARS.map((star, index) => {
          const twinkle = 0.55 + 0.45 * Math.sin(frame * 0.06 + star.twinkle);
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: star.x * WINDOW.width,
                top: star.y * WINDOW.height,
                width: star.size,
                height: star.size,
                borderRadius: '50%',
                backgroundColor: '#E2E8F0',
                opacity: twinkle * starOpacity,
              }}
            />
          );
        })}

        {/* Moon */}
        {moonVisible ? (
          <div
            style={{
              position: 'absolute',
              left: MOON.x - MOON.r,
              top: MOON.y - MOON.r,
              width: MOON.r * 2,
              height: MOON.r * 2,
              borderRadius: '50%',
              backgroundColor: '#F8FAFC',
              transform: `scale(${moonScale})`,
              boxShadow: '0 0 60px rgba(226, 232, 240, 0.85), 0 0 140px rgba(148, 163, 184, 0.45)',
            }}
          >
            <div style={{ position: 'absolute', top: 22, left: 30, width: 26, height: 26, borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
            <div style={{ position: 'absolute', top: 76, left: 72, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
            <div style={{ position: 'absolute', top: 46, left: 96, width: 12, height: 12, borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
          </div>
        ) : null}

        {/* Smoke puff where the Moon was */}
        {smokeActive
          ? Array.from({ length: 8 }).map((_, index) => {
              const angle = (index / 8) * Math.PI * 2;
              const distance = smokeProgress * 190;
              const size = 26 + smokeProgress * 46;
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
                    backgroundColor: '#64748B',
                    opacity: (1 - smokeProgress) * 0.7,
                    filter: 'blur(4px)',
                  }}
                />
              );
            })
          : null}

        {/* The lights go out */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#01030A', opacity: darkness }} />

        {/* Window mullions */}
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 10, height: '100%', marginLeft: -5, backgroundColor: '#1E293B' }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: 10, marginTop: -5, backgroundColor: '#1E293B' }} />
      </div>

      {/* Desk */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 170, backgroundColor: '#1E293B' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 14, backgroundColor: '#334155' }} />
      </div>

      {/* Lamp with a warm cone of light */}
      <div style={{ position: 'absolute', bottom: 170, left: 300, width: 12, height: 120, backgroundColor: '#334155' }} />
      <div style={{ position: 'absolute', bottom: 288, left: 250, width: 112, height: 46, backgroundColor: '#FBBF24', borderRadius: '56px 56px 6px 6px', boxShadow: '0 0 50px rgba(251, 191, 36, 0.7)' }} />
      {/* Light spilling from the shade down onto the floor */}
      <div
        style={{
          position: 'absolute',
          bottom: 168,
          left: 176,
          width: 260,
          height: 150,
          background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.28) 0%, rgba(251, 191, 36, 0) 100%)',
          clipPath: 'polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)',
          opacity: popped ? 0.4 : 0.75,
        }}
      />

      {/* Character, sitting this one out but flinching when the Moon goes */}
      <Character
        x={1500}
        y={900}
        scale={1.2}
        action={popped ? 'panicked' : 'idle'}
        expression={popped ? 'shocked' : 'neutral'}
      />

      {/* Kinetic caption */}
      <div
        style={{
          position: 'absolute',
          top: 735,
          left: '50%',
          transform: `translateX(-50%) scale(${0.85 + captionIn * 0.15})`,
          opacity: captionIn,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: 6,
            color: '#FFFFFF',
            textShadow: '0 0 40px rgba(56, 189, 248, 0.9), 0 6px 0 #0F172A',
            fontFamily: MONO,
          }}
        >
          RIGHT NOW
        </div>
      </div>

      {/* HUD badge */}
      <div style={{ position: 'absolute', top: 40, left: 70, backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: '12px 24px', borderRadius: 12, border: `2px solid ${popped ? '#EF4444' : '#38BDF8'}` }}>
        <div style={{ fontSize: 18, fontWeight: 'bold', color: popped ? '#EF4444' : '#38BDF8', fontFamily: MONO }}>
          SECTOR: HOME
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, letterSpacing: 1 }}>
          {popped ? 'LUNAR SIGNAL: LOST' : 'LUNAR SIGNAL: STABLE'}
        </div>
      </div>
    </AbsoluteFill>
  );
};
