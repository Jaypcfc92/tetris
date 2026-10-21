/**
 * Guideline gravity: seconds per row = 0.8 - (level - 1) * 0.007, raised to
 * (level - 1). Level 1 drops one row per second; the curve accelerates
 * exponentially and is clamped at level 20's "kill screen" speed.
 */

const MAX_LEVEL = 20;
const MIN_INTERVAL_MS = 20;

export function gravityIntervalMs(level: number): number {
  const clamped = Math.min(Math.max(level, 1), MAX_LEVEL);
  const seconds = (0.8 - (clamped - 1) * 0.007) ** (clamped - 1);
  return Math.max(seconds * 1000, MIN_INTERVAL_MS);
}

/** Level advances every `linesPerLevel` cleared lines. */
export function levelForLines(totalLines: number, linesPerLevel = 10): number {
  return Math.floor(totalLines / linesPerLevel) + 1;
}
