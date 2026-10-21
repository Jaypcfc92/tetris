import type { Piece, PieceType, RotationState } from "./types";

/**
 * SRS tetromino definitions.
 *
 * Each piece rotates inside a square bounding box (3x3 for J/L/S/T/Z,
 * 4x4 for I, 2x2 for O). Only the spawn state is stored; the other three
 * states are derived with the standard box rotation, which is exactly what
 * SRS prescribes for the kick tables to line up.
 */

type Cells = readonly (readonly [number, number])[];

interface PieceShape {
  readonly boxSize: number;
  /** Cells occupied in rotation state 0 (spawn), relative to the box origin. */
  readonly spawn: Cells;
}

const SHAPES: Record<PieceType, PieceShape> = {
  I: { boxSize: 4, spawn: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { boxSize: 2, spawn: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { boxSize: 3, spawn: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { boxSize: 3, spawn: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { boxSize: 3, spawn: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { boxSize: 3, spawn: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { boxSize: 3, spawn: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

export const PIECE_TYPES: readonly PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

/** Neon palette shared by the Phaser renderer and the React previews. */
export const PIECE_COLORS: Record<PieceType, string> = {
  I: "#22d3ee",
  O: "#facc15",
  T: "#c084fc",
  S: "#4ade80",
  Z: "#fb7185",
  J: "#60a5fa",
  L: "#fb923c",
};

/** Dimmer variant used for the hold slot / ghost accents. */
export const PIECE_DIM_COLORS: Record<PieceType, string> = {
  I: "#0e7490",
  O: "#a16207",
  T: "#7e22ce",
  S: "#15803d",
  Z: "#be123c",
  J: "#1d4ed8",
  L: "#c2410c",
};

/** Rotate a cell inside its bounding box (clockwise). */
function rotateCellCW(x: number, y: number, boxSize: number): [number, number] {
  return [boxSize - 1 - y, x];
}

/** Cells for a rotation state, computed from the spawn state via box rotation. */
function cellsFor(type: PieceType, rotation: RotationState): Cells {
  const shape = SHAPES[type];
  let cells: [number, number][] = shape.spawn.map(([x, y]) => [x, y] as [number, number]);
  for (let r = 0; r < rotation; r += 1) {
    cells = cells.map(([x, y]) => rotateCellCW(x, y, shape.boxSize));
  }
  return cells;
}

/** Cache rotation lookups; shapes are static data. */
function buildRotationCache(): Record<PieceType, readonly Cells[]> {
  const cache = {} as Record<PieceType, readonly Cells[]>;
  for (const type of PIECE_TYPES) {
    cache[type] = [0, 1, 2, 3].map((r) => cellsFor(type, r as RotationState));
  }
  return cache;
}

const ROTATION_CACHE: Record<PieceType, readonly Cells[]> = buildRotationCache();

export function getBoxSize(type: PieceType): number {
  return SHAPES[type].boxSize;
}

/** Absolute board coordinates of the four cells occupied by a piece. */
export function getPieceCells(piece: Piece): readonly { x: number; y: number }[] {
  const relative = ROTATION_CACHE[piece.type][piece.rotation] ?? [];
  return relative.map(([dx, dy]) => ({ x: piece.x + dx, y: piece.y + dy }));
}

/** Spawn placement: centred, just above the visible field. */
export function createPiece(type: PieceType, boardWidth: number): Piece {
  const boxSize = getBoxSize(type);
  const x = Math.floor((boardWidth - boxSize) / 2);
  return { type, rotation: 0, x, y: 1 };
}

export function moved(piece: Piece, dx: number, dy: number): Piece {
  return { type: piece.type, rotation: piece.rotation, x: piece.x + dx, y: piece.y + dy };
}

export function rotated(piece: Piece, direction: 1 | -1): Piece {
  const next = (((piece.rotation + direction) % 4) + 4) % 4;
  return { type: piece.type, rotation: next as RotationState, x: piece.x, y: piece.y };
}
