import { describe, expect, it } from "vitest";
import { Board } from "@/game/engine/board";
import { createPiece, getPieceCells } from "@/game/engine/tetrominoes";

describe("Board", () => {
  it("starts empty", () => {
    const board = new Board(10, 22, 2);
    const grid = board.snapshot();
    expect(grid).toHaveLength(22);
    expect(grid.every((row) => row.every((cell) => cell === null))).toBe(true);
  });

  it("detects collisions with walls and floor", () => {
    const board = new Board(10, 22, 2);
    // O piece (2x2) at the left wall is fine...
    expect(board.collides({ type: "O", rotation: 0, x: 0, y: 5 })).toBe(false);
    // ...one column further left is out of bounds.
    expect(board.collides({ type: "O", rotation: 0, x: -1, y: 5 })).toBe(true);
    // Past the floor.
    expect(board.collides({ type: "O", rotation: 0, x: 0, y: 21 })).toBe(true);
    expect(board.collides({ type: "O", rotation: 0, x: 0, y: 20 })).toBe(false);
  });

  it("detects collisions with locked cells", () => {
    const board = new Board(10, 22, 2);
    board.lock({ type: "O", rotation: 0, x: 0, y: 20 });
    expect(board.cellAt(20, 0)).toBe("O");
    expect(board.cellAt(21, 1)).toBe("O");
    expect(board.collides({ type: "O", rotation: 0, x: 0, y: 20 })).toBe(true);
    expect(board.collides({ type: "O", rotation: 0, x: 2, y: 20 })).toBe(false);
  });

  it("locks pieces into the grid", () => {
    const board = new Board(10, 22, 2);
    const piece = createPiece("T", 10);
    const cells = board.lock(piece);
    expect(cells).toHaveLength(4);
    for (const { x, y } of getPieceCells(piece)) {
      expect(board.cellAt(y, x)).toBe("T");
    }
  });

  it("finds full rows and clears them, shifting the stack down", () => {
    const board = new Board(10, 22, 2);
    // Flat I cells land one row below the box origin: y=19 fills row 20.
    board.lock({ type: "I", rotation: 0, x: 0, y: 19 });
    board.lock({ type: "I", rotation: 0, x: 4, y: 19 });
    // O covers rows 19-20, cols 8-9.
    board.lock({ type: "O", rotation: 0, x: 8, y: 19 });
    // Marker row above (row 18).
    board.lock({ type: "I", rotation: 0, x: 0, y: 17 });

    expect(board.getFullRows()).toEqual([20]);

    board.clearRows([20]);
    const grid = board.snapshot();
    expect(grid[19]?.[0]).toBe("I"); // marker slid from row 18
    expect(grid[20]?.[8]).toBe("O"); // row 19 slid down
    expect(grid[21]?.every((cell) => cell === null)).toBe(true);
    expect(grid[18]?.every((cell) => cell === null)).toBe(true);
  });

  it("clears multiple rows at once", () => {
    const board = new Board(10, 22, 2);
    for (const row of [20, 21]) {
      for (let col = 0; col < 10; col += 2) {
        board.lock({ type: "O", rotation: 0, x: col, y: row });
      }
    }
    expect(board.getFullRows()).toEqual([20, 21]);
    board.clearRows([20, 21]);
    expect(board.snapshot().every((row) => row.every((cell) => cell === null))).toBe(true);
  });

  it("reports the drop distance to the floor", () => {
    const board = new Board(10, 22, 2);
    const piece = createPiece("T", 10); // lowest cell at y=2, floor at y=21
    expect(board.dropDistance(piece)).toBe(19);
    board.lock({ type: "O", rotation: 0, x: 3, y: 19 });
    expect(board.dropDistance(piece)).toBe(16); // stops on the O stack at rows 18-19
  });

  it("knows when a piece is fully hidden", () => {
    const board = new Board(10, 22, 2);
    expect(board.isFullyHidden({ type: "T", rotation: 0, x: 3, y: 0 })).toBe(true);
    expect(board.isFullyHidden({ type: "T", rotation: 0, x: 3, y: 1 })).toBe(false);
  });
});
