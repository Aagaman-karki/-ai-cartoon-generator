import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { CityLine, Particles, Ridge, Sky } from '../Atmosphere';
import { PALETTE, track } from '../theme';
import { SceneBackgroundOptions, Theme } from './types';

/**
 * The background factory — one component per `BackgroundType`, all driven by the spec.
 *
 * Every environment is assembled from the atmosphere primitives, so a new background is a short
 * composition rather than a new art direction. The spec's theme is applied two ways: the primary
 * colour becomes the light source (sun, lamp, consoles) and the secondary colour tints the whole
 * frame, which keeps generated specs visually distinct without new code.
 */

export type BackgroundProps = {
  theme: Theme;
  options?: SceneBackgroundOptions;
  /** Scene length, used by backgrounds with their own camera-ish motion. */
  duration: number;
};

const SUN_DEFAULT = { x: 1400, y: 640, r: 140, rays: true };

/** Colour wash that carries the spec's `secondaryColor` into every environment. */
const ThemeTint: React.FC<{ theme: Theme }> = ({ theme }) => (
  <AbsoluteFill style={{ backgroundColor: theme.secondaryColor, opacity: 0.32, mixBlendMode: 'multiply' }} />
);

export const DuskRoom: React.FC<BackgroundProps> = ({ theme, options }) => {
  const window = { left: 470, top: 96, width: 940, height: 620 };
  const sun = options?.sun ?? { x: 520, y: 232, r: 66 };
  const frame = useCurrentFrame();
  const dim = options?.dim ?? 0;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(120% 90% at 78% 34%, ${theme.secondaryColor} 0%, ${PALETTE.ink} 100%)`,
        }}
      />
      <div style={{ position: 'absolute', left: window.left, top: window.top, width: window.width, height: window.height, borderRadius: 26, border: `16px solid ${PALETTE.shadow}`, boxSizing: 'border-box', overflow: 'hidden', boxShadow: `0 40px 90px ${PALETTE.ink}, inset 0 0 80px ${PALETTE.ink}AA` }}>
        <Sky variant='dusk' stars={options?.stars ?? 40} seed={options?.seed ?? 31} dim={dim} sun={{ ...sun, color: theme.primaryColor }} />
        <Ridge baseline={430} amplitude={54} color={PALETTE.shadow} seed={12} opacity={0.95} drift={8} />
        <Ridge baseline={480} amplitude={40} color={PALETTE.ink} seed={44} opacity={1} drift={16} />
        <CityLine baseline={560} height={150} color={PALETTE.ink} seed={19} windows={0.7} drift={26} />
        <div style={{ position: 'absolute', left: '52%', top: 0, width: 14, height: '100%', marginLeft: -7, backgroundColor: PALETTE.shadowDeep }} />
        <div style={{ position: 'absolute', top: '56%', left: 0, width: '100%', height: 14, marginTop: -7, backgroundColor: PALETTE.shadowDeep }} />
      </div>

      {/* Warm lamp on the right, keyed to the theme */}
      <div style={{ position: 'absolute', left: 1400, top: 220, width: 520, height: 720, background: `radial-gradient(ellipse 50% 44% at 55% 46%, ${theme.primaryColor}44 0%, transparent 100%)` }} />
      <div style={{ position: 'absolute', left: 1694, top: 400, width: 12, height: 466, backgroundColor: PALETTE.shadow, borderRadius: 5 }} />
      <div style={{ position: 'absolute', left: 1650, top: 856, width: 100, height: 16, borderRadius: 8, backgroundColor: PALETTE.shadow }} />
      <div style={{ position: 'absolute', left: 1636, top: 336, width: 128, height: 66, background: theme.primaryColor, clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)', boxShadow: `0 0 80px ${theme.primaryColor}BB` }} />
      <div style={{ position: 'absolute', left: 1600, top: 396, width: 200, height: 470, filter: 'blur(18px)', opacity: 0.6 }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${theme.primaryColor}33 0%, transparent 100%)`, clipPath: 'polygon(34% 0%, 66% 0%, 100% 100%, 0% 100%)' }} />
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 210, background: `linear-gradient(180deg, ${PALETTE.shadow} 0%, ${PALETTE.ink} 100%)` }}>
        <div style={{ position: 'absolute', top: -10, left: 0, right: 0, height: 10, background: `linear-gradient(180deg, ${theme.primaryColor}66, ${PALETTE.shadow})` }} />
      </div>
      <Particles count={20} seed={17} opacity={0.45} />
      <ThemeTint theme={theme} />
      {frame >= 0 ? null : null}
    </AbsoluteFill>
  );
};

export const TwilightSkyline: React.FC<BackgroundProps> = ({ theme, options }) => {
  const depth = Math.max(2, Math.min(3, options?.depth ?? 3));
  return (
    <AbsoluteFill>
      <Sky sun={{ ...SUN_DEFAULT, ...(options?.sun ?? {}), color: theme.primaryColor }} stars={options?.stars ?? 36} seed={options?.seed ?? 61} dim={options?.dim ?? 0} />
      <CityLine baseline={780} height={200} color={PALETTE.violet} seed={71} opacity={0.45} windows={0.4} drift={14} haze={0.6} />
      {depth >= 2 ? (
        <CityLine baseline={860} height={260} color={PALETTE.shadow} seed={83} opacity={0.85} windows={0.7} drift={32} haze={0.3} />
      ) : null}
      <CityLine baseline={912} height={170} color={PALETTE.ink} seed={97} opacity={1} windows={1} drift={56} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 182 }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${PALETTE.shadowDeep} 0%, ${PALETTE.ink} 100%)` }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 46, background: `linear-gradient(180deg, ${PALETTE.shadow}, ${PALETTE.shadowDeep})` }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 7, background: `linear-gradient(90deg, transparent, ${theme.primaryColor}CC 34%, ${theme.accentColor ?? PALETTE.ember}99 66%, transparent)` }} />
      </div>
      <Particles count={26} seed={41} opacity={0.5} />
      <ThemeTint theme={theme} />
    </AbsoluteFill>
  );
};

export const FloatingStaircase: React.FC<BackgroundProps> = ({ theme, options, duration }) => {
  const frame = useCurrentFrame();
  const seed = options?.seed ?? 9;
  const rise = track(frame, [0, duration], [0, -44]);
  const steps = Array.from({ length: 10 }, (_, index) => ({
    x: 128 + index * 154,
    y: 1012 - index * 74,
    detached: index === 4 || index === 7,
    phase: index * 1.7 + seed,
  }));

  return (
    <AbsoluteFill>
      <Sky sun={{ x: 1452, y: 704, r: 132, rays: true, ...(options?.sun ?? {}), color: theme.primaryColor }} stars={options?.stars ?? 50} seed={seed} dim={options?.dim ?? 0} />
      <Ridge baseline={828} amplitude={86} color={PALETTE.violet} seed={21} opacity={0.55} drift={18} />
      <Ridge baseline={900} amplitude={64} color={PALETTE.shadow} seed={37} opacity={0.85} drift={42} />
      <Ridge baseline={1004} amplitude={44} color={PALETTE.ink} seed={53} opacity={1} drift={70} />
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${rise}px)` }}>
        {steps.map((step, index) => {
          const lift = step.detached ? Math.sin(frame * 0.05 + step.phase) * 26 : 0;
          const tilt = step.detached ? Math.sin(frame * 0.04 + step.phase) * 4 : 0;
          return (
            <div key={index} style={{ position: 'absolute', left: step.x, top: step.y + lift, width: 236, height: 34, transform: `skewX(-18deg) rotate(${tilt}deg)`, transformOrigin: '0% 100%' }}>
              <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${PALETTE.shadowLift}, ${PALETTE.shadowDeep})`, boxShadow: `inset 0 -8px 0 ${PALETTE.ink}55` }} />
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 6, background: `linear-gradient(90deg, ${theme.primaryColor}, ${theme.accentColor ?? PALETTE.ember})`, opacity: step.detached ? 0.85 : 0.6, boxShadow: `0 0 24px ${theme.primaryColor}99` }} />
            </div>
          );
        })}
      </div>
      <Particles count={34} seed={23} opacity={0.6} />
      <ThemeTint theme={theme} />
    </AbsoluteFill>
  );
};

export const DomeInterior: React.FC<BackgroundProps> = ({ theme, options }) => {
  const frame = useCurrentFrame();
  const sweep = Math.sin(frame * 0.022) * 24;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 95% at 50% 12%, ${theme.secondaryColor} 0%, ${PALETTE.ink} 82%)` }} />
      <svg width={1920} height={1080} viewBox='0 0 1920 1080' style={{ position: 'absolute', inset: 0 }}>
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const spread = 300 + index * 260;
          return <path key={index} d={`M${960 - spread} 1080 Q960 ${420 - index * 22} ${960 + spread} 1080`} fill='none' stroke={PALETTE.violet} strokeOpacity={0.18} strokeWidth={3} />;
        })}
      </svg>
      <div style={{ position: 'absolute', left: 610, top: 40, width: 700, height: 430, borderRadius: '350px 350px 24px 24px', overflow: 'hidden', border: `12px solid ${PALETTE.shadow}`, boxSizing: 'border-box', boxShadow: `inset 0 0 70px ${PALETTE.ink}CC` }}>
        <Sky variant='night' stars={options?.stars ?? 26} seed={options?.seed ?? 88} sun={{ x: 350, y: 430, r: 92, color: theme.primaryColor }} />
        <Ridge baseline={300} amplitude={52} color={PALETTE.shadowDeep} seed={29} opacity={0.9} drift={10} />
        <Ridge baseline={352} amplitude={34} color={PALETTE.ink} seed={67} opacity={1} drift={22} />
      </div>
      <div style={{ position: 'absolute', inset: 0, transform: `rotate(${sweep}deg)`, transformOrigin: '1700px 130px' }}>
        <div style={{ position: 'absolute', left: 180, top: 40, width: 1560, height: 960, borderRadius: '50%', background: `radial-gradient(ellipse 48% 42% at 50% 50%, ${theme.primaryColor}33 0%, transparent 78%)`, filter: 'blur(22px)' }} />
      </div>
      <div style={{ position: 'absolute', left: 1676, top: 106, width: 48, height: 48, borderRadius: '50%', background: `radial-gradient(circle, ${theme.primaryColor}, ${theme.accentColor ?? PALETTE.ember})`, boxShadow: `0 0 60px ${theme.primaryColor}, 0 0 140px ${theme.accentColor ?? PALETTE.ember}88` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 250, background: `linear-gradient(180deg, ${PALETTE.shadow} 0%, ${PALETTE.ink} 100%)`, borderTop: `4px solid ${theme.primaryColor}44` }} />
      <Particles count={22} seed={13} opacity={0.45} />
      <ThemeTint theme={theme} />
    </AbsoluteFill>
  );
};

export const OpenHorizon: React.FC<BackgroundProps> = ({ theme, options }) => (
  <AbsoluteFill>
    <Sky sun={{ ...SUN_DEFAULT, ...(options?.sun ?? {}), color: theme.primaryColor }} stars={options?.stars ?? 60} seed={options?.seed ?? 5} dim={options?.dim ?? 0} />
    <Ridge baseline={720} amplitude={120} color={PALETTE.violet} seed={11} opacity={0.5} drift={16} detail={5} />
    <Ridge baseline={840} amplitude={90} color={PALETTE.shadow} seed={29} opacity={0.8} drift={38} />
    <Ridge baseline={980} amplitude={60} color={PALETTE.ink} seed={47} opacity={1} drift={64} />
    <Particles count={30} seed={7} opacity={0.55} />
    <ThemeTint theme={theme} />
  </AbsoluteFill>
);

/** Lookup used by `UniversalScene`; adding a background means adding it here and to the type. */
export const BACKGROUNDS = {
  dusk_room: DuskRoom,
  twilight_skyline: TwilightSkyline,
  floating_staircase: FloatingStaircase,
  dome_interior: DomeInterior,
  open_horizon: OpenHorizon,
} as const;
