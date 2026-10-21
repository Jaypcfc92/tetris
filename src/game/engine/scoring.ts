/**
 * Guideline-based scoring.
 * See https://tetris.wiki/Scoring (modern guideline table).
 */

export const SCORE = {
  single: 100,
  double: 300,
  triple: 500,
  tetris: 800,
  tSpinMiniNoLines: 100,
  tSpinNoLines: 400,
  tSpinMiniSingle: 200,
  tSpinSingle: 800,
  tSpinDouble: 1200,
  tSpinTriple: 1600,
  backToBackMultiplier: 1.5,
  comboBase: 50,
} as const;

export interface ClearScoreInput {
  readonly lines: number;
  readonly level: number;
  readonly isTSpin: boolean;
  readonly isMiniTSpin: boolean;
  readonly isBackToBack: boolean;
  /** Consecutive line clears since the last clear-less lock; -1 means no combo. */
  readonly combo: number;
}

/** Points awarded for locking a piece that cleared lines (0 lines => 0). */
export function clearPoints(input: ClearScoreInput): number {
  const { lines, level, isTSpin, isMiniTSpin, isBackToBack, combo } = input;
  if (lines <= 0) {
    // A T-spin with no lines still scores.
    if (isTSpin) return isMiniTSpin ? SCORE.tSpinMiniNoLines : SCORE.tSpinNoLines;
    return 0;
  }

  let base: number;
  if (isTSpin) {
    if (isMiniTSpin && lines === 1) base = SCORE.tSpinMiniSingle;
    else if (lines === 1) base = SCORE.tSpinSingle;
    else if (lines === 2) base = SCORE.tSpinDouble;
    else base = SCORE.tSpinTriple;
  } else {
    if (lines === 1) base = SCORE.single;
    else if (lines === 2) base = SCORE.double;
    else if (lines === 3) base = SCORE.triple;
    else base = SCORE.tetris;
  }

  // Back-to-back only applies to difficult clears (Tetris / T-Spin).
  const difficult = lines === 4 || isTSpin;
  if (isBackToBack && difficult) {
    base = Math.floor(base * SCORE.backToBackMultiplier);
  }

  let points = base * level;
  if (combo > 0) {
    points += SCORE.comboBase * combo * level;
  }
  return points;
}

/** Whether a clear extends the back-to-back chain. */
export function isDifficultClear(lines: number, isTSpin: boolean): boolean {
  return lines === 4 || isTSpin;
}

/** Human-readable label for a scoring event, shown as a popup. */
export function clearLabel(lines: number, isTSpin: boolean, isMiniTSpin: boolean): string {
  if (isTSpin) {
    if (lines === 0) return isMiniTSpin ? "MINI T-SPIN" : "T-SPIN";
    if (lines === 1) return isMiniTSpin ? "MINI T-SPIN SINGLE" : "T-SPIN SINGLE";
    if (lines === 2) return "T-SPIN DOUBLE";
    return "T-SPIN TRIPLE";
  }
  if (lines === 1) return "SINGLE";
  if (lines === 2) return "DOUBLE";
  if (lines === 3) return "TRIPLE";
  return "TETRIS";
}
