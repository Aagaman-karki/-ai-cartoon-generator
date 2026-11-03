import { assertSpec } from '../spec/validate';
import { AnimationSpec, SpecTiming } from '../spec/types';
import whatIfMoon from './what-if-moon.json';
import timeStopped from './time-stopped.json';

/**
 * Every spec the studio can render. Drop a JSON file in this folder, import it here, and the
 * composition is registered automatically — no per-episode React code.
 *
 * `assertSpec` validates at module load, so a malformed spec fails the build with a readable list of
 * problems rather than crashing mid-render.
 */
export type LoadedSpec = { spec: AnimationSpec; timing: SpecTiming };

export const SPECS: LoadedSpec[] = [whatIfMoon, timeStopped].map((raw) => assertSpec(raw));
