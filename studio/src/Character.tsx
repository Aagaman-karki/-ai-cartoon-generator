import React from 'react';
import { useCurrentFrame } from 'remotion';

/**
 * Shared flat-vector character used by every scene.
 *
 * Drawn entirely with absolutely-positioned divs so it needs no image assets, and animated only
 * from `useCurrentFrame()` so renders stay deterministic. Position is given in composition pixels
 * and refers to the character's feet; `scale` multiplies the ~120×240 base figure.
 */
export type CharacterAction = 'idle' | 'panicked';
export type CharacterExpression = 'neutral' | 'shocked' | 'happy';

export type CharacterProps = {
  /** Horizontal position of the character's center, in composition pixels. */
  x: number;
  /** Vertical position of the character's feet, in composition pixels. */
  y: number;
  /** Uniform scale applied to the base 120×240 figure. */
  scale?: number;
  /** Pose: `panicked` raises the arms and adds a nervous shake. */
  action?: CharacterAction;
  /** Face: `shocked` gives wide eyes and an open mouth. */
  expression?: CharacterExpression;
};

const SKIN = '#F7D7BE';
const BODY = '#334155';
const ACCENT = '#38BDF8';
const DARK = '#0F172A';

export const Character: React.FC<CharacterProps> = ({
  x,
  y,
  scale = 1,
  action = 'idle',
  expression = 'neutral',
}) => {
  const frame = useCurrentFrame();

  const panicked = action === 'panicked';
  // Nervous jitter; rounded so shapes don't land on sub-pixels.
  const shake = panicked ? Math.round(Math.sin(frame * 0.9) * 3) : 0;
  const armAngle = panicked ? 145 + Math.sin(frame * 0.45) * 12 : 15;
  const headTilt = panicked ? Math.sin(frame * 0.6) * 4 : 0;
  const mouthOpen = expression === 'shocked' ? 14 : expression === 'happy' ? 8 : 3;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 120,
        height: 240,
        transform: `translate(-50%, -100%) translateX(${shake}px) scale(${scale})`,
        transformOrigin: '50% 100%',
      }}
    >
      {/* Shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: -8,
          left: 10,
          width: 100,
          height: 16,
          borderRadius: '50%',
          backgroundColor: 'rgba(2, 6, 23, 0.55)',
          filter: 'blur(3px)',
        }}
      />

      {/* Legs */}
      <div style={{ position: 'absolute', bottom: 0, left: 32, width: 20, height: 78, backgroundColor: BODY, borderRadius: 8 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 68, width: 20, height: 78, backgroundColor: BODY, borderRadius: 8 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 24, width: 28, height: 12, backgroundColor: DARK, borderRadius: 6 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 68, width: 28, height: 12, backgroundColor: DARK, borderRadius: 6 }} />

      {/* Torso */}
      <div
        style={{
          position: 'absolute',
          bottom: 70,
          left: 22,
          width: 76,
          height: 92,
          backgroundColor: BODY,
          borderRadius: '18px 18px 10px 10px',
          border: `2px solid ${DARK}`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ position: 'absolute', top: 18, left: 8, width: 60, height: 8, backgroundColor: ACCENT, borderRadius: 4, boxShadow: `0 0 10px ${ACCENT}` }} />
      </div>

      {/* Arms: pivot at the shoulder (torso top, ~138px from the bottom) so `panicked` flails */}
      <div
        style={{
          position: 'absolute',
          bottom: 72,
          left: 18,
          width: 16,
          height: 66,
          backgroundColor: BODY,
          border: `2px solid ${DARK}`,
          borderRadius: 8,
          boxSizing: 'border-box',
          transformOrigin: '50% 0%',
          transform: `rotate(${armAngle}deg)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 72,
          left: 86,
          width: 16,
          height: 66,
          backgroundColor: BODY,
          border: `2px solid ${DARK}`,
          borderRadius: 8,
          boxSizing: 'border-box',
          transformOrigin: '50% 0%',
          transform: `rotate(${-armAngle}deg)`,
        }}
      />

      {/* Head */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 30,
          width: 60,
          height: 62,
          backgroundColor: SKIN,
          borderRadius: '50% 50% 46% 46%',
          border: `2px solid ${DARK}`,
          boxSizing: 'border-box',
          transform: `rotate(${headTilt}deg)`,
        }}
      >
        {/* Hair */}
        <div
          style={{
            position: 'absolute',
            top: -4,
            left: -2,
            width: 60,
            height: 24,
            backgroundColor: DARK,
            borderRadius: '28px 28px 4px 4px',
          }}
        />

        {/* Eyes */}
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: 12,
            width: expression === 'shocked' ? 14 : 9,
            height: expression === 'shocked' ? 14 : 9,
            backgroundColor: '#FFFFFF',
            borderRadius: '50%',
            border: `1px solid ${DARK}`,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ position: 'absolute', top: 4, left: 4, width: 5, height: 5, backgroundColor: DARK, borderRadius: '50%' }} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 26,
            left: 34,
            width: expression === 'shocked' ? 14 : 9,
            height: expression === 'shocked' ? 14 : 9,
            backgroundColor: '#FFFFFF',
            borderRadius: '50%',
            border: `1px solid ${DARK}`,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ position: 'absolute', top: 4, left: 4, width: 5, height: 5, backgroundColor: DARK, borderRadius: '50%' }} />
        </div>

        {/* Brows, raised when shocked */}
        <div style={{ position: 'absolute', top: expression === 'shocked' ? 16 : 20, left: 12, width: 12, height: 3, backgroundColor: DARK, borderRadius: 2 }} />
        <div style={{ position: 'absolute', top: expression === 'shocked' ? 16 : 20, left: 36, width: 12, height: 3, backgroundColor: DARK, borderRadius: 2 }} />

        {/* Mouth */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 30 - mouthOpen / 2,
            width: mouthOpen,
            height: expression === 'shocked' ? 12 : 5,
            backgroundColor: expression === 'shocked' ? '#EF4444' : '#C98A6B',
            borderRadius: '0 0 8px 8px',
          }}
        />
      </div>
    </div>
  );
};
