import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Character } from './Character';
import { HudChip, Particles, Ridge, Sky, Title, Vignette } from './Atmosphere';
import { SANS_BOLD } from './fonts';
import { PALETTE, camera, fadeIn, pop, track } from './theme';

/**
 * Chapter 04 — "Sync Lost".
 *
 * A control room under a dome slit, last light leaking in from the horizon outside. Consoles burn
 * amber, a beacon sweeps the room, and the central readout spins up to a failure state. The character
 * stands in the foreground at the frame's bottom edge (feet at y=1072), lit from behind by it.
 *
 * The only saturated colours here are the gold consoles and the ember alert rim, which keeps the
 * eye moving from the readout to the character.
 */

const DURATION = 400;

const Console: React.FC<{ x: number; width: number; alert: number; bars: number }> = ({ x, width, alert, bars }) => {
  const height = 250;
  return (
    <div style={{ position: 'absolute', left: x, bottom: 0, width, height }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${PALETTE.shadow} 0%, ${PALETTE.shadowDeep} 55%, ${PALETTE.ink} 100%)`,
          borderTop: `6px solid ${PALETTE.gold}88`,
          boxShadow: `0 -20px 60px ${PALETTE.amber}33`,
        }}
      />
      {/* Screen */}
      <div
        style={{
          position: 'absolute',
          left: 22,
          right: 22,
          top: 26,
          height: 112,
          borderRadius: 8,
          background: `linear-gradient(180deg, ${PALETTE.amber}22, ${PALETTE.ink})`,
          border: `2px solid ${PALETTE.gold}55`,
          overflow: 'hidden',
        }}
      >
        {[0, 1, 2, 3, 4].map((row) => (
          <div
            key={row}
            style={{
              position: 'absolute',
              left: 14,
              top: 16 + row * 20,
              height: 7,
              width: `${(0.28 + 0.6 * Math.abs(Math.sin(bars * 0.05 + row * 1.3))) * 100}%`,
              borderRadius: 4,
              background: row === 0 ? PALETTE.ember : PALETTE.gold,
              opacity: 0.35 + alert * 0.45,
            }}
          />
        ))}
      </div>
      {/* Status strip */}
      <div style={{ position: 'absolute', left: 22, top: 154, right: 22, height: 10, borderRadius: 5, background: PALETTE.ink, overflow: 'hidden' }}>
        <div style={{ width: `${30 + alert * 60}%`, height: '100%', background: `linear-gradient(90deg, ${PALETTE.gold}, ${PALETTE.ember})` }} />
      </div>
      <div style={{ position: 'absolute', left: 22, top: 178, width: `${width - 44}px`, height: 4, borderRadius: 2, background: PALETTE.violet, opacity: 0.35 }} />
      <div style={{ position: 'absolute', left: 22, top: 194, width: `${(width - 44) * 0.6}px`, height: 4, borderRadius: 2, background: PALETTE.violet, opacity: 0.25 }} />
    </div>
  );
};

export const ObservatoryScene: React.FC = () => {
  const frame = useCurrentFrame();

  const alert = track(frame, [40, 260], [0.15, 1]);
  const sweep = Math.sin(frame * 0.022) * 24;
  const flicker = 0.82 + 0.18 * Math.sin(frame * 0.4);
  const readout = pop(frame, 30, 42, { damping: 18, stiffness: 100 });
  const readoutPulse = 0.6 + 0.4 * Math.sin(frame * 0.16);
  const lossValue = track(frame, [60, 300], [0, 88.4]);

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={camera(frame, DURATION, { from: 1.02, to: 1.08, origin: '50% 62%' })}>
        {/* Dome interior */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(120% 95% at 50% 12%, ${PALETTE.shadow} 0%, ${PALETTE.shadowDeep} 42%, ${PALETTE.ink} 82%)`,
          }}
        />
        {/* Dome ribs */}
        <svg width={1920} height={1080} viewBox='0 0 1920 1080' style={{ position: 'absolute', inset: 0 }}>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const spread = 300 + index * 260;
            return (
              <path
                key={index}
                d={`M${960 - spread} 1080 Q960 ${420 - index * 22} ${960 + spread} 1080`}
                fill='none'
                stroke={PALETTE.violet}
                strokeOpacity={0.18}
                strokeWidth={3}
              />
            );
          })}
        </svg>

        {/* Dome slit: the sky outside */}
        <div
          style={{
            position: 'absolute',
            left: 610,
            top: 40,
            width: 700,
            height: 430,
            borderRadius: '350px 350px 24px 24px',
            overflow: 'hidden',
            border: `12px solid ${PALETTE.shadow}`,
            boxSizing: 'border-box',
            boxShadow: `inset 0 0 70px ${PALETTE.ink}CC, 0 0 0 2px ${PALETTE.gold}22`,
          }}
        >
          <Sky variant='night' stars={30} seed={88} sun={{ x: 350, y: 430, r: 92, color: PALETTE.amber }} />
          <Ridge baseline={300} amplitude={52} color={PALETTE.shadowDeep} seed={29} opacity={0.9} drift={10} />
          <Ridge baseline={352} amplitude={34} color={PALETTE.ink} seed={67} opacity={1} drift={22} />
        </div>

        {/* Beacon sweeping the room */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            transform: `rotate(${sweep}deg)`,
            transformOrigin: '1700px 130px',
          }}
        >
          {/* Soft pool of light; rotation about the lamp sweeps it across the room without hard edges */}
          <div
            style={{
              position: 'absolute',
              left: 180,
              top: 40,
              width: 1560,
              height: 960,
              borderRadius: '50%',
              background: `radial-gradient(ellipse 48% 42% at 50% 50%, ${PALETTE.gold}33 0%, ${PALETTE.amber}12 52%, transparent 78%)`,
              filter: 'blur(22px)',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 1676,
            top: 106,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${PALETTE.goldSoft}, ${PALETTE.ember})`,
            boxShadow: `0 0 60px ${PALETTE.amber}, 0 0 140px ${PALETTE.ember}88`,
            opacity: flicker,
          }}
        />

        {/* Warm floor bounce */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 460,
            background: `linear-gradient(0deg, ${PALETTE.amber}1A 0%, transparent 100%)`,
          }}
        />

        {/* Console row */}
        <Console x={150} width={440} alert={alert} bars={frame} />
        <Console x={700} width={520} alert={alert} bars={frame + 40} />
        <Console x={1330} width={420} alert={alert} bars={frame + 80} />

        {/* Character in the foreground, backlit by its own console */}
        <div
          style={{
            position: 'absolute',
            left: 130,
            top: 590,
            width: 420,
            height: 470,
            background: `radial-gradient(ellipse 50% 50% at 50% 60%, ${PALETTE.amber}3D 0%, transparent 100%)`,
            opacity: alert,
          }}
        />
        <Character x={330} y={1072} scale={1.3} action='panicked' actionStart={20} expression='shocked' />

        {/* Central readout */}
        <div
          style={{
            position: 'absolute',
            left: 760,
            top: 596,
            width: 400,
            padding: '20px 24px',
            borderRadius: 14,
            backgroundColor: `${PALETTE.ink}E6`,
            border: `2px solid ${PALETTE.gold}AA`,
            boxShadow: `0 20px 70px ${PALETTE.ink}, 0 0 ${40 + readoutPulse * 40}px ${PALETTE.amber}55`,
            opacity: readout,
            transform: `translateY(${(1 - readout) * 30}px)`,
          }}
        >
          <div style={{ fontFamily: SANS_BOLD, fontSize: 15, letterSpacing: 4, color: `${PALETTE.cream}99` }}>
            SYSTEM OVERRIDE
          </div>
          <div
            style={{
              fontFamily: SANS_BOLD,
              fontSize: 46,
              color: PALETTE.gold,
              letterSpacing: 1,
              marginTop: 4,
              textShadow: `0 0 30px ${PALETTE.amber}88`,
            }}
          >
            SYNC LOSS {lossValue.toFixed(1)}%
          </div>
          <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: PALETTE.shadowDeep, overflow: 'hidden' }}>
            <div style={{ width: `${lossValue}%`, height: '100%', background: `linear-gradient(90deg, ${PALETTE.gold}, ${PALETTE.ember})` }} />
          </div>
        </div>

        <Particles count={26} seed={13} opacity={0.5} />
      </AbsoluteFill>

      <Title
        eyebrow='CHAPTER 04'
        header='SYNC LOST'
        sub='The timeline comes apart.'
        x={118}
        y={154}
        delay={16}
        ruleWidth={260}
      />
      <HudChip label='TIME CHANNEL' value='DESYNCHRONISED' tone='alert' x={118} y={430} />

      {/* Ember alert rim, pulsing with the readout */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: `radial-gradient(ellipse at 50% 50%, transparent 55%, ${PALETTE.ember}${Math.round(20 + readoutPulse * 40)
            .toString(16)
            .padStart(2, '0')} 100%)`,
        }}
      />
      <AbsoluteFill style={{ backgroundColor: PALETTE.ink, opacity: 1 - fadeIn(frame, 0, 12) }} />
      <Vignette strength={1.15} />
    </AbsoluteFill>
  );
};
