import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

/**
 * Bundled fonts for the studio.
 *
 * Scenes never rely on the host machine's installed fonts — a bare container (CI, Docker) has none,
 * and Chrome would silently render every HUD label as blank. The DejaVu faces the design uses are
 * committed under `public/fonts/` and registered here with `loadFont`, which keeps the render blocked
 * until they are parsed. DejaVu is distributed under the Bitstream Vera / DejaVu licence.
 *
 * `SANS_BOLD` is the real 700-weight face (not a synthesised one), so display headers keep their
 * letterforms when the design asks for heavy, tightly tracked type.
 *
 * Import this module once (from `src/index.ts`) before any composition renders.
 */
export const SANS = 'StudioSans';
export const SANS_BOLD = 'StudioSansBold';
export const MONO = 'StudioMono';

loadFont({ family: SANS, url: staticFile('fonts/DejaVuSans.ttf'), format: 'truetype' });
loadFont({ family: SANS_BOLD, url: staticFile('fonts/DejaVuSans-Bold.ttf'), format: 'truetype' });
loadFont({ family: MONO, url: staticFile('fonts/DejaVuSansMono.ttf'), format: 'truetype' });
