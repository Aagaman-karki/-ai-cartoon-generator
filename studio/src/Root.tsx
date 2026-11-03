import React from 'react';
import { Composition } from 'remotion';
import { MainSequence } from './MainSequence';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="MainSequence"
        component={MainSequence}
        durationInFrames={1600}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
