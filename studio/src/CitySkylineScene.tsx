import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Character } from './Character';
import { MONO, SANS } from './fonts';

/**
 * Storyboard beat 3 — "The Earth wobble", shown as a city skyline under a fracturing sky.
 *
 * Visuals: silhouette skyline, two glowing "temporal rift" bars that widen across the 400-frame
 * sequence (the upper one jitters for a glitch feel), and a character on a foreground rooftop
 * looking up in shock (rooftop top edge at y=960 — keep the figure's feet there).
 *
 * Uses ./Character for the figure, and ./fonts for the HUD face.
 */
export const CitySkylineScene: React.FC = () => {
  const frame = useCurrentFrame();

  const skyGlitch = Math.sin(frame * 0.2) * 8;
  const fractureWidth = interpolate(frame, [0, 400], [0, 100], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#090D16', overflow: 'hidden', fontFamily: SANS }}>
      {/* City background gradient */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)' }} />

      {/* Skyline silhouettes */}
      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: 300, display: 'flex', alignItems: 'flex-end', opacity: 0.8 }}>
        <div style={{ width: '12%', height: '70%', backgroundColor: '#020617' }} />
        <div style={{ width: '18%', height: '95%', backgroundColor: '#090D16' }} />
        <div style={{ width: '10%', height: '60%', backgroundColor: '#020617' }} />
        <div style={{ width: '22%', height: '100%', backgroundColor: '#050B14' }} />
        <div style={{ width: '15%', height: '80%', backgroundColor: '#020617' }} />
        <div style={{ width: '23%', height: '85%', backgroundColor: '#090D16' }} />
      </div>

      {/* Fractured Sky / Temporal Rift */}
      <div style={{ position: 'absolute', top: 80, left: '30%', width: `${fractureWidth}%`, height: 6, backgroundColor: '#38BDF8', boxShadow: '0 0 30px #38BDF8, 0 0 60px #EF4444', transform: `translateX(${skyGlitch}px)` }} />
      <div style={{ position: 'absolute', top: 120, left: '40%', width: `${fractureWidth * 0.8}%`, height: 4, backgroundColor: '#FBBF24', boxShadow: '0 0 20px #FBBF24' }} />

      {/* Foreground rooftop the character stands on (top edge at y=960) */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 120, backgroundColor: '#020617' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 10, backgroundColor: '#0F172A', borderTop: '3px solid #1E293B', boxSizing: 'border-box' }} />
        <div style={{ position: 'absolute', top: -60, left: 1180, width: 96, height: 60, backgroundColor: '#0B1220', border: '2px solid #1E293B', borderRadius: 6, boxSizing: 'border-box' }} />
        <div style={{ position: 'absolute', top: -26, left: 1300, width: 46, height: 26, backgroundColor: '#0B1220', border: '2px solid #1E293B', borderRadius: 4, boxSizing: 'border-box' }} />
      </div>

      {/* Character on the rooftop, looking up in awe/terror */}
      <Character x={480} y={960} scale={1.3} action='panicked' expression='shocked' />

      {/* Cinematic Banner */}
      <div style={{ position: 'absolute', top: 40, right: 70, backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: '12px 24px', borderRadius: 12, border: '2px solid #38BDF8' }}>
        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#38BDF8', fontFamily: MONO }}>
          GLOBAL HORIZON: FRACTURED
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, letterSpacing: 1 }}>
          TIMELINE INTEGRITY: 42%
        </div>
      </div>
    </AbsoluteFill>
  );
};
