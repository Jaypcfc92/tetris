import { describe, expect, it } from "vitest";
import { getKicks } from "@/game/engine/srs";
import { getPieceCells } from "@/game/engine/tetrominoes";
import type { PieceType, RotationState } from "@/game/engine/types";

const JLSTZ: PieceType[] = ["J", "L", "S", "T", "Z"];
const TRANSITIONS: [RotationState, RotationState][] = [
  [0, 1], [1, 0], [1, 2], [2, 1], [2, 3], [3, 2], [3, 0], [0, 3],
];

describe("SRS wall kicks", () => {
  it("provides 5 kick offsets for every JLSTZ transition", () => {
    for (const type of JLSTZ) {
      for (const [from, to] of TRANSITIONS) {
        expect(getKicks(type, from, to)).toHaveLength(5);
      }
    }
  });

  it("provides 5 kick offsets for every I transition", () => {
    for (const [from, to] of TRANSITIONS) {
      expect(getKicks("I", from, to)).toHaveLength(5);
    }
  });

  it("never kicks the O piece", () => {
    for (const [from, to] of TRANSITIONS) {
      expect(getKicks("O", from, to)).toEqual([[0, 0]]);
    }
  });

  it("matches the canonical 0->R T kick data", () => {
    expect(getKicks("T", 0, 1)).toEqual([
      [0, 0],
      [-1, 0],
      [-1, -1],
      [0, 2],
      [-1, 2],
    ]);
  });

  it("matches the canonical I 0->R kick data", () => {
    expect(getKicks("I", 0, 1)).toEqual([
      [0, 0],
      [-2, 0],
      [1, 0],
      [-2, 1],
      [1, -2],
    ]);
  });
});

describe("SRS rotation geometry", () => {
  it("rotates every piece through 4 states and back to spawn", () => {
    const types: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
    for (const type of types) {
      const piece = { type, rotation: 0 as RotationState, x: 3, y: 5 };
      const seen = new Set<string>();
      let current = piece;
      for (let step = 0; step < 4; step += 1) {
        const key = getPieceCells(current)
          .map((c) => `${c.x},${c.y}`)
          .sort()
          .join(" ");
        seen.add(key);
        current = { ...current, rotation: ((((current.rotation + 1) % 4) + 4) % 4) as RotationState };
      }
      // O overlaps itself across states; the rest expose 4 distinct shapes.
      expect(seen.size).toBe(type === "O" ? 1 : 4);
      expect(current.rotation).toBe(0);
    }
  });
});
