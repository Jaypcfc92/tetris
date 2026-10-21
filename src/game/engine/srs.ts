import type { PieceType, RotationState } from "./types";

/**
 * SRS wall-kick data.
 *
 * Offsets are stored in screen space (y grows DOWN), converted from the
 * canonical guideline tables (which use y-up) by negating y.
 * Key: `${from}${to}` rotation states, e.g. "01" = 0 -> 1 (spawn -> CW).
 */

type Kick = readonly [number, number];

const JLSTZ_KICKS: Readonly<Record<string, readonly Kick[]>> = {
  "01": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "10": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "12": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "21": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "23": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "32": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "30": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "03": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

const I_KICKS: Readonly<Record<string, readonly Kick[]>> = {
  "01": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "10": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "12": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "21": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "23": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "32": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "30": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "03": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

const EMPTY_KICKS: readonly Kick[] = [[0, 0]];

/**
 * Kick offsets to try (in order) when rotating a piece.
 * The O piece never kicks; all other pieces use the I table or the JLSTZ table.
 */
export function getKicks(
  type: PieceType,
  from: RotationState,
  to: RotationState,
): readonly Kick[] {
  if (type === "O") return EMPTY_KICKS;
  const table = type === "I" ? I_KICKS : JLSTZ_KICKS;
  return table[`${from}${to}`] ?? EMPTY_KICKS;
}
