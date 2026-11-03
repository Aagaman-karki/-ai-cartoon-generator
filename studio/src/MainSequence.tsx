import React from 'react';
import { Sequence } from 'remotion';
import { ChapterFade } from './ChapterFade';
import { DeskScene } from './DeskScene';
import { StaircaseScene } from './StaircaseScene';
import { CitySkylineScene } from './CitySkylineScene';
import { ObservatoryScene } from './ObservatoryScene';

/**
 * Master timeline for the "What If the Moon Vanished?" episode.
 *
 * Four back-to-back <Sequence> blocks of 400 frames each (1,600 frames total); at the default
 * 30 fps that is ~13.3 s per chapter. Each scene owns its own animation and assumes it starts at
 * local frame 0, so these durations and the composition's `durationInFrames` in Root.tsx have to be
 * kept in step.
 *
 * `ChapterFade` dips each chapter in from black and back out again, so the hard Sequence cuts read as
 * deliberate chapter breaks rather than jump cuts.
 */

const CHAPTER = 400;

export const MainSequence: React.FC = () => {
  return (
    <>
      <Sequence from={0} durationInFrames={CHAPTER}>
        <ChapterFade durationInFrames={CHAPTER}>
          <DeskScene />
        </ChapterFade>
      </Sequence>
      <Sequence from={400} durationInFrames={CHAPTER}>
        <ChapterFade durationInFrames={CHAPTER}>
          <StaircaseScene />
        </ChapterFade>
      </Sequence>
      <Sequence from={800} durationInFrames={CHAPTER}>
        <ChapterFade durationInFrames={CHAPTER}>
          <CitySkylineScene />
        </ChapterFade>
      </Sequence>
      <Sequence from={1200} durationInFrames={CHAPTER}>
        <ChapterFade durationInFrames={CHAPTER}>
          <ObservatoryScene />
        </ChapterFade>
      </Sequence>
    </>
  );
};
