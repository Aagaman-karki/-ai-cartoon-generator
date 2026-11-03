import React from 'react';
import { Sequence } from 'remotion';
import { DeskScene } from './DeskScene';
import { StaircaseScene } from './StaircaseScene';
import { CitySkylineScene } from './CitySkylineScene';
import { ObservatoryScene } from './ObservatoryScene';

/**
 * Master timeline for the "What If the Moon Vanished?" episode.
 *
 * Four back-to-back <Sequence> blocks of 400 frames each (1,600 frames total); at the default
 * 30 fps that is ~13.3 s per scene. Each scene owns its own animation and assumes it starts at
 * local frame 0, so these durations and the composition's `durationInFrames` in Root.tsx have to be
 * kept in step.
 */
export const MainSequence: React.FC = () => {
  return (
    <>
      <Sequence from={0} durationInFrames={400}>
        <DeskScene />
      </Sequence>
      <Sequence from={400} durationInFrames={400}>
        <StaircaseScene />
      </Sequence>
      <Sequence from={800} durationInFrames={400}>
        <CitySkylineScene />
      </Sequence>
      <Sequence from={1200} durationInFrames={400}>
        <ObservatoryScene />
      </Sequence>
    </>
  );
};
