import React from 'react';
import { Composition } from 'remotion';
import { MainSequence } from './MainSequence';
import { SpecMovie } from './spec/SpecMovie';
import { SPECS } from './specs';

/**
 * Remotion root: registers every renderable composition.
 *
 * Two kinds live here:
 *
 * * `WhatIfMoon` — the hand-authored episode, built from the scene components in `src/`.
 * * `Spec-<slug>` — one composition per `AnimationSpec` in `src/specs/`. These are generated from
 *   JSON (by a model or by hand) and rendered by the factory components, so a new episode needs no
 *   new React code. Timing comes from `timingFor(spec)`, never from a constant.
 */
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
    </>
  );
};
