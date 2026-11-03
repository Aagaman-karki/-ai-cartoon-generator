/**
 * The universal animation spec — the single contract shared by the AI script stage, the Remotion
 * factory components and the renderer.
 *
 * One `AnimationSpec` fully describes a video: theme, narration cues, and an ordered list of scenes.
 * Scenes never reference React; they name a background and a list of declarative elements, so a model
 * can author a film without touching component code. See `validate.ts` for the runtime rules and
 * `studio/src/specs/` for worked examples.
 */

/** `#RRGGBB` (or `#RGB`). */
export type HexColor = string;

export type Theme = {
  /** Focal colour: titles, suns, lit windows, highlighted values. */
  primaryColor: HexColor;
  /** Shadow/base colour: skies, silhouettes, panels. */
  secondaryColor: HexColor;
  /** Supporting warm tone for gradients on primary elements. */
  accentColor?: HexColor;
  /**
   * Requested family. Only the bundled faces can render reproducibly (`StudioSans`,
   * `StudioSansBold`, `StudioMono`); anything else is accepted but falls back, with a warning.
   */
  fontFamily?: string;
};

export type CharacterAction = 'idle' | 'panicked';
export type CharacterExpression = 'neutral' | 'shocked' | 'happy';

/** Built-in background environments. Each maps to one factory component. */
export type BackgroundType =
  | 'dusk_room'
  | 'twilight_skyline'
  | 'floating_staircase'
  | 'dome_interior'
  | 'open_horizon';

export type CameraMove = 'static' | 'slow_zoom_in' | 'slow_zoom_out' | 'pan_up' | 'pan_down';

export type TextAnimation = 'spring_pop' | 'fade' | 'slide_up';

export type SceneElement =
  | {
      type: 'character';
      /** Centre of the figure, in composition pixels. */
      x: number;
      /** Feet position, in composition pixels. */
      y: number;
      scale?: number;
      action?: CharacterAction;
      expression?: CharacterExpression;
      /** Frame (local to the scene) at which `action` began, so the pose springs instead of snapping. */
      actionStart?: number;
      flip?: boolean;
    }
  | {
      type: 'text_overlay';
      text: string;
      x: number;
      y: number;
      /** Small tracked line above the header. */
      eyebrow?: string;
      /** White supporting line under the header. */
      sub?: string;
      size?: 'hero' | 'header' | 'sub';
      align?: 'left' | 'center' | 'right';
      animation?: TextAnimation;
      /** Frame (local to the scene) at which the text enters. */
      delay?: number;
    }
  | {
      type: 'hud_chip';
      label: string;
      value: string;
      tone?: 'gold' | 'alert';
      x: number;
      y: number;
      align?: 'left' | 'right';
      delay?: number;
    }
  | {
      /** A glowing fissure drawn as an SVG polyline path (`M x y L x y …`) that reveals over `revealFrames`. */
      type: 'fracture';
      path: string;
      x?: number;
      y?: number;
      strokeWidth?: number;
      color?: HexColor;
      /** Frame (local to the scene) the reveal starts. */
      delay?: number;
      revealFrames?: number;
    }
  | { type: 'particles'; count?: number; seed?: number; opacity?: number }
  | {
      type: 'glow';
      x: number;
      y: number;
      width: number;
      height: number;
      /** Defaults to the theme accent. */
      color?: HexColor;
      intensity?: number;
    };

export type SceneBackgroundOptions = {
  /** Sun/moon disc, in composition pixels. Omit for a sunless sky. */
  sun?: { x: number; y: number; r: number; rays?: boolean; color?: HexColor };
  /** Seeded RNG for stars, skylines and hills — change it to reshuffle the layout. */
  seed?: number;
  /** 0–1 darkening overlay, for beats where the light dies. */
  dim?: number;
  /** Star count for sky-based backgrounds. */
  stars?: number;
  /** Number of silhouette bands for skyline/hill backgrounds. */
  depth?: number;
};

export type Scene = {
  /** Unique within the spec; used for logging and as a React key. */
  id: string;
  type: 'vector_environment';
  durationFrames: number;
  background: BackgroundType;
  backgroundOptions?: SceneBackgroundOptions;
  elements: SceneElement[];
  camera?: CameraMove;
  /** Free-form SFX tags, consumed by the audio stage. */
  sfx?: string[];
};

export type NarrationCue = {
  /** Absolute frame in the composition (not scene-local). */
  frameStart: number;
  text: string;
  /** Optional voice id for TTS. */
  voice?: string;
};

export type AnimationSpec = {
  title: string;
  /** Stable id; used for the composition id and output filename. */
  slug: string;
  fps?: number;
  width?: number;
  height?: number;
  /**
   * Optional. When omitted the renderer sums the scene durations, which is the only value that can
   * never drift out of sync with the timeline.
   */
  totalDurationFrames?: number;
  theme: Theme;
  narration: NarrationCue[];
  scenes: Scene[];
  /** Burn narration onto the frame as subtitles (useful before VO exists). */
  showNarration?: boolean;
};

/** Resolved timing, always derived from the spec rather than trusted from it. */
export type SpecTiming = {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  /** Absolute start frame of each scene, in scene order. */
  sceneStarts: number[];
};

export const COMPOSITION_DEFAULTS = {
  fps: 30,
  width: 1920,
  height: 1080,
} as const;
