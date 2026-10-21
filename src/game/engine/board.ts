import type { BoardGrid, Cell, Piece, PieceType } from "./types";
import { getPieceCells } from "./tetrominoes";

/**
 * The playfield: width x (height incl. hidden rows).
 * Rows [0, hiddenRows) are invisible buffer rows above the visible field.
 */
export class Board {
  readonly width: number;
  readonly height: number;
  readonly hiddenRows: number;
  private readonly grid: Cell[][];

  constructor(width: number, height: number, hiddenRows: number) {
    this.width = width;
    this.height = height;
    this.hiddenRows = hiddenRows;
    this.grid = Array.from({ length: height }, () =>
      Array.from<Cell>({ length: width }).fill(null),
    );
  }

  get visibleHeight(): number {
    return this.height - this.hiddenRows;
  }

  cellAt(row: number, col: number): Cell {
    const r = this.grid[row];
    return r ? (r[col] ?? null) : null;
  }

  /** Immutable snapshot for rendering/tests. */
  snapshot(): BoardGrid {
    return this.grid.map((row) => [...row]);
  }

  /** True when (row, col) is inside the walls and floor (hidden rows count as inside). */
  isInside(row: number, col: number): boolean {
    return row >= 0 && row < this.height && col >= 0 && col < this.width;
  }

  /** True when any cell of the piece is out of bounds or overlaps a locked cell. */
  collides(piece: Piece): boolean {
    return getPieceCells(piece).some(({ x, y }) => {
      if (y < 0 || y >= this.height || x < 0 || x >= this.width) return true;
      return this.cellAt(y, x) !== null;
    });
  }

  /** Write the piece's cells into the grid. */
  lock(piece: Piece): { x: number; y: number }[] {
    const cells = getPieceCells(piece).map(({ x, y }) => ({ x, y }));
    for (const { x, y } of cells) {
      const row = this.grid[y];
      if (row && x >= 0 && x < this.width) row[x] = piece.type;
    }
    return cells;
  }

  /** Row indices (top to bottom) that are completely filled. */
  getFullRows(): number[] {
    const rows: number[] = [];
    for (let y = 0; y < this.height; y += 1) {
      if (this.grid[y]?.every((cell) => cell !== null)) rows.push(y);
    }
    return rows;
  }

  /** Remove the given rows, shifting everything above down and padding with empty rows. */
  clearRows(rows: readonly number[]): void {
    if (rows.length === 0) return;
    const cleared = new Set(rows);
    const remaining = this.grid.filter((_, y) => !cleared.has(y));
    while (remaining.length < this.height) {
      remaining.unshift(Array.from<Cell>({ length: this.width }).fill(null));
    }
    this.grid.length = 0;
    this.grid.push(...remaining.map((row) => [...row]));
  }

  /** True when the given piece type can be spawned (spawn box is free). */
  canSpawn(type: PieceType, spawn: Piece): boolean {
    return !this.collides(spawn);
  }

  /** True when every cell of the piece sits in hidden rows (lock out). */
  isFullyHidden(piece: Piece): boolean {
    return getPieceCells(piece).every(({ y }) => y < this.hiddenRows);
  }

  /** Rows, from the bottom, that the piece would traverse on a hard drop. */
  dropDistance(piece: Piece): number {
    let distance = 0;
    let probe = piece;
    for (;;) {
      const next: Piece = { ...probe, y: probe.y + 1 };
      if (this.collides(next)) return distance;
      probe = next;
      distance += 1;
    }
  }
}
