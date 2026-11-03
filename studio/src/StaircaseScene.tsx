import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Character } from './Character';

export const StaircaseScene: React.FC = () => {
  const frame = useCurrentFrame();

  const panY = interpolate(frame, [0, 400], [0, -50], { extrapolateRight: 'clamp' });
  const catFloat = Math.sin(frame * 0.08) * 12;

  return (
    <AbsoluteFill style={{ backgroundColor: '#090D16', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <div style={{ position: 'absolute', width: '100%', height: '100%', transform: `translateY(${panY}px)` }}>
        <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'linear-gradient(180deg, #1E1B4B 0%, #0F172A 100%)' }} />

        <div style={{ position: 'absolute', left: 350, top: 220 + catFloat, width: 90, height: 60, backgroundColor: '#334155', borderRadius: 30, boxShadow: '0 0 25px rgba(56, 189, 248, 0.4)' }}>
          <div style={{ position: 'absolute', top: -20, left: 15, width: 20, height: 25, backgroundColor: '#334155', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          <div style={{ position: 'absolute', top: -20, right: 15, width: 20, height: 25, backgroundColor: '#334155', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
          <div style={{ position: 'absolute', bottom: -15, right: -25, width: 35, height: 12, backgroundColor: '#334155', borderRadius: 6, transform: 'rotate(-35deg)' }} />
          <div style={{ position: 'absolute', top: 18, left: 25, width: 8, height: 8, backgroundColor: '#38BDF8', borderRadius: '50%', boxShadow: '0 0 8px #38BDF8' }} />
          <div style={{ position: 'absolute', top: 18, right: 25, width: 8, height: 8, backgroundColor: '#38BDF8', borderRadius: '50%', boxShadow: '0 0 8px #38BDF8' }} />
        </div>

        <div style={{ position: 'absolute', left: 200, top: 150, width: 6, height: 6, backgroundColor: '#38BDF8', borderRadius: '50%', opacity: 0.8 }} />
        <div style={{ position: 'absolute', left: 600, top: 300, width: 4, height: 4, backgroundColor: '#38BDF8', borderRadius: '50%', opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: 850, top: 180, width: 5, height: 5, backgroundColor: '#FBBF24', borderRadius: '50%', opacity: 0.7 }} />

        <Character x={580} y={450} scale={1.25} action='panicked' expression='shocked' />
      </div>

      <div style={{ position: 'absolute', top: 40, left: 70, backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: '12px 24px', borderRadius: 12, border: '2px solid #EF4444' }}>
        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#EF4444', fontFamily: 'monospace' }}>
          ANOMALY SECTOR: HALLWAY
        </div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, letterSpacing: 1 }}>
          GRAVITY FIELD: UNSTABLE
        </div>
      </div>
    </AbsoluteFill>
  );
};
