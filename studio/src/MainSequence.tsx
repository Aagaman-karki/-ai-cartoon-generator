import React from 'react';
import { Sequence } from 'remotion';
import { DeskScene } from './DeskScene';
import { StaircaseScene } from './StaircaseScene';
import { CitySkylineScene } from './CitySkylineScene';
import { ObservatoryScene } from './ObservatoryScene';

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
