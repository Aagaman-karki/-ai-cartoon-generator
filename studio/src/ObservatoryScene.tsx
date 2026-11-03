import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Character } from './Character';
import { MONO, SANS } from './fonts';

/**
 * Storyboard beat 4 — "The extreme ending", staged as a control room losing sync with time.
 *
 * Visuals: radial control-room gradient, a console row whose side panels pulse red, a central
 * readout whose glow ramps from 0.5 to 1 over the 400-frame sequence, and a critical-error banner.
 *
 * Uses ./Character for the figure, and ./fonts for the HUD face.
 */
export const ObservatoryScene: React.FC = () => {
  const frame = useCurrentFrame();

  const alertPulse = Math.sin(frame * 0.3) > 0 ? '#EF4444' : '#1E1B4B';
  const consoleGlow = interpolate(frame, [0, 400], [0.5, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#030712', overflow: 'hidden', fontFamily: SANS }}>
      {/* Control room background */}
      <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 30%, #1E1B4B 0%, #030712 70%)' }} />

      {/* Control consoles with flashing lights */}
      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: 260, backgroundColor: '#0F172A', borderTop: '8px solid #334155', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 40px' }}>
        <div style={{ width: 220, height: 120, backgroundColor: '#1E293B', borderRadius: 12, border: `3px solid ${alertPulse}`, boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' }} />
        <div style={{ width: 280, height: 160, backgroundColor: '#1E293B', borderRadius: 12, border: '3px solid #38BDF8', display: 'flex', flexDirection: 'column', padding: 16, justifyContent: 'center' }}>
          <div style={{ fontSize: 14, color: '#38BDF8', fontFamily: MONO, fontWeight: 'bold' }}>SYSTEM OVERRIDE</div>
          <div style={{ fontSize: 24, color: '#FBBF24', fontFamily: MONO, marginTop: 8 }}>SYNC LOSS: 88.4%</div>
        </div>
        <div style={{ width: 220, height: 120, backgroundColor: '#1E293B', borderRadius: 12, border: `3px solid ${alertPulse}`, boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' }} />
      </div>

      {/* Character at console */}
      <Character x={500} y={400} scale={1.25} action='panicked' expression='shocked' />

      {/* Emergency Warning Banner */}
      <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', backgroundColor: '#EF4444', padding: '10px 30px', borderRadius: 8, boxShadow: '0 0 30px rgba(239, 68, 68, 0.6)' }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', fontFamily: MONO, letterSpacing: 2 }}>
          ⚠️ CRITICAL ERROR: TIME CHANNELS DESYNCHRONIZED
        </div>
      </div>
    </AbsoluteFill>
  );
};
