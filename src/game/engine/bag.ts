import type { PieceType } from "./types";
import { PIECE_TYPES } from "./tetrominoes";

export type RandomFn = () => number;

/**
 * 7-bag randomizer: every run of 7 pieces contains each tetromino exactly once,
 * as required by the modern guideline.
 */
export class PieceBag {
  private bag: PieceType[] = [];
  private readonly rng: RandomFn;

  constructor(rng: RandomFn = Math.random) {
    this.rng = rng;
  }

  private refill(): void {
    const next: PieceType[] = [...PIECE_TYPES];
    // Fisher-Yates shuffle with the injected RNG.
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      const a = next[i];
      const b = next[j];
      if (a !== undefined && b !== undefined) {
        next[i] = b;
        next[j] = a;
      }
    }
    this.bag = next;
  }

  next(): PieceType {
    if (this.bag.length === 0) this.refill();
    const piece = this.bag.shift();
    if (piece === undefined) throw new Error("PieceBag exhausted unexpectedly");
    return piece;
  }

  /** Upcoming pieces without consuming them. */
  peek(count: number): PieceType[] {
    while (this.bag.length < count) this.refill();
    return this.bag.slice(0, count);
  }
}
