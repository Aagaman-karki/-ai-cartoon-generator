import React from 'react';
import { Composition } from 'remotion';
import { MainSequence } from './MainSequence';
import { SpecMovie } from './spec/SpecMovie';
import { SPECS } from './specs';
import { AnimationSpec } from './spec/types';
import { timingFor, validateSpec } from './spec/validate';

/**
 * Remotion root: registers every renderable composition.
 *
 * Three kinds live here:
 *
 * * `WhatIfMoon` — the hand-authored episode, built from the scene components in `src/`.
 * * `Spec-<slug>` — one composition per `AnimationSpec` in `src/specs/`. These are generated from
 *   JSON (by a model or by hand) and rendered by the factory components, so a new episode needs no
 *   new React code. Timing comes from `timingFor(spec)`, never from a constant.
 * * `Spec-External` — renders a spec handed in at render time, so a generated file needs no import
 *   and no edit to `src/specs/index.ts`:
 *   `npx remotion render Spec-External out/spec.mp4 --props=../animation_spec.json`
 *
 * `Spec-External` validates its props in `calculateMetadata`, so a malformed spec fails before a
 * frame is rendered, with the validator's error list, instead of crashing mid-timeline.
 */

/**
 * `Spec-External` needs *some* default props so the studio and `remotion compositions` can evaluate
 * it without `--props`. This placeholder renders one card telling you what to pass.
 */
const PLACEHOLDER_SPEC: AnimationSpec = {
  title: 'No spec loaded',
  slug: 'external',
  theme: {
    primaryColor: '#F2B53C',
    secondaryColor: '#141A3A',
    accentColor: '#FF7A3D',
    fontFamily: 'StudioSansBold',
  },
  narration: [],
  scenes: [
    {
      id: 'placeholder',
      type: 'vector_environment',
      durationFrames: 120,
      background: 'twilight_skyline',
      backgroundOptions: { dim: 0.35 },
      camera: 'slow_zoom_in',
      elements: [
        {
          type: 'text_overlay',
          eyebrow: 'SPEC-EXTERNAL',
          text: 'PASS --PROPS',
          sub: 'npx remotion render Spec-External out/spec.mp4 --props=../animation_spec.json',
          size: 'header',
          align: 'center',
          x: 960,
          y: 470,
          animation: 'spring_pop',
        },
      ],
    },
  ],
};

/** Renders whatever spec arrives as props; validation happens in `calculateMetadata` below. */
const ExternalSpec: React.FC<AnimationSpec> = (props) => <SpecMovie spec={props} />;

const PLACEHOLDER_TIMING = timingFor(PLACEHOLDER_SPEC);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id='WhatIfMoon'
        component={MainSequence}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={1600}
      />
      {SPECS.map(({ spec, timing }) => (
        <Composition
          key={spec.slug}
          id={`Spec-${spec.slug}`}
          component={SpecMovie}
          defaultProps={{ spec }}
          width={timing.width}
          height={timing.height}
          fps={timing.fps}
          durationInFrames={timing.durationInFrames}
        />
      ))}
      <Composition
        id='Spec-External'
        component={ExternalSpec}
        defaultProps={PLACEHOLDER_SPEC}
        width={PLACEHOLDER_TIMING.width}
        height={PLACEHOLDER_TIMING.height}
        fps={PLACEHOLDER_TIMING.fps}
        durationInFrames={PLACEHOLDER_TIMING.durationInFrames}
        calculateMetadata={({ props }) => {
          const result = validateSpec(props);
          if (!result.ok) {
            throw new Error(
              `animation_spec.json is not a valid AnimationSpec (${result.errors.length} problem(s)):\n- ${result.errors.join('\n- ')}`,
            );
          }
          result.warnings.forEach((warning) => console.warn(`[spec] ${warning}`));
          return {
            durationInFrames: result.timing.durationInFrames,
            fps: result.timing.fps,
            width: result.timing.width,
            height: result.timing.height,
          };
        }}
      />
    </>
  );
};
