import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { ChapterFade } from '../ChapterFade';
import { SANS_BOLD } from '../fonts';
import { PALETTE, fadeIn, fadeOut } from '../theme';
import { UniversalScene } from './UniversalScene';
import { AnimationSpec, NarrationCue } from './types';
import { timingFor } from './validate';

/**
 * Turns an `AnimationSpec` into a Remotion timeline: one `<Sequence>` per scene, each wrapped in a
 * chapter dip, plus optional burned-in narration.
 *
 * The component is deliberately dumb — all timing comes from `timingFor(spec)`, so the composition's
 * `durationInFrames` and the scene starts can never disagree with the spec.
 */

export type SpecMovieProps = { spec: AnimationSpec };

const Caption: React.FC<{ cue: NarrationCue; durationInFrames: number }> = ({ cue, durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(fadeIn(frame, 0, 8), fadeOut(frame, durationInFrames, 8));
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 64 }}>
      <div
        style={{
          maxWidth: 1320,
          padding: '16px 30px',
          borderRadius: 14,
          backgroundColor: `${PALETTE.ink}CC`,
          border: `2px solid ${PALETTE.goldSoft}33`,
          opacity,
          fontFamily: SANS_BOLD,
          fontSize: 34,
          lineHeight: 1.3,
          color: PALETTE.cream,
          textAlign: 'center',
          textShadow: `0 2px 16px ${PALETTE.ink}`,
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};

export const SpecMovie: React.FC<SpecMovieProps> = ({ spec }) => {
  const timing = timingFor(spec);
  const cues = spec.narration ?? [];

  return (
    <>
      {spec.scenes.map((scene, index) => (
        <Sequence key={scene.id} from={timing.sceneStarts[index]} durationInFrames={scene.durationFrames}>
          <ChapterFade durationInFrames={scene.durationFrames}>
            <UniversalScene
              scene={scene}
              primaryColor={spec.theme.primaryColor}
              secondaryColor={spec.theme.secondaryColor}
              accentColor={spec.theme.accentColor}
            />
          </ChapterFade>
        </Sequence>
      ))}

      {spec.showNarration
        ? cues.map((cue, index) => {
            const next = cues[index + 1]?.frameStart ?? timing.durationInFrames;
            const durationInFrames = Math.max(30, Math.min(next - cue.frameStart, 150));
            return (
              <Sequence key={`cue-${index}`} from={cue.frameStart} durationInFrames={durationInFrames}>
                <Caption cue={cue} durationInFrames={durationInFrames} />
              </Sequence>
            );
          })
        : null}
    </>
  );
};
