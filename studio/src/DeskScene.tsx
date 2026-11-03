import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Character } from './Character';

export const DeskScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Smooth camera zoom
  const scale = interpolate(frame, [0, 400], [1, 1.08], { extrapolateRight: 'clamp' });
  // Screen glow pulsation
  const glowOpacity = 0.5 + Math.sin(frame * 0.1) * 0.2;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0B0F19', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {/* Room background */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, #0F172A 0%, #020617 100%)'
          }}
        />

        {/* Bookshelf & poster on the wall */}
        <div
          style={{
            position: 'absolute',
            top: 100,
            left: 120,
            width: 180,
            height: 240,
            backgroundColor: '#1E293B',
            borderRadius: 8,
            border: '3px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}
        >
          <div style={{ color: '#F8FAFC', fontWeight: 'bold', fontSize: 16 }}>MOON BASE</div>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: '#FDE047',
              marginTop: 15,
              boxShadow: '0 0 20px #FDE047'
            }}
          />
        </div>

        {/* Desk surface */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: 260,
            background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
            borderTop: '6px solid #475569'
          }}
        />

        {/* Computer Monitor */}
        <div
          style={{
            position: 'absolute',
            bottom: 220,
            left: 360,
            width: 320,
            height: 200,
            backgroundColor: '#0F172A',
            borderRadius: 12,
            border: '6px solid #334155',
            boxShadow: `0 0 ${40 * glowOpacity}px rgba(56, 189, 248, ${glowOpacity})`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16
          }}
        >
          <div style={{ color: '#EF4444', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 20 }}>
            🚨 SATELLITE ALERT
          </div>
          <div style={{ color: '#38BDF8', fontFamily: 'monospace', fontSize: 13, marginTop: 8 }}>
            TARGET: LUNAR ORBIT
          </div>
          <div style={{ color: '#FBBF24', fontFamily: 'monospace', fontSize: 12, marginTop: 4 }}>
            STATUS: TARGET DISAPPEARED
          </div>
        </div>

        {/* Monitor Stand */}
        <div
          style={{
            position: 'absolute',
            bottom: 170,
            left: 505,
            width: 30,
            height: 50,
            backgroundColor: '#334155'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 160,
            left: 470,
            width: 100,
            height: 12,
            backgroundColor: '#1E293B',
            borderRadius: 6
          }}
        />

        {/* Animated Character sitting at desk */}
        <Character x={720} y={340} scale={1.3} action="panicked" expression="shocked" />
      </div>

      {/* Narrative Headline Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 60,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: '14px 28px',
          borderRadius: 12,
          border: '2px solid #F59E0B',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 'bold', color: '#FBBF24', letterSpacing: 1 }}>
          SCENE 1: THE DISCOVERY
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
          "What if the Moon vanished right now?"
        </div>
      </div>
    </AbsoluteFill>
  );
};
