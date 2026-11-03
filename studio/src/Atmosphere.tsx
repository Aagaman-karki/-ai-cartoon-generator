import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MONO, SANS, SANS_BOLD } from './fonts';
import { NIGHT_SKY, PALETTE, SKY, TYPE, pop, track } from './theme';

/**
 * Shared atmosphere and typography for the studio's scenes.
 *
 * Everything here is a pure function of `useCurrentFrame()`, so renders stay deterministic. The
 * building blocks are layered the way the visual style expects: `<Sky>` (far background, glowing
 * sun with rotating rays) → `<Ridge>`/`<CityLine>` (midground silhouettes) → scene-specific set →
 * `<Particles>` and `<Vignette>` (foreground depth).
 */

const seeded = (seed: number) => {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

export type SkyProps = {
  /** `dusk` is warm twilight; `night` drops to violet for post-event beats. */
  variant?: 'dusk' | 'night';
  /** Sun/moon disc: centre and radius in composition pixels. Omit to leave the sky empty. */
  sun?: { x: number; y: number; r: number; color?: string; rays?: boolean };
  /** 0–1 darkening layer, for beats where the light dies. */
  dim?: number;
  /** How many stars to scatter above the horizon. */
  stars?: number;
  seed?: number;
};

/** Gradient sky, sun disc with soft halo and slowly rotating volumetric rays, plus stars. */
export const Sky: React.FC<SkyProps> = ({
  variant = 'dusk',
  sun,
  dim = 0,
  stars = 70,
  seed = 7,
}) => {
  const frame = useCurrentFrame();
  const starField = React.useMemo(() => {
    const random = seeded(seed);
    return Array.from({ length: stars }, () => ({
      x: random(),
      y: random() * 0.72,
      size: 1.5 + random() * 2.5,
      phase: random() * Math.PI * 2,
    }));
  }, [stars, seed]);

  const sunColor = sun?.color ?? PALETTE.gold;

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, background: variant === 'dusk' ? SKY : NIGHT_SKY }} />

      {/* Stars, only in the upper sky and faded out near the horizon */}
      {starField.map((star, index) => {
        const twinkle = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(frame * 0.05 + star.phase));
        const horizonFade = 1 - star.y / 0.72;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${star.x * 100}%`,
              top: `${star.y * 100}%`,
              width: star.size,
              height: star.size,
              borderRadius: '50%',
              backgroundColor: PALETTE.cream,
              opacity: twinkle * horizonFade,
            }}
          />
        );
      })}

      {sun ? (
        <>
          {/* Wide atmospheric bloom */}
          <div
            style={{
              position: 'absolute',
              left: sun.x - sun.r * 5,
              top: sun.y - sun.r * 5,
              width: sun.r * 10,
              height: sun.r * 10,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${sunColor}55 0%, ${sunColor}18 38%, transparent 68%)`,
            }}
          />
          {/* Rotating rays, masked to a soft ring so they read as light, not spokes */}
          {sun.rays ? (
            <div
              style={{
                position: 'absolute',
                left: sun.x - sun.r * 3.4,
                top: sun.y - sun.r * 3.4,
                width: sun.r * 6.8,
                height: sun.r * 6.8,
                borderRadius: '50%',
                background: `repeating-conic-gradient(from ${frame * 0.18}deg, ${sunColor}3D 0deg 1.4deg, transparent 1.4deg 11deg)`,
                maskImage: 'radial-gradient(closest-side, rgba(0,0,0,0.95) 12%, rgba(0,0,0,0) 74%)',
                WebkitMaskImage: 'radial-gradient(closest-side, rgba(0,0,0,0.95) 12%, rgba(0,0,0,0) 74%)',
              }}
            />
          ) : null}
          {/* Disc */}
          <div
            style={{
              position: 'absolute',
              left: sun.x - sun.r,
              top: sun.y - sun.r,
              width: sun.r * 2,
              height: sun.r * 2,
              borderRadius: '50%',
              background: `radial-gradient(circle at 50% 42%, ${PALETTE.white} 0%, ${sunColor} 62%, ${PALETTE.amber} 100%)`,
              boxShadow: `0 0 ${sun.r * 1.6}px ${sunColor}AA, 0 0 ${sun.r * 4}px ${PALETTE.ember}55`,
            }}
          />
        </>
      ) : null}

      {/* Warm haze band sitting on the horizon */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '48%',
          background: `linear-gradient(0deg, ${PALETTE.amber}33 0%, ${PALETTE.ember}14 45%, transparent 100%)`,
        }}
      />

      {dim > 0 ? <div style={{ position: 'absolute', inset: 0, backgroundColor: PALETTE.ink, opacity: dim }} /> : null}
    </AbsoluteFill>
  );
};

export type RidgeProps = {
  /** Top edge of the silhouette, in composition pixels. */
  baseline: number;
  color: string;
  /** Crest height above `baseline`. */
  amplitude?: number;
  seed?: number;
  opacity?: number;
  /** Number of summed sine terms — more terms give a rougher, more mountainous ridge. */
  detail?: number;
  /** Horizontal drift across the scene, in pixels (parallax). */
  drift?: number;
};

/**
 * A rolling hill/mountain silhouette drawn as one smooth SVG path. The profile is a deterministic
 * sum of sines, so layers built with different seeds nest without repeating.
 */
export const Ridge: React.FC<RidgeProps> = ({
  baseline,
  color,
  amplitude = 110,
  seed = 3,
  opacity = 1,
  detail = 4,
  drift = 0,
}) => {
  const frame = useCurrentFrame();
  const width = 1920;
  const random = seeded(seed);
  const terms = Array.from({ length: detail }, (_, index) => ({
    frequency: (index + 1) * 0.9 + random() * 1.4,
    amplitude: amplitude / (index + 1.6),
    phase: random() * Math.PI * 2,
  }));

  const step = 24;
  const points: string[] = [];
  for (let x = -120; x <= width + 120; x += step) {
    const y = terms.reduce(
      (sum, term) => sum + Math.sin((x / width) * Math.PI * 2 * term.frequency + term.phase) * term.amplitude,
      0,
    );
    points.push(`${x},${(baseline + y).toFixed(1)}`);
  }
  const path = `M-120,1080 L-120,${points[0].split(',')[1]} L${points.join(' L')} L${width + 120},1080 Z`;

  return (
    <svg
      width={width}
      height={1080}
      viewBox={`0 0 ${width} 1080`}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        opacity,
        transform: `translateX(${track(frame, [0, 400], [0, -drift])}px)`,
      }}
    >
      <path d={path} fill={color} />
    </svg>
  );
};

export type CityLineProps = {
  /** Y of the rooftops' base line. */
  baseline: number;
  color: string;
  /** Tallest building height above `baseline`. */
  height?: number;
  seed?: number;
  opacity?: number;
  /** Lit windows, as a density from 0 to 1. */
  windows?: number;
  drift?: number;
  /** Extra haze applied to far layers. */
  haze?: number;
};

/** Deterministic skyline of flat-topped and antenna-topped blocks, with optional lit windows. */
export const CityLine: React.FC<CityLineProps> = ({
  baseline,
  color,
  height = 320,
  seed = 11,
  opacity = 1,
  windows = 0,
  drift = 0,
  haze = 0,
}) => {
  const frame = useCurrentFrame();
  const buildings = React.useMemo(() => {
    const random = seeded(seed);
    const result: { x: number; width: number; height: number; antenna: boolean; lit: boolean[] }[] = [];
    let x = -120;
    while (x < 2040) {
      const buildingWidth = 60 + random() * 120;
      const buildingHeight = height * (0.28 + random() * 0.72);
      const rows = Math.max(1, Math.floor(buildingHeight / 46));
      const columns = Math.max(1, Math.floor(buildingWidth / 34));
      const lit: boolean[] = [];
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          lit.push(random() < windows * 0.5);
        }
      }
      result.push({ x, width: buildingWidth, height: buildingHeight, antenna: random() > 0.72, lit });
      x += buildingWidth + 8 + random() * 26;
    }
    return result;
  }, [seed, height, windows]);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        opacity,
        transform: `translateX(${track(frame, [0, 400], [0, -drift])}px)`,
      }}
    >
      {buildings.map((building, index) => (
        <React.Fragment key={index}>
          <div
            style={{
              position: 'absolute',
              left: building.x,
              top: baseline - building.height,
              width: building.width,
              height: building.height,
              backgroundColor: color,
            }}
          >
            {building.antenna ? (
              <div
                style={{
                  position: 'absolute',
                  left: building.width / 2 - 2,
                  top: -34,
                  width: 4,
                  height: 34,
                  backgroundColor: color,
                }}
              />
            ) : null}
            {building.lit.map((on, cell) =>
              on ? (
                <div
                  key={cell}
                  style={{
                    position: 'absolute',
                    left: 10 + (cell % Math.max(1, Math.floor(building.width / 34))) * 34,
                    top: 14 + Math.floor(cell / Math.max(1, Math.floor(building.width / 34))) * 46,
                    width: 10,
                    height: 16,
                    backgroundColor: PALETTE.gold,
                    opacity: 0.55,
                  }}
                />
              ) : null,
            )}
          </div>
        </React.Fragment>
      ))}
      {haze > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: baseline - height,
            bottom: 0,
            background: `linear-gradient(0deg, ${PALETTE.amber}22, transparent 70%)`,
            opacity: haze,
          }}
        />
      ) : null}
    </div>
  );
};

/** Slow warm dust motes for foreground depth. Deterministic layout, eased drift. */
export const Particles: React.FC<{ count?: number; seed?: number; opacity?: number }> = ({
  count = 34,
  seed = 5,
  opacity = 0.75,
}) => {
  const frame = useCurrentFrame();
  const motes = React.useMemo(() => {
    const random = seeded(seed);
    return Array.from({ length: count }, () => ({
      x: random(),
      y: random(),
      size: 2 + random() * 5,
      speed: 0.15 + random() * 0.5,
      sway: 12 + random() * 34,
      phase: random() * Math.PI * 2,
    }));
  }, [count, seed]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {motes.map((mote, index) => {
        const rise = (frame * mote.speed) % 1120;
        const sway = Math.sin(frame * 0.03 + mote.phase) * mote.sway;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `calc(${mote.x * 100}% + ${sway}px)`,
              top: 1100 - ((mote.y * 1120 + rise) % 1120),
              width: mote.size,
              height: mote.size,
              borderRadius: '50%',
              backgroundColor: PALETTE.goldSoft,
              opacity: opacity * (0.25 + 0.55 * Math.abs(Math.sin(frame * 0.02 + mote.phase))),
              filter: 'blur(0.6px)',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Cinematic edge darkening plus a subtle warm floor bounce. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 46%, transparent 38%, ${PALETTE.ink}${Math.round(120 * strength)
          .toString(16)
          .padStart(2, '0')} 100%)`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 260,
        background: `linear-gradient(0deg, ${PALETTE.ink}AA, transparent 100%)`,
      }}
    />
  </AbsoluteFill>
);

export type TitleProps = {
  /** Small tracked line above the header, e.g. "CHAPTER 01". */
  eyebrow?: string;
  header: string;
  sub?: string;
  align?: 'left' | 'center' | 'right';
  /** Composition-space position of the block. */
  x: number;
  y: number;
  /** Frame, relative to the scene, at which the title animates in. */
  delay?: number;
  /** Gold underline width in px; 0 hides it. */
  ruleWidth?: number;
  /** Header colour; defaults to the studio gold. */
  accent?: string;
  /** Subtext colour; defaults to white. */
  subColor?: string;
  /** Type size: `hero` is the retention hook, `sub` the quiet chapter card. */
  size?: 'hero' | 'header' | 'sub';
  /** Entrance style. `spring_pop` (default) springs, `fade` and `slide_up` ease. */
  animation?: 'spring_pop' | 'fade' | 'slide_up';
};

const TITLE_SIZES = { hero: TYPE.hero, header: TYPE.header, sub: 56 } as const;

/**
 * Focal title: gold, heavy, tightly tracked header over white subtext, with a gold rule that wipes
 * in. Entrance is spring-scaled so headings land with weight instead of floating in.
 */
export const Title: React.FC<TitleProps> = ({
  eyebrow,
  header,
  sub,
  align = 'left',
  x,
  y,
  delay = 8,
  ruleWidth = 220,
  accent = PALETTE.gold,
  subColor = PALETTE.white,
  size = 'header',
  animation = 'spring_pop',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const springEnter = pop(frame, fps, delay, { damping: 18, stiffness: 90, mass: 0.8 });
  const easedEnter = track(frame, [delay, delay + 22], [0, 1]);
  const enter = animation === 'spring_pop' ? springEnter : easedEnter;
  const rule = animation === 'spring_pop' ? pop(frame, fps, delay) : easedEnter;
  const translateY = animation === 'slide_up' ? track(frame, [delay, delay + 24], [44, 0]) : track(frame, [delay, delay + 26], [26, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        textAlign: align,
        transform: `translateY(${translateY}px) scale(${animation === 'spring_pop' ? 0.94 + enter * 0.06 : 1})`,
        transformOrigin: align === 'center' ? '50% 50%' : align === 'right' ? '100% 50%' : '0% 50%',
        opacity: Math.min(1, enter * 1.4),
      }}
    >
      {eyebrow ? (
        <div
          style={{
            fontFamily: SANS_BOLD,
            fontSize: TYPE.eyebrow,
            letterSpacing: 8,
            color: accent,
            opacity: 0.85,
            textShadow: `0 2px 18px ${PALETTE.ink}`,
            marginBottom: 10,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: SANS_BOLD,
          fontSize: TITLE_SIZES[size],
          letterSpacing: -1,
          color: accent,
          lineHeight: 1.02,
          textShadow: `0 6px 0 ${PALETTE.shadowDeep}, 0 18px 48px ${PALETTE.ink}CC, 0 0 70px ${PALETTE.amber}55`,
        }}
      >
        {header}
      </div>
      {ruleWidth > 0 ? (
        <div
          style={{
            height: 7,
            width: ruleWidth * rule,
            marginTop: 18,
            marginLeft: align === 'center' ? 'auto' : undefined,
            marginRight: align === 'center' || align === 'left' ? 'auto' : 0,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${accent}, ${PALETTE.ember})`,
            boxShadow: `0 0 24px ${accent}99`,
          }}
        />
      ) : null}
      {sub ? (
        <div
          style={{
            fontFamily: SANS,
            fontSize: TYPE.sub,
            color: subColor,
            marginTop: 14,
            letterSpacing: 0.5,
            textShadow: `0 2px 14px ${PALETTE.ink}`,
            opacity: 0.92,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

export type HudChipProps = {
  label: string;
  value: string;
  /** `alert` tints the chip ember for failure states. */
  tone?: 'gold' | 'alert';
  x: number;
  y: number;
  align?: 'left' | 'right';
  delay?: number;
  /** Overrides the tone colour. */
  accent?: string;
};

/** Small system readout, used sparingly so it never competes with the focal title. */
export const HudChip: React.FC<HudChipProps> = ({ label, value, tone = 'gold', x, y, align = 'left', delay = 4, accent: accentProp }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = pop(frame, fps, delay, { damping: 20, stiffness: 120 });
  const accent = accentProp ?? (tone === 'alert' ? PALETTE.ember : PALETTE.gold);

  return (
    <div
      style={{
        position: 'absolute',
        left: align === 'left' ? x : undefined,
        right: align === 'right' ? x : undefined,
        top: y,
        opacity: enter,
        transform: `translateY(${(1 - enter) * -14}px)`,
        padding: '12px 22px',
        borderRadius: 10,
        backgroundColor: `${PALETTE.ink}D9`,
        border: `2px solid ${accent}80`,
        boxShadow: `0 12px 34px ${PALETTE.ink}AA, inset 0 0 24px ${accent}1A`,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 13,
          letterSpacing: 3,
          color: `${PALETTE.cream}99`,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: SANS_BOLD,
          fontSize: TYPE.chip,
          letterSpacing: 2,
          color: accent,
          marginTop: 3,
        }}
      >
        {value}
      </div>
    </div>
  );
};
