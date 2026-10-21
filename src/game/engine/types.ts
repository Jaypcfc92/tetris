/**
 * Core domain types for the Tetris engine.
 *
 * This layer is 100% framework-free: no Phaser, no React, no DOM.
 * Coordinates: x grows right, y grows down. Row 0 is the top (hidden) row.
 */

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

/** SRS rotation states: 0 = spawn, 1 = CW, 2 = 180, 3 = CCW. */
export type RotationState = 0 | 1 | 2 | 3;

/** A tetromino instance positioned on the board. (x, y) is the top-left of its bounding box. */
export interface Piece {
  readonly type: PieceType;
  readonly rotation: RotationState;
  readonly x: number;
  readonly y: number;
}

/** A single board cell: the locked piece type, or empty. */
export type Cell = PieceType | null;

/** Grid indexed as [row][col]; row 0 is the top hidden row. */
export type BoardGrid = readonly (readonly Cell[])[];

export type GameStatus = "idle" | "playing" | "paused" | "clearing" | "gameover";

/** Rows (indices) cleared by a lock, plus scoring metadata. */
export interface LineClearEvent {
  readonly rows: readonly number[];
  readonly lines: number;
  readonly points: number;
  readonly isTSpin: boolean;
  readonly isMiniTSpin: boolean;
  readonly isBackToBack: boolean;
  readonly combo: number;
  readonly level: number;
}

export interface LockEvent {
  readonly piece: Piece;
  readonly lockedCells: readonly { x: number; y: number }[];
  readonly clearedRows: readonly number[];
}

export interface GameOverEvent {
  readonly score: number;
  readonly lines: number;
  readonly level: number;
  /** true when the stack reached the spawn box (block out), false for lock out. */
  readonly blockOut: boolean;
}

/** Everything the renderer needs to draw one frame. Immutable snapshot. */
export interface RenderState {
  readonly grid: BoardGrid;
  readonly active: Piece | null;
  readonly ghostY: number | null;
  readonly hold: PieceType | null;
  readonly canHold: boolean;
  readonly queue: readonly PieceType[];
  readonly status: GameStatus;
}

/** Union of engine events and their payloads. */
export interface EngineEventMap {
  readonly started: undefined;
  readonly paused: undefined;
  readonly resumed: undefined;
  readonly pieceMoved: { readonly piece: Piece };
  readonly pieceRotated: { readonly piece: Piece; readonly kicked: boolean };
  readonly softDropped: { readonly piece: Piece; readonly gained: number };
  readonly hardDropped: { readonly piece: Piece; readonly distance: number; readonly gained: number };
  readonly pieceLocked: { readonly event: LockEvent };
  readonly linesCleared: { readonly event: LineClearEvent };
  readonly holdSwapped: { readonly piece: PieceType | null; readonly canHold: boolean };
  readonly queueChanged: { readonly queue: readonly PieceType[] };
  readonly scoreChanged: { readonly score: number; readonly delta: number };
  readonly levelChanged: { readonly level: number; readonly gravityMs: number };
  readonly boardChanged: undefined;
  readonly gameOver: { readonly event: GameOverEvent };
}

export type EngineEvent = keyof EngineEventMap;

/** Tunable engine parameters (values in milliseconds unless stated). */
export interface EngineConfig {
  readonly width: number;
  /** Includes hidden rows. */
  readonly height: number;
  /** Number of hidden rows at the top. */
  readonly hiddenRows: number;
  /** Next-pieces preview length. */
  readonly previewLength: number;
  readonly lockDelayMs: number;
  /** Max lock-delay resets from movement/rotation while grounded. */
  readonly maxLockResets: number;
  /** Delay between the clear flash and the rows collapsing. */
  readonly clearDelayMs: number;
  /** Interval between automatic soft-drop steps while soft dropping. */
  readonly softDropIntervalMs: number;
  readonly lockDistancePerPoint: number;
  readonly hardDropPointsPerCell: number;
  readonly pointsPerSoftDropCell: number;
  /** Cleared lines per level-up. */
  readonly linesPerLevel: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  width: 10,
  height: 22,
  hiddenRows: 2,
  previewLength: 5,
  lockDelayMs: 500,
  maxLockResets: 15,
  clearDelayMs: 320,
  softDropIntervalMs: 35,
  lockDistancePerPoint: 1,
  hardDropPointsPerCell: 2,
  pointsPerSoftDropCell: 1,
  linesPerLevel: 10,
};
