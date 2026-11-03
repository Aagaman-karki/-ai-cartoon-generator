import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

/**
 * Bundled fonts for the studio.
 *
 * Scenes never rely on the host machine's installed fonts — a bare container (CI, Docker) has none,
 * and Chrome would silently render every HUD label as blank. The two DejaVu faces the design uses are
 * committed under `public/fonts/` and registered here with `loadFont`, which keeps the render blocked
 * until they are parsed. DejaVu is distributed under the Bitstream Vera / DejaVu licence.
 *
 * Import this module once (from `src/index.ts`) before any composition renders.
 */
export const SANS = 'StudioSans';
export const MONO = 'StudioMono';

loadFont({ family: SANS, url: staticFile('fonts/DejaVuSans.ttf'), format: 'truetype' });
loadFont({ family: MONO, url: staticFile('fonts/DejaVuSansMono.ttf'), format: 'truetype' });
