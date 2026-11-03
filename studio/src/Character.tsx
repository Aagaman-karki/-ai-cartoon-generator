import React from 'react';
import { useCurrentFrame } from 'remotion';

export interface CharacterProps {
  x?: number;
  y?: number;
  scale?: number;
  action?: 'idle' | 'panicked' | 'walking' | 'pointing';
  expression?: 'neutral' | 'shocked' | 'happy' | 'worried';
}

export const Character: React.FC<CharacterProps> = ({
  x = 0,
  y = 0,
  scale = 1,
  action = 'idle',
  expression = 'neutral'
}) => {
  const frame = useCurrentFrame();

  // Procedural subtle animations
  const breathe = Math.sin(frame * 0.1) * 3;
  const panicShake = action === 'panicked' ? Math.sin(frame * 0.8) * 4 : 0;
  const armWaving = action === 'panicked' ? Math.sin(frame * 0.6) * 15 : 0;

  // Eye heights & shapes according to expression
  const eyeScaleY = expression === 'shocked' ? 1.4 : expression === 'worried' ? 0.8 : 1;
  const pupilOffsetY = expression === 'shocked' ? -2 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x + panicShake,
        top: y + (action === 'panicked' ? -breathe : breathe),
        transform: `scale(${scale})`,
        transformOrigin: 'bottom center',
        width: 140,
        height: 220,
        pointerEvents: 'none'
      }}
    >
      <svg viewBox="0 0 140 220" width="140" height="220">
        {/* Left Arm */}
        <g transform={`rotate(${action === 'panicked' ? -40 + armWaving : 10}, 45, 100)`}>
          <path
            d="M 45 100 Q 25 125 35 150"
            stroke="#F59E0B"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="35" cy="152" r="8" fill="#FCD34D" />
        </g>

        {/* Right Arm */}
        <g transform={`rotate(${action === 'panicked' ? 40 - armWaving : -10}, 95, 100)`}>
          <path
            d="M 95 100 Q 115 125 105 150"
            stroke="#F59E0B"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="105" cy="152" r="8" fill="#FCD34D" />
        </g>

        {/* Legs & Shoes */}
        <path d="M 55 170 L 50 210" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" />
        <ellipse cx="48" cy="214" rx="12" ry="6" fill="#0F172A" />

        <path d="M 85 170 L 90 210" stroke="#1E293B" strokeWidth="12" strokeLinecap="round" />
        <ellipse cx="92" cy="214" rx="12" ry="6" fill="#0F172A" />

        {/* Body / Hoodie */}
        <path
          d="M 42 95 Q 70 85 98 95 L 94 175 Q 70 180 46 175 Z"
          fill="#3B82F6"
          stroke="#1D4ED8"
          strokeWidth="3"
        />

        {/* Neck */}
        <rect x="62" y="70" width="16" height="15" fill="#FCD34D" />

        {/* Head */}
        <circle cx="70" cy="50" r="32" fill="#FCD34D" stroke="#F59E0B" strokeWidth="3" />

        {/* Hair */}
        <path
          d="M 38 48 C 38 20 60 16 70 16 C 85 16 102 22 102 48 C 96 32 86 30 70 30 C 52 30 44 36 38 48 Z"
          fill="#475569"
        />

        {/* Eyes */}
        <g transform={`scale(1, ${eyeScaleY})`} style={{ transformOrigin: '70px 48px' }}>
          {/* Left Eye */}
          <ellipse cx="58" cy="48" rx={expression === 'shocked' ? 8 : 6} ry={expression === 'shocked' ? 9 : 7} fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
          <circle cx="58" cy={48 + pupilOffsetY} r={expression === 'shocked' ? 3.5 : 3} fill="#0F172A" />
          {/* Right Eye */}
          <ellipse cx="82" cy="48" rx={expression === 'shocked' ? 8 : 6} ry={expression === 'shocked' ? 9 : 7} fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
          <circle cx="82" cy={48 + pupilOffsetY} r={expression === 'shocked' ? 3.5 : 3} fill="#0F172A" />
        </g>

        {/* Eyebrows */}
        {expression === 'shocked' ? (
          <>
            <path d="M 50 34 Q 58 28 66 34" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 74 34 Q 82 28 90 34" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M 52 36 Q 58 34 64 36" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 76 36 Q 82 34 88 36" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* Mouth */}
        {expression === 'shocked' ? (
          <ellipse cx="70" cy="65" rx="7" ry="9" fill="#0F172A" />
        ) : (
          <path d="M 64 64 Q 70 69 76 64" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        )}

        {/* Panic Sweat Drops */}
        {action === 'panicked' && (
          <g opacity={Math.abs(Math.sin(frame * 0.2))}>
            <path
              d="M 106 35 C 106 31 110 26 110 26 C 110 26 114 31 114 35 C 114 37 112 39 110 39 C 108 39 106 37 106 35 Z"
              fill="#38BDF8"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
