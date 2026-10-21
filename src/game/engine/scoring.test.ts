import { describe, expect, it } from "vitest";
import { clearPoints, isDifficultClear, SCORE } from "@/game/engine/scoring";
import { gravityIntervalMs, levelForLines } from "@/game/engine/gravity";

const base = { level: 1, isTSpin: false, isMiniTSpin: false, isBackToBack: false, combo: -1 };

describe("clearPoints", () => {
  it("scores the guideline single/double/triple/tetris table", () => {
    expect(clearPoints({ ...base, lines: 1 })).toBe(100);
    expect(clearPoints({ ...base, lines: 2 })).toBe(300);
    expect(clearPoints({ ...base, lines: 3 })).toBe(500);
    expect(clearPoints({ ...base, lines: 4 })).toBe(800);
  });

  it("multiplies by level", () => {
    expect(clearPoints({ ...base, lines: 1, level: 5 })).toBe(500);
    expect(clearPoints({ ...base, lines: 4, level: 3 })).toBe(2400);
  });

  it("applies the 1.5x back-to-back bonus to difficult clears only", () => {
    expect(clearPoints({ ...base, lines: 4, isBackToBack: true })).toBe(1200);
    // A single is not difficult: no bonus.
    expect(clearPoints({ ...base, lines: 1, isBackToBack: true })).toBe(100);
  });

  it("scores T-spins", () => {
    expect(clearPoints({ ...base, lines: 0, isTSpin: true })).toBe(400);
    expect(clearPoints({ ...base, lines: 0, isTSpin: true, isMiniTSpin: true })).toBe(100);
    expect(clearPoints({ ...base, lines: 1, isTSpin: true })).toBe(800);
    expect(clearPoints({ ...base, lines: 2, isTSpin: true })).toBe(1200);
    expect(clearPoints({ ...base, lines: 3, isTSpin: true })).toBe(1600);
    expect(clearPoints({ ...base, lines: 1, isTSpin: true, isMiniTSpin: true })).toBe(200);
  });

  it("adds combo bonuses", () => {
    const first = clearPoints({ ...base, lines: 1, combo: 0 });
    const second = clearPoints({ ...base, lines: 1, combo: 1 });
    expect(first).toBe(100);
    expect(second).toBe(100 + SCORE.comboBase);
  });

  it("awards nothing without clears", () => {
    expect(clearPoints({ ...base, lines: 0 })).toBe(0);
  });
});

describe("isDifficultClear", () => {
  it("treats Tetrises and T-spins as difficult", () => {
    expect(isDifficultClear(4, false)).toBe(true);
    expect(isDifficultClear(2, true)).toBe(true);
    expect(isDifficultClear(2, false)).toBe(false);
  });
});

describe("gravityIntervalMs", () => {
  it("starts at one second per row", () => {
    expect(gravityIntervalMs(1)).toBeCloseTo(1000, 0);
  });

  it("accelerates monotonically and clamps at the kill screen", () => {
    const strict = [1, 3, 5, 8, 10, 12].map(gravityIntervalMs);
    for (let i = 1; i < strict.length; i += 1) {
      expect(strict[i]).toBeLessThan(strict[i - 1] as number);
    }
    // Levels beyond the clamp never go below the 20 ms floor and never increase.
    const tail = Array.from({ length: 20 }, (_, i) => gravityIntervalMs(i + 1));
    for (let i = 1; i < tail.length; i += 1) {
      expect(tail[i]).toBeLessThanOrEqual(tail[i - 1] as number);
      expect(tail[i]).toBeGreaterThanOrEqual(20);
    }
    expect(gravityIntervalMs(20)).toBe(20);
    // Out-of-range levels clamp instead of exploding.
    expect(gravityIntervalMs(99)).toBe(gravityIntervalMs(20));
    expect(gravityIntervalMs(0)).toBe(gravityIntervalMs(1));
  });
});

describe("levelForLines", () => {
  it("advances every 10 lines by default", () => {
    expect(levelForLines(0)).toBe(1);
    expect(levelForLines(9)).toBe(1);
    expect(levelForLines(10)).toBe(2);
    expect(levelForLines(100)).toBe(11);
  });
});
