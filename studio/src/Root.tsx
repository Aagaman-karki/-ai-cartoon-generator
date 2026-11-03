import React from 'react';
import { Composition } from 'remotion';
import { MainSequence } from './MainSequence';

/**
 * Remotion root: registers every renderable composition.
 *
 * `WhatIfMoon` is a 1920×1080, 30 fps timeline of 1,600 frames (≈53 s), matching the four
 * 400-frame sequences laid out in MainSequence (~13.3 s per storyboard beat).
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WhatIfMoon"
      component={MainSequence}
      width={1920}
      height={1080}
      fps={30}
      durationInFrames={1600}
    />
  );
};
