import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { DeskScene } from './DeskScene';
import { StaircaseScene } from './StaircaseScene';
import { CitySkylineScene } from './CitySkylineScene';
import { ObservatoryScene } from './ObservatoryScene';
import { PALETTE, fadeIn, fadeOut } from './theme';

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
/** Fade length at each end of a chapter, in frames (0.4 s at 30 fps). */
const DIP = 12;

const ChapterFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(fadeIn(frame, 0, DIP), fadeOut(frame, CHAPTER, DIP));
  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.ink }}>
      <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const MainSequence: React.FC = () => {
  return (
    <>
      <Sequence from={0} durationInFrames={CHAPTER}>
        <ChapterFade>
          <DeskScene />
        </ChapterFade>
      </Sequence>
      <Sequence from={400} durationInFrames={CHAPTER}>
        <ChapterFade>
          <StaircaseScene />
        </ChapterFade>
      </Sequence>
      <Sequence from={800} durationInFrames={CHAPTER}>
        <ChapterFade>
          <CitySkylineScene />
        </ChapterFade>
      </Sequence>
      <Sequence from={1200} durationInFrames={CHAPTER}>
        <ChapterFade>
          <ObservatoryScene />
        </ChapterFade>
      </Sequence>
    </>
  );
};
