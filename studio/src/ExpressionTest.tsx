import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Character } from './Character';
import { MONO, SANS_BOLD } from './fonts';
import { PALETTE } from './theme';
import { CHARACTER_EXPRESSIONS, CharacterAction, CharacterExpression } from './spec/types';

/**
 * `Expression-Test` — a still-life contact sheet of the character's eight faces, rendered by the
 * studio so the faces can be reviewed as pixels rather than as code.
 *
 * Each cell shows the same expression twice: large, and at the small scale the factory actually uses
 * (`Spec-*` scenes place the figure at roughly 0.35–0.6 of the test size), because an expression that
 * only reads at poster size is not finished. Labels are data, not part of the drawing, so a face is
 * judged without them.
 *
 * The small figure also carries the props nothing else in the studio exercises — `action`, `flip` and
 * `shadow` — so a variant can be checked without writing a scene:
 *
 *   npx remotion still Expression-Test out/panic.png --props='{"action":"panicked"}'
 *   npx remotion still Expression-Test out/flip.png --props='{"flip":true,"shadow":false}'
 *
 * The composition is deterministic: no timers or randomness, and blinking is driven by the frame
 * number, so frame 0 always renders the same sheet.
 */

export type ExpressionTestProps = {
  /** Pose given to the small figure, so a face can be checked against a moving body. */
  action?: CharacterAction;
  /** Mirror the small figure. */
  flip?: boolean;
  /** Contact shadow under the small figure. */
  shadow?: boolean;
};

/** One line per face, describing what the drawing is supposed to communicate. */
const NOTES: Record<CharacterExpression, string> = {
  neutral: 'resting, listening',
  shocked: 'startled by a fact',
  happy: 'warm, pleased',
  confused: 'does not add up',
  worried: 'dread, uncertainty',
  angry: 'refusing the premise',
  curious: 'leaning in',
  excited: 'wants to say it aloud',
};

const COLS = 4;
const CELL_W = 460;
const GRID_LEFT = 40;
const ROW_TOP = [158, 596];
const FEET_Y = [510, 948];
const BIG_SCALE = 1.15;
const SMALL_SCALE = 0.42;

const Cell: React.FC<{ expression: CharacterExpression; index: number } & ExpressionTestProps> = ({
  expression,
  index,
  action = 'idle',
  flip = false,
  shadow = true,
}) => {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const left = GRID_LEFT + col * CELL_W;
  const centerX = left + CELL_W / 2;
  const feetY = FEET_Y[row];

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left,
          top: ROW_TOP[row],
          width: CELL_W - 20,
          height: FEET_Y[row] - ROW_TOP[row] + 12,
          border: `1.5px solid ${PALETTE.shadowLift}`,
          borderRadius: 18,
          background: `linear-gradient(180deg, ${PALETTE.shadowDeep}66 0%, ${PALETTE.ink}00 100%)`,
        }}
      />
      <Character x={centerX - 42} y={feetY} scale={BIG_SCALE} expression={expression} />
      <Character
        x={centerX + 128}
        y={feetY - 6}
        scale={SMALL_SCALE}
        expression={expression}
        action={action}
        flip={flip}
        shadow={shadow}
      />
      <div
        style={{
          position: 'absolute',
          left,
          top: feetY + 20,
          width: CELL_W - 20,
          textAlign: 'center',
          fontFamily: SANS_BOLD,
          fontSize: 26,
          letterSpacing: 4,
          color: PALETTE.cream,
        }}
      >
        {expression.toUpperCase()}
      </div>
      <div
        style={{
          position: 'absolute',
          left,
          top: feetY + 52,
          width: CELL_W - 20,
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: 16,
          color: PALETTE.goldSoft,
          opacity: 0.7,
        }}
      >
        {NOTES[expression]} · {SMALL_SCALE}× {action}
      </div>
    </>
  );
};

export const ExpressionTest: React.FC<ExpressionTestProps> = (props) => {
  const { action = 'idle', flip = false, shadow = true } = props;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 50% 0%, ${PALETTE.shadowLift} 0%, ${PALETTE.shadowDeep} 55%, ${PALETTE.ink} 100%)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: GRID_LEFT,
          top: 48,
          fontFamily: MONO,
          fontSize: 18,
          letterSpacing: 6,
          color: PALETTE.gold,
          opacity: 0.9,
        }}
      >
        CHARACTER SYSTEM
      </div>
      <div
        style={{
          position: 'absolute',
          left: GRID_LEFT,
          top: 80,
          fontFamily: SANS_BOLD,
          fontSize: 54,
          letterSpacing: -0.5,
          color: PALETTE.cream,
        }}
      >
        Eight expressions, one rig
      </div>
      <div
        style={{
          position: 'absolute',
          right: GRID_LEFT,
          top: 96,
          fontFamily: MONO,
          fontSize: 18,
          color: PALETTE.goldSoft,
          opacity: 0.6,
        }}
      >
        {CHARACTER_EXPRESSIONS.length} faces · {BIG_SCALE}× idle and {SMALL_SCALE}× {action}
        {flip ? ' flipped' : ''}
        {shadow ? '' : ' · no shadow'}
      </div>

      {CHARACTER_EXPRESSIONS.map((expression, index) => (
        <Cell key={expression} expression={expression} index={index} action={action} flip={flip} shadow={shadow} />
      ))}
    </AbsoluteFill>
  );
};
