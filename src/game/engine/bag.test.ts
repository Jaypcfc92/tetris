import { describe, expect, it } from "vitest";
import { PieceBag } from "@/game/engine/bag";
import { PIECE_TYPES } from "@/game/engine/tetrominoes";

/** Deterministic RNG that cycles a fixed sequence. */
function seeded(values: number[]): () => number {
  let i = 0;
  return () => {
    const value = values[i % values.length] ?? 0;
    i += 1;
    return value;
  };
}

describe("PieceBag", () => {
  it("yields every piece exactly once per bag of 7", () => {
    const bag = new PieceBag(seeded([0.1, 0.7, 0.3, 0.9, 0.2, 0.5, 0.8]));
    const drawn: string[] = [];
    for (let i = 0; i < 14; i += 1) drawn.push(bag.next());
    expect(drawn.slice(0, 7).sort()).toEqual([...PIECE_TYPES].sort());
    expect(drawn.slice(7, 14).sort()).toEqual([...PIECE_TYPES].sort());
  });

  it("peeks ahead without consuming", () => {
    const bag = new PieceBag(seeded([0.42]));
    const preview = bag.peek(5);
    expect(preview).toHaveLength(5);
    expect(bag.peek(5)).toEqual(preview);
    expect(bag.next()).toBe(preview[0]);
  });

  it("never repeats a piece within a 7-piece window", () => {
    const bag = new PieceBag(seeded([0.9, 0.1, 0.55]));
    const drawn: string[] = [];
    for (let i = 0; i < 70; i += 1) drawn.push(bag.next());
    for (let start = 0; start + 7 <= drawn.length; start += 7) {
      const window = drawn.slice(start, start + 7);
      expect(new Set(window).size).toBe(7);
    }
  });
});
