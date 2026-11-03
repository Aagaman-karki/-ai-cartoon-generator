import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { PALETTE, fadeIn, fadeOut } from './theme';

/**
 * Dips a chapter in from black and back out again, so a hard `<Sequence>` cut reads as a deliberate
 * chapter break. Must be rendered inside the `<Sequence>` it wraps: its fade is measured from the
 * sequence's local frame 0.
 */
export const ChapterFade: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const dip = 12;
  const opacity = Math.min(fadeIn(frame, 0, dip), fadeOut(frame, durationInFrames, dip));
  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.ink }}>
      <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
