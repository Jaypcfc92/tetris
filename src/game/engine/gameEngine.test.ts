import { describe, expect, it, vi } from "vitest";
import { GameEngine } from "@/game/engine/gameEngine";
import type { EngineEventMap } from "@/game/engine/types";

/** Deterministic RNG: values near 1 keep the bag in canonical I,O,T,S,Z,J,L order. */
const canonicalRng = (): number => 0.999;

function makeEngine(overrides = {}): GameEngine {
  return new GameEngine(overrides, canonicalRng);
}

/** Advance the engine in small steps so gravity and lock delay stay realistic. */
function advance(engine: GameEngine, totalMs: number, stepMs = 50): void {
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    engine.tick(step);
    remaining -= step;
  }
}

describe("GameEngine", () => {
  it("spawns the first piece and fills the preview queue", () => {
    const engine = makeEngine();
    engine.start();
    expect(engine.getStatus()).toBe("playing");
    expect(engine.getCurrentPiece()?.type).toBe("I");
    expect(engine.getQueue()).toEqual(["O", "T", "S", "Z", "J"]);
    expect(engine.getGhostY()).toBe(20);
  });

  it("drops one row per second at level 1", () => {
    const engine = makeEngine();
    engine.start();
    const spawnY = engine.getCurrentPiece()?.y ?? 0;
    advance(engine, 900);
    expect(engine.getCurrentPiece()?.y).toBe(spawnY);
    advance(engine, 200);
    expect(engine.getCurrentPiece()?.y).toBe(spawnY + 1);
  });

  it("freezes while paused", () => {
    const engine = makeEngine();
    engine.start();
    engine.pause();
    expect(engine.getStatus()).toBe("paused");
    const y = engine.getCurrentPiece()?.y ?? 0;
    advance(engine, 5000);
    expect(engine.getCurrentPiece()?.y).toBe(y);
    engine.resume();
    advance(engine, 1100);
    expect(engine.getCurrentPiece()?.y).toBe(y + 1);
  });

  it("locks a hard drop, scores per cell and spawns the next piece", () => {
    const engine = makeEngine();
    const locked = vi.fn();
    engine.events.on("pieceLocked", locked);
    engine.start();
    engine.hardDrop();
    expect(locked).toHaveBeenCalledTimes(1);
    // 19 cells x 2 points.
    expect(engine.getScore()).toBe(38);
    expect(engine.getCurrentPiece()?.type).toBe("O");
    // The dropped I sits on the floor, centered at cols 3-6 of the bottom row.
    const grid = engine.getRenderState().grid;
    expect(grid[21]?.slice(3, 7).every((cell) => cell === "I")).toBe(true);
    expect([
      ...(grid[21]?.slice(0, 3) ?? []),
      ...(grid[21]?.slice(7) ?? []),
    ].every((cell) => cell === null)).toBe(true);
  });

  it("clears a full line, awards points and levels up", () => {
    const engine = makeEngine({ width: 4, linesPerLevel: 1 });
    const cleared = vi.fn((payload: EngineEventMap["linesCleared"]) => payload);
    const leveled = vi.fn();
    engine.events.on("linesCleared", cleared);
    engine.events.on("levelChanged", leveled);
    engine.start();
    engine.hardDrop(); // flat I fills the 4-wide bottom row
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(cleared.mock.results[0]?.value.event.lines).toBe(1);
    expect(cleared.mock.results[0]?.value.event.points).toBe(100);
    expect(engine.getScore()).toBe(100 + 38);
    expect(engine.getLines()).toBe(1);
    expect(leveled).toHaveBeenCalledWith(expect.objectContaining({ level: 2 }));

    // After the clear delay the board is empty again and a new piece spawns.
    advance(engine, 400);
    const grid = engine.getRenderState().grid;
    expect(grid.every((row) => row.every((cell) => cell === null))).toBe(true);
    expect(engine.getCurrentPiece()?.type).toBe("O");
  });

  it("supports hold, blocks a second hold and re-enables after locking", () => {
    const engine = makeEngine();
    engine.start();
    expect(engine.hold()).toBe(true);
    expect(engine.getHold()).toBe("I");
    expect(engine.getCurrentPiece()?.type).toBe("O");
    expect(engine.hold()).toBe(false); // one swap per drop
    engine.hardDrop();
    expect(engine.getCurrentPiece()?.type).toBe("T");
    expect(engine.hold()).toBe(true); // allowed again after the lock
    expect(engine.getHold()).toBe("T");
    expect(engine.getCurrentPiece()?.type).toBe("I"); // the stored piece returns
  });

  it("kicks an I piece off the left wall (SRS)", () => {
    const engine = makeEngine();
    engine.start();
    engine.rotateCW(); // vertical I at x=3
    while (engine.moveLeft()) {
      // slide to the wall (x reaches -2)
    }
    expect(engine.getCurrentPiece()?.x).toBe(-2);
    expect(engine.rotateCW()).toBe(true); // requires the +2 column kick
    const piece = engine.getCurrentPiece();
    expect(piece?.rotation).toBe(2);
    expect(piece?.x).toBe(0);
  });

  it("respects the lock delay while grounded", () => {
    const engine = makeEngine({ width: 4 });
    engine.start();
    engine.setSoftDrop(true);
    advance(engine, 35 * 19, 35); // exactly reach and rest on the floor
    const resting = engine.getCurrentPiece();
    expect(resting).not.toBeNull();
    const locked = vi.fn();
    engine.events.on("pieceLocked", locked);
    advance(engine, 400, 50);
    expect(locked).not.toHaveBeenCalled();
    expect(engine.getCurrentPiece()).toBe(resting);
    advance(engine, 200, 50);
    expect(locked).toHaveBeenCalledTimes(1);
    expect(engine.getCurrentPiece()).not.toBe(resting);
  });

  it("awards soft drop points", () => {
    const engine = makeEngine();
    engine.start();
    engine.setSoftDrop(true);
    advance(engine, 35 * 3, 35);
    const y = engine.getCurrentPiece()?.y ?? 0;
    expect(y).toBe(4); // spawn at 1, three soft-dropped rows
    expect(engine.getScore()).toBe(3);
  });

  it("ends the game when the stack tops out", () => {
    const engine = makeEngine({ width: 4, height: 12, hiddenRows: 2 });
    const over = vi.fn();
    engine.events.on("gameOver", over);
    engine.start();
    for (let i = 0; i < 100 && engine.getStatus() !== "gameover"; i += 1) {
      engine.hardDrop();
      advance(engine, 400, 100);
    }
    expect(engine.getStatus()).toBe("gameover");
    expect(over).toHaveBeenCalledTimes(1);
  });

  it("resets everything on restart", () => {
    const engine = makeEngine({ width: 4 });
    engine.start();
    engine.hardDrop();
    advance(engine, 400);
    engine.hardDrop();
    expect(engine.getScore()).toBeGreaterThan(0);
    engine.restart();
    expect(engine.getScore()).toBe(0);
    expect(engine.getLines()).toBe(0);
    expect(engine.getLevel()).toBe(1);
    expect(engine.getHold()).toBeNull();
    expect(engine.getStatus()).toBe("playing");
    expect(engine.getRenderState().grid.every((row) => row.every((c) => c === null))).toBe(true);
  });
});
