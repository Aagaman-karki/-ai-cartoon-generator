import { registerRoot } from 'remotion';
// Registers the bundled fonts (see fonts.ts); must run before any composition renders.
import './fonts';
import { RemotionRoot } from './Root';

/** Remotion entry point: `npx remotion studio` / `npx remotion render` bundle from here. */
registerRoot(RemotionRoot);
