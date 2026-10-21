import { Board } from "./board";
import { PieceBag, type RandomFn } from "./bag";
import { TypedEmitter } from "./emitter";
import { gravityIntervalMs, levelForLines } from "./gravity";
import { getKicks } from "./srs";
import { clearPoints, isDifficultClear } from "./scoring";
import { createPiece, moved, rotated } from "./tetrominoes";
import {
  DEFAULT_CONFIG,
  type EngineConfig,
  type GameOverEvent,
  type GameStatus,
  type LineClearEvent,
  type Piece,
  type PieceType,
  type RenderState,
  type RotationState,
} from "./types";

interface PendingClear {
  readonly rows: readonly number[];
  timerMs: number;
}

/**
 * Pure Tetris rules engine. Owns all game state and timing; reports what
 * happened through typed events. Contains no rendering or platform code,
 * so it runs (and is tested) in plain Node.
 */
export class GameEngine {
  readonly events = new TypedEmitter();
  readonly config: EngineConfig;

  private board: Board;
  private bag: PieceBag;
  private readonly rng: RandomFn;

  private status: GameStatus = "idle";
  private current: Piece | null = null;
  private holdPiece: PieceType | null = null;
  private holdEnabled = false;
  private queue: PieceType[] = [];

  private score = 0;
  private totalLines = 0;
  private level = 1;
  private combo = -1;
  private backToBack = false;

  private gravityAccumMs = 0;
  private softDropping = false;
  private grounded = false;
  private lockTimerMs = 0;
  private lockResets = 0;
  private lastActionWasRotation = false;

  private pendingClear: PendingClear | null = null;

  constructor(config: Partial<EngineConfig> = {}, rng: RandomFn = Math.random) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rng = rng;
    this.board = new Board(this.config.width, this.config.height, this.config.hiddenRows);
    this.bag = new PieceBag(rng);
  }

  // ---------------------------------------------------------------- lifecycle

  start(): void {
    this.reset();
    this.status = "playing";
    this.events.emit("started", undefined);
    this.spawnNext();
    this.emitState();
  }

  pause(): void {
    if (this.status !== "playing") return;
    this.status = "paused";
    this.events.emit("paused", undefined);
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.status = "playing";
    this.events.emit("resumed", undefined);
  }

  togglePause(): void {
    if (this.status === "playing") this.pause();
    else if (this.status === "paused") this.resume();
  }

  restart(): void {
    this.start();
  }

  private reset(): void {
    // Fresh board/bag so every restart starts from a clean, fair deal.
    this.board = new Board(this.config.width, this.config.height, this.config.hiddenRows);
    this.bag = new PieceBag(this.rng);
    this.current = null;
    this.holdPiece = null;
    this.holdEnabled = false;
    this.queue = [];
    this.score = 0;
    this.totalLines = 0;
    this.level = 1;
    this.combo = -1;
    this.backToBack = false;
    this.gravityAccumMs = 0;
    this.softDropping = false;
    this.grounded = false;
    this.lockTimerMs = 0;
    this.lockResets = 0;
    this.lastActionWasRotation = false;
    this.pendingClear = null;
  }

  // -------------------------------------------------------------------- input

  moveLeft(): boolean {
    return this.moveHorizontally(-1);
  }

  moveRight(): boolean {
    return this.moveHorizontally(1);
  }

  rotateCW(): boolean {
    return this.rotate(1);
  }

  rotateCCW(): boolean {
    return this.rotate(-1);
  }

  /** Toggle guided soft drop (held down key / touch button). */
  setSoftDrop(active: boolean): void {
    this.softDropping = active;
  }

  hardDrop(): void {
    const piece = this.current;
    if (this.status !== "playing" || !piece) return;
    const distance = this.board.dropDistance(piece);
    if (distance > 0) {
      this.current = moved(piece, 0, distance);
      this.lastActionWasRotation = false;
      const gained = distance * this.config.hardDropPointsPerCell;
      this.addScore(gained);
      this.events.emit("hardDropped", { piece: this.current, distance, gained });
    }
    this.lockCurrent();
  }

  /** Swap the active piece with the hold slot. One use per drop. */
  hold(): boolean {
    if (this.status !== "playing" || !this.current || !this.holdEnabled) return false;
    const outgoing = this.current.type;
    const incoming = this.holdPiece;
    this.holdPiece = outgoing;
    this.holdEnabled = false;

    if (incoming !== null) {
      const spawn = createPiece(incoming, this.config.width);
      if (this.board.collides(spawn)) {
        this.gameOver(true);
        return true;
      }
      this.current = spawn;
      this.onPieceSpawned();
      this.holdEnabled = false;
    } else {
      this.spawnNext();
      this.holdEnabled = false;
    }
    this.events.emit("holdSwapped", { piece: this.holdPiece, canHold: this.holdEnabled });
    this.emitState();
    return true;
  }

  // --------------------------------------------------------------------- loop

  /** Advance the simulation by `deltaMs` of wall-clock time. */
  tick(deltaMs: number): void {
    if (this.status === "clearing" && this.pendingClear) {
      this.pendingClear.timerMs -= deltaMs;
      if (this.pendingClear.timerMs <= 0) this.finishClear();
      return;
    }
    if (this.status !== "playing" || !this.current) return;

    this.tickGravity(deltaMs);
    this.tickLockDelay(deltaMs);
  }

  private tickGravity(deltaMs: number): void {
    const normal = gravityIntervalMs(this.level);
    const interval = this.softDropping ? Math.min(normal, this.config.softDropIntervalMs) : normal;

    this.gravityAccumMs += deltaMs;
    while (this.gravityAccumMs >= interval) {
      this.gravityAccumMs -= interval;
      const piece = this.current;
      if (!piece) return;
      const below: Piece = { ...piece, y: piece.y + 1 };
      if (this.board.collides(below)) {
        this.gravityAccumMs = 0;
        break;
      }
      this.current = below;
      this.lastActionWasRotation = false;
      if (this.softDropping) {
        const gained = this.config.pointsPerSoftDropCell;
        this.addScore(gained);
        this.events.emit("softDropped", { piece: this.current, gained });
      }
    }
  }

  private tickLockDelay(deltaMs: number): void {
    const piece = this.current;
    if (!piece) return;
    const resting = this.board.collides({ ...piece, y: piece.y + 1 });

    if (!resting) {
      this.grounded = false;
      this.lockTimerMs = 0;
      this.lockResets = 0;
      return;
    }
    if (!this.grounded) {
      this.grounded = true;
      this.lockTimerMs = 0;
      this.lockResets = 0;
    }
    this.lockTimerMs += deltaMs;
    if (this.lockTimerMs >= this.config.lockDelayMs) {
      this.lockCurrent();
    }
  }

  // ------------------------------------------------------------------ locking

  private lockCurrent(): void {
    const piece = this.current;
    if (!piece) return;

    const tspin = this.detectTSpin(piece);
    const lockedCells = this.board.lock(piece);
    const rows = this.board.getFullRows();

    this.events.emit("pieceLocked", {
      event: { piece, lockedCells, clearedRows: rows },
    });

    if (this.board.isFullyHidden(piece)) {
      this.gameOver(false);
      return;
    }

    if (rows.length > 0) {
      this.applyLineClear(rows, tspin.spin, tspin.mini);
    } else {
      this.combo = -1;
      if (tspin.spin) {
        // A T-spin without lines still scores and shows a popup.
        const points = clearPoints({
          lines: 0,
          level: this.level,
          isTSpin: true,
          isMiniTSpin: tspin.mini,
          isBackToBack: false,
          combo: -1,
        });
        this.addScore(points);
        this.events.emit("linesCleared", {
          event: {
            rows: [],
            lines: 0,
            points,
            isTSpin: true,
            isMiniTSpin: tspin.mini,
            isBackToBack: false,
            combo: -1,
            level: this.level,
          },
        });
      }
      this.current = null;
      this.emitState();
      this.spawnNext();
    }
  }

  private applyLineClear(rows: readonly number[], isTSpin: boolean, isMiniTSpin: boolean): void {
    const wasBackToBack = this.backToBack;
    const difficult = isDifficultClear(rows.length, isTSpin);
    const points = clearPoints({
      lines: rows.length,
      level: this.level,
      isTSpin,
      isMiniTSpin,
      isBackToBack: wasBackToBack,
      combo: this.combo + 1,
    });

    this.combo += 1;
    this.backToBack = difficult;
    this.totalLines += rows.length;

    const event: LineClearEvent = {
      rows,
      lines: rows.length,
      points,
      isTSpin,
      isMiniTSpin,
      isBackToBack: wasBackToBack && difficult,
      combo: this.combo,
      level: this.level,
    };

    this.addScore(points);
    this.events.emit("linesCleared", { event });

    const nextLevel = levelForLines(this.totalLines, this.config.linesPerLevel);
    if (nextLevel !== this.level) {
      this.level = nextLevel;
      this.events.emit("levelChanged", {
        level: this.level,
        gravityMs: gravityIntervalMs(this.level),
      });
    }

    this.current = null;
    this.pendingClear = { rows, timerMs: this.config.clearDelayMs };
    this.status = "clearing";
    this.emitState();
  }

  private finishClear(): void {
    const pending = this.pendingClear;
    if (!pending) return;
    this.board.clearRows(pending.rows);
    this.pendingClear = null;
    this.status = "playing";
    this.emitState();
    this.spawnNext();
  }

  /**
   * 3-corner rule: a T piece whose last action was a rotation and which
   * touches three (of four) diagonal corners of its box has scored a T-spin.
   * Both "front" corners filled means a full T-spin, otherwise a mini.
   */
  private detectTSpin(piece: Piece): { spin: boolean; mini: boolean } {
    if (piece.type !== "T" || !this.lastActionWasRotation) {
      return { spin: false, mini: false };
    }
    const corners = [
      { x: piece.x, y: piece.y },
      { x: piece.x + 2, y: piece.y },
      { x: piece.x, y: piece.y + 2 },
      { x: piece.x + 2, y: piece.y + 2 },
    ];
    const filled = corners.map(
      ({ x, y }) => !this.board.isInside(y, x) || this.board.cellAt(y, x) !== null,
    );
    const count = filled.filter(Boolean).length;
    if (count < 3) return { spin: false, mini: false };

    // Front corners by facing: 0 = up (top pair), 1 = right, 2 = down, 3 = left.
    const frontPairs: Record<RotationState, readonly [number, number]> = {
      0: [0, 1],
      1: [1, 2],
      2: [2, 3],
      3: [0, 3],
    };
    const pair = frontPairs[piece.rotation];
    const full = (filled[pair[0]] ?? false) && (filled[pair[1]] ?? false);
    return { spin: true, mini: !full };
  }

  // ---------------------------------------------------------------- spawning

  private spawnNext(): void {
    const type = this.bag.next();
    this.queue = this.bag.peek(this.config.previewLength);
    this.events.emit("queueChanged", { queue: this.queue });

    const spawn = createPiece(type, this.config.width);
    if (this.board.collides(spawn)) {
      this.gameOver(true);
      return;
    }
    this.current = spawn;
    this.onPieceSpawned();
  }

  private onPieceSpawned(): void {
    this.gravityAccumMs = 0;
    this.grounded = false;
    this.lockTimerMs = 0;
    this.lockResets = 0;
    this.holdEnabled = true;
    this.lastActionWasRotation = false;
  }

  private gameOver(blockOut: boolean): void {
    this.status = "gameover";
    this.current = null;
    const event: GameOverEvent = {
      score: this.score,
      lines: this.totalLines,
      level: this.level,
      blockOut,
    };
    this.emitState();
    this.events.emit("gameOver", { event });
  }

  // ----------------------------------------------------------------- movement

  private moveHorizontally(dx: number): boolean {
    const piece = this.current;
    if (this.status !== "playing" || !piece) return false;
    const target = moved(piece, dx, 0);
    if (this.board.collides(target)) return false;
    this.current = target;
    this.lastActionWasRotation = false;
    this.afterManipulation();
    this.events.emit("pieceMoved", { piece: this.current });
    return true;
  }

  private rotate(direction: 1 | -1): boolean {
    const piece = this.current;
    if (this.status !== "playing" || !piece) return false;
    const from = piece.rotation;
    const to = ((((from + direction) % 4) + 4) % 4) as RotationState;
    const kicks = getKicks(piece.type, from, to);

    for (let i = 0; i < kicks.length; i += 1) {
      const kick = kicks[i];
      if (!kick) continue;
      const [dx, dy] = kick;
      const target = rotated({ ...piece, x: piece.x + dx, y: piece.y + dy }, direction);
      if (!this.board.collides(target)) {
        this.current = target;
        this.lastActionWasRotation = true;
        this.afterManipulation();
        this.events.emit("pieceRotated", { piece: this.current, kicked: i > 0 });
        return true;
      }
    }
    return false;
  }

  /** Movement/rotation while grounded buys extra thinking time (limited). */
  private afterManipulation(): void {
    if (this.grounded && this.lockResets < this.config.maxLockResets) {
      this.lockTimerMs = 0;
      this.lockResets += 1;
    }
  }

  // ------------------------------------------------------------------- getters

  getScore(): number {
    return this.score;
  }

  getLevel(): number {
    return this.level;
  }

  getLines(): number {
    return this.totalLines;
  }

  getCombo(): number {
    return this.combo;
  }

  isBackToBack(): boolean {
    return this.backToBack;
  }

  getStatus(): GameStatus {
    return this.status;
  }

  getCurrentPiece(): Piece | null {
    return this.current;
  }

  getHold(): PieceType | null {
    return this.holdPiece;
  }

  getQueue(): readonly PieceType[] {
    return this.queue;
  }

  getGhostY(): number | null {
    const piece = this.current;
    if (!piece) return null;
    return piece.y + this.board.dropDistance(piece);
  }

  /** Immutable snapshot consumed by the renderer. */
  getRenderState(): RenderState {
    return {
      grid: this.board.snapshot(),
      active: this.current,
      ghostY: this.getGhostY(),
      hold: this.holdPiece,
      canHold: this.holdEnabled,
      queue: this.queue,
      status: this.status,
    };
  }

  // ------------------------------------------------------------------- helpers

  private addScore(delta: number): void {
    if (delta <= 0) return;
    this.score += delta;
    this.events.emit("scoreChanged", { score: this.score, delta });
  }

  private emitState(): void {
    this.events.emit("boardChanged", undefined);
  }
}
