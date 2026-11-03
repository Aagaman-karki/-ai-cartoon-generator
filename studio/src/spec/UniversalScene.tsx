import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { HudChip, Particles, Title } from '../Atmosphere';
import { Character } from '../Character';
import { PALETTE, camera } from '../theme';
import { BACKGROUNDS } from './backgrounds';
import { Scene, SceneElement } from './types';

/**
 * Renders one spec scene: a background from the factory, a camera move, then the scene's elements.
 *
 * This is the bridge between generated JSON and the studio's components — it is the only place that
 * knows how a `type` string becomes a React component. Nothing here is scene-specific, so any
 * `AnimationSpec` renders without new code.
 */

export type UniversalSceneProps = {
  scene: Scene;
  /** Spec theme, forwarded to the background factory and the accent colours. */
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
};

/**
 * Glowing fissure: one path drawn twice (a wide low-opacity halo and a bright core), revealed by
 * animating `strokeDashoffset`, with a small frame-driven jitter so it feels unstable.
 */
const Fracture: React.FC<{
  element: Extract<SceneElement, { type: 'fracture' }>;
  accent: string;
}> = ({ element, accent }) => {
  const frame = useCurrentFrame();
  const revealFrames = element.revealFrames ?? 120;
  const progress = Math.min(Math.max((frame - (element.delay ?? 0)) / revealFrames, 0), 1);
  const length = 2000;
  const jitter = Math.sin(frame * 0.22) * 5;
  const color = element.color ?? accent;

  return (
    <svg
      width={1920}
      height={1080}
      viewBox='0 0 1920 1080'
      style={{ position: 'absolute', left: element.x ?? 0, top: element.y ?? 0, transform: `translateX(${jitter}px)` }}
    >
      {[0, 1].map((pass) => (
        <path
          key={pass}
          d={element.path}
          fill='none'
          stroke={pass === 0 ? PALETTE.ember : color}
          strokeWidth={(element.strokeWidth ?? 6) * (pass === 0 ? 3.5 : 1)}
          strokeOpacity={pass === 0 ? 0.22 : 1}
          strokeLinejoin='round'
          strokeLinecap='round'
          strokeDasharray={length}
          strokeDashoffset={length * (1 - progress)}
          style={pass === 1 ? { filter: `drop-shadow(0 0 16px ${color})` } : undefined}
        />
      ))}
    </svg>
  );
};

const ElementView: React.FC<{ element: SceneElement; accent: string; accentAlt: string }> = ({
  element,
  accent,
  accentAlt,
}) => {
  switch (element.type) {
    case 'character':
      return (
        <Character
          x={element.x}
          y={element.y}
          scale={element.scale ?? 1}
          action={element.action ?? 'idle'}
          expression={element.expression ?? 'neutral'}
          actionStart={element.actionStart ?? 0}
          flip={element.flip ?? false}
        />
      );
    case 'text_overlay':
      return (
        <Title
          eyebrow={element.eyebrow}
          header={element.text}
          sub={element.sub}
          align={element.align ?? 'left'}
          x={element.x}
          y={element.y}
          delay={element.delay ?? 8}
          size={element.size ?? 'header'}
          accent={accent}
          animation={element.animation ?? 'spring_pop'}
        />
      );
    case 'hud_chip':
      return (
        <HudChip
          label={element.label}
          value={element.value}
          tone={element.tone ?? 'gold'}
          x={element.x}
          y={element.y}
          align={element.align ?? 'left'}
          delay={element.delay ?? 4}
          accent={element.tone === 'alert' ? accentAlt : accent}
        />
      );
    case 'fracture':
      return <Fracture element={element} accent={accent} />;
    case 'particles':
      return <Particles count={element.count ?? 30} seed={element.seed ?? 5} opacity={element.opacity ?? 0.6} />;
    case 'glow':
      return (
        <div
          style={{
            position: 'absolute',
            left: element.x - element.width / 2,
            top: element.y - element.height / 2,
            width: element.width,
            height: element.height,
            borderRadius: '50%',
            background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${element.color ?? accent}${Math.round(
              (element.intensity ?? 0.35) * 255,
            )
              .toString(16)
              .padStart(2, '0')} 0%, transparent 100%)`,
            filter: 'blur(16px)',
          }}
        />
      );
    default:
      return null;
  }
};

/** Map a spec camera move onto the studio's easing camera helper. */
const cameraFor = (move: Scene['camera'], frame: number, duration: number) => {
  switch (move) {
    case 'slow_zoom_out':
      return camera(frame, duration, { from: 1.08, to: 1.0 });
    case 'pan_up':
      return {
        transform: `translateY(${-frame * (60 / Math.max(1, duration / 30)) * 0.5}px) scale(1.04)`,
        transformOrigin: '50% 50%',
      };
    case 'pan_down':
      return {
        transform: `translateY(${frame * 0.2}px) scale(1.04)`,
        transformOrigin: '50% 50%',
      };
    case 'static':
      return { transform: 'none', transformOrigin: '50% 50%' };
    case 'slow_zoom_in':
    default:
      return camera(frame, duration, { from: 1.02, to: 1.08, origin: '55% 62%' });
  }
};

export const UniversalScene: React.FC<UniversalSceneProps> = ({
  scene,
  primaryColor,
  secondaryColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const Background = BACKGROUNDS[scene.background] ?? BACKGROUNDS.open_horizon;
  const accent = primaryColor;
  const accentAlt = accentColor ?? PALETTE.ember;

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.ink, overflow: 'hidden' }}>
      <AbsoluteFill style={cameraFor(scene.camera, frame, scene.durationFrames)}>
        <Background
          theme={{ primaryColor, secondaryColor, accentColor }}
          options={scene.backgroundOptions}
          duration={scene.durationFrames}
        />
        {scene.elements.map((element, index) => (
          <ElementView key={`${element.type}-${index}`} element={element} accent={accent} accentAlt={accentAlt} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
