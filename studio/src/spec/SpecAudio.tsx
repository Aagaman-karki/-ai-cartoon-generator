import React from 'react';
import { Audio, interpolate, Sequence, staticFile } from 'remotion';
import RAW_MANIFEST from './audio/manifest.json';

/**
 * Soundtrack for a spec-driven episode.
 *
 * `Spec-*` and `Spec-External` both render `SpecMovie`, which cannot know where a voice line or a
 * sting belongs — a spec is data, and the factory never hand-places audio. So the placement is
 * generated ahead of the render by `studio/scripts/spec_audio.py`, which reads the spec and writes
 *
 * * one Kokoro voice clip per `narration[]` cue,
 * * an ambience bed spanning the episode,
 * * one sting per distinct `scenes[].sfx` tag, landed on its scene start,
 *
 * plus `audio/manifest.json` describing exactly where each file goes. This component just plays that
 * manifest, so a spec with no entry renders silently and nothing breaks.
 *
 * The manifest is imported (not fetched) so it is resolved when Remotion bundles the studio: commit it,
 * or the render will not know about audio generated since the last bundle.
 */

export type SpecAudioCue = {
  /** Path under `public/`, i.e. `audio/spec/<slug>/vo-0.wav`. */
  file: string;
  /** Absolute start frame within the composition. */
  from: number;
  /** Clip length in frames at the manifest's fps — drives the envelope and the ducking window. */
  frames: number;
  text?: string;
  tag?: string;
  /** Cue ordinal within the spec, set on voiceover clips only. */
  index?: number;
  volume?: number;
};

export type SpecAudioManifest = {
  slug: string;
  fps: number;
  durationFrames: number;
  bed: string | null;
  voiceover: SpecAudioCue[];
  events: SpecAudioCue[];
};

/** `RAW_MANIFEST` carries a `//` comment key; only slug entries are manifests. */
const MANIFESTS: Record<string, SpecAudioManifest> = Object.fromEntries(
  Object.entries(RAW_MANIFEST as Record<string, unknown>).filter(
    ([key, value]) => !key.startsWith('//') && value !== null && typeof value === 'object',
  ),
) as Record<string, SpecAudioManifest>;

export const specAudioFor = (slug: string): SpecAudioManifest | undefined => MANIFESTS[slug];

/** The bed sits under everything; `0.55` matches the hand-mixed `EpisodeAudio` level. */
const BED_VOLUME = 0.55;

/** How far the bed is pulled down under a voice line, with ramps so the level change never clicks. */
const DUCK = 0.4;

const ducked = (frame: number, cues: SpecAudioCue[]): number =>
  cues.reduce((factor, cue) => {
    const end = cue.from + cue.frames;
    const level = interpolate(frame, [cue.from - 10, cue.from + 4, end - 2, end + 22], [1, DUCK, DUCK, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return Math.min(factor, level);
  }, 1);

export type SpecAudioProps = { audio: SpecAudioManifest };

export const SpecAudio: React.FC<SpecAudioProps> = ({ audio }) => {
  const voiceover = audio.voiceover ?? [];
  const events = audio.events ?? [];

  return (
    <>
      {audio.bed ? (
        <Audio
          src={staticFile(audio.bed)}
          volume={(frame) => BED_VOLUME * ducked(frame, voiceover)}
        />
      ) : null}

      {events.map((event) => (
        <Sequence
          key={`sfx-${event.tag}-${event.from}`}
          from={event.from}
          durationInFrames={event.frames}
          name={`sfx · ${event.tag ?? 'event'}`}
        >
          <Audio src={staticFile(event.file)} volume={event.volume ?? 0.85} />
        </Sequence>
      ))}

      {voiceover.map((cue) => (
        <Sequence key={`vo-${cue.index ?? cue.from}`} from={cue.from} durationInFrames={cue.frames} name={`vo · ${cue.from}`}>
          <Audio
            src={staticFile(cue.file)}
            volume={(frame) =>
              interpolate(frame, [0, 5, Math.max(cue.frames - 8, 6), cue.frames], [0, 1, 1, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              })
            }
          />
        </Sequence>
      ))}
    </>
  );
};
