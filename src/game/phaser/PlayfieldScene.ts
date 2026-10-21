import Phaser from "phaser";
import { getPieceCells } from "@/game/engine";
import type { GameEngine, Piece, RenderState } from "@/game/engine";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CELL_SIZE,
  COLORS,
  COLS,
  PIECE_COLOR_NUM,
  VISIBLE_ROWS,
  levelGlowColor,
} from "./constants";

/** Input bridge: the scene reports gestures; the controller performs actions. */
export interface SceneCallbacks {
  /** Scene hands itself over so effects have a rendering target. */
  registerScene(scene: PlayfieldScene): void;
  frameUpdate(deltaMs: number): void;
  onTap(): void;
  onSwipeHorizontal(cells: number): void;
  onSoftDrop(active: boolean): void;
  onFlickDown(): void;
}

const HIDDEN_ROWS = 2;
const SWIPE_THRESHOLD = CELL_SIZE * 0.7;
const TAP_MAX_MS = 260;
const TAP_MAX_DRIFT = 12;
const FLICK_VELOCITY = 1.1; // px per ms, downward

/**
 * Purely visual scene: draws the well, the locked stack, the active piece,
 * the ghost and the effect layers. Game rules live in the engine; input
 * interpretation lives in the controller. The board layer is redrawn only
 * when the engine reports a change (dirty flag), keeping the 60 FPS budget
 * available to the active piece and effects.
 */
export class PlayfieldScene extends Phaser.Scene {
  private engine!: GameEngine;
  private callbacks!: SceneCallbacks;

  private bgLayer!: Phaser.GameObjects.Graphics;
  private boardLayer!: Phaser.GameObjects.Graphics;
  private pieceLayer!: Phaser.GameObjects.Graphics;
  private fxLayer!: Phaser.GameObjects.Graphics;
  private border!: Phaser.GameObjects.Graphics;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private renderState: RenderState | null = null;
  private boardDirty = true;
  private ghostEnabled = true;

  // Gesture tracking.
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerStartTime = 0;
  private pointerTravelled = false;
  private softDragging = false;

  constructor() {
    super("playfield");
  }

  init(): void {
    this.engine = this.registry.get("engine") as GameEngine;
    this.callbacks = this.registry.get("callbacks") as SceneCallbacks;
  }

  create(): void {
    this.callbacks.registerScene(this);
    this.bgLayer = this.add.graphics();
    this.boardLayer = this.add.graphics();
    this.pieceLayer = this.add.graphics();
    this.fxLayer = this.add.graphics();
    this.border = this.add.graphics();

    this.drawBackground();
    this.drawBorder(levelGlowColor(1));
    this.createSparkTexture();
    this.particles = this.add.particles(0, 0, "spark", {
      lifespan: 450,
      speed: { min: 60, max: 240 },
      scale: { start: 1, end: 0 },
      gravityY: 420,
      emitting: false,
      quantity: 1,
    });

    this.syncBoard();
    this.bindGestures();
  }

  // ------------------------------------------------------------------ drawing

  private drawBackground(): void {
    const g = this.bgLayer;
    g.clear();
    g.fillStyle(COLORS.background, 1);
    g.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    // Empty wells.
    for (let row = 0; row < VISIBLE_ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;
        g.fillStyle(0x0a0d1c, 0.85);
        g.fillRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 5);
        g.lineStyle(1, COLORS.gridLine, 0.5);
        g.strokeRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 5);
      }
    }
  }

  private drawBorder(color: number): void {
    const g = this.border;
    g.clear();
    g.lineStyle(3, color, 0.9);
    g.strokeRect(1.5, 1.5, BOARD_WIDTH - 3, BOARD_HEIGHT - 3);
  }

  private createSparkTexture(): void {
    if (this.textures.exists("spark")) return;
    const spark = this.make.graphics({ x: 0, y: 0 }, false);
    spark.fillStyle(0xffffff, 1);
    spark.fillRoundedRect(0, 0, 6, 6, 2);
    spark.generateTexture("spark", 6, 6);
    spark.destroy();
  }

  private drawBlock(
    g: Phaser.GameObjects.Graphics,
    col: number,
    row: number,
    color: number,
    style: "solid" | "ghost",
  ): void {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    if (style === "ghost") {
      g.lineStyle(2, color, COLORS.ghostAlpha + 0.2);
      g.strokeRoundedRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8, 5);
      g.fillStyle(color, COLORS.ghostAlpha * 0.45);
      g.fillRoundedRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8, 5);
      return;
    }
    // Neon block: saturated fill, bright rim, top-left highlight.
    g.fillStyle(color, 0.92);
    g.fillRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
    g.lineStyle(2, 0xffffff, 0.55);
    g.strokeRoundedRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
    g.fillStyle(0xffffff, 0.2);
    g.fillRoundedRect(x + 6, y + 6, CELL_SIZE - 12, 8, 3);
  }

  private redrawBoard(): void {
    const g = this.boardLayer;
    g.clear();
    const grid = this.renderState?.grid;
    if (!grid) return;
    for (let row = HIDDEN_ROWS; row < grid.length; row += 1) {
      const line = grid[row];
      if (!line) continue;
      for (let col = 0; col < line.length; col += 1) {
        const cell = line[col];
        if (cell) this.drawBlock(g, col, row - HIDDEN_ROWS, PIECE_COLOR_NUM[cell], "solid");
      }
    }
  }

  private drawPiece(): void {
    const g = this.pieceLayer;
    g.clear();
    // Read the live piece every frame: gravity and input move it between
    // engine events, so a snapshot would lag behind.
    const piece = this.engine.getCurrentPiece();
    if (!piece || this.engine.getStatus() === "gameover") return;

    if (this.ghostEnabled) {
      const ghostY = this.engine.getGhostY();
      if (ghostY !== null) {
        for (const cell of getPieceCells({ ...piece, y: ghostY })) {
          this.drawBlock(g, cell.x, cell.y - HIDDEN_ROWS, PIECE_COLOR_NUM[piece.type], "ghost");
        }
      }
    }
    for (const cell of getPieceCells(piece)) {
      this.drawBlock(g, cell.x, cell.y - HIDDEN_ROWS, PIECE_COLOR_NUM[piece.type], "solid");
    }
  }

  // ------------------------------------------------------------------ effects

  /** Push a fresh snapshot of the board (call when the engine reports changes). */
  syncBoard(): void {
    this.renderState = this.engine.getRenderState();
    this.boardDirty = true;
  }

  setGhostEnabled(enabled: boolean): void {
    this.ghostEnabled = enabled;
  }

  pulseLevel(level: number): void {
    this.drawBorder(levelGlowColor(level));
    this.tweens.add({
      targets: this.border,
      alpha: { from: 0.3, to: 1 },
      duration: 420,
      ease: "Quad.easeOut",
    });
  }

  /** White flash + sparks across the cleared rows while the engine holds them. */
  flashRows(rows: readonly number[], durationMs: number, big: boolean): void {
    const visible = rows.filter((row) => row >= HIDDEN_ROWS);
    if (visible.length === 0) return;
    const flash = this.add.graphics();
    flash.setDepth(10);
    for (const row of visible) {
      flash.fillStyle(COLORS.flash, 0.85);
      flash.fillRect(0, (row - HIDDEN_ROWS) * CELL_SIZE, BOARD_WIDTH, CELL_SIZE);
      this.particles.emitParticleAt(
        BOARD_WIDTH * 0.5,
        (row - HIDDEN_ROWS) * CELL_SIZE + CELL_SIZE * 0.5,
        big ? 10 : 5,
      );
    }
    this.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0 },
      duration: durationMs,
      ease: "Quad.easeIn",
      onComplete: () => flash.destroy(),
    });
    if (big) {
      this.cameras.main.shake(220, 0.006);
    } else {
      this.cameras.main.shake(110, 0.002);
    }
  }

  /** Fading column trail spanning the whole fall path of a hard drop. */
  hardDropTrail(piece: Piece, distance: number): void {
    if (distance <= 0) return;
    const trail = this.add.graphics();
    trail.setDepth(5);
    const color = PIECE_COLOR_NUM[piece.type];
    const cells = getPieceCells(piece);
    const columns = [...new Set(cells.map((cell) => cell.x))];
    const topRow = Math.max(piece.y - distance - HIDDEN_ROWS, 0);
    const bottomRow = Math.max(...cells.map((cell) => cell.y)) - HIDDEN_ROWS + 1;
    trail.fillStyle(color, 0.28);
    for (const col of columns) {
      trail.fillRoundedRect(
        col * CELL_SIZE + 8,
        topRow * CELL_SIZE,
        CELL_SIZE - 16,
        (bottomRow - topRow) * CELL_SIZE,
        6,
      );
    }
    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => trail.destroy(),
    });
  }

  /** Brief white silhouette over freshly locked cells. */
  lockFlash(cells: readonly { x: number; y: number }[]): void {
    const flash = this.add.graphics();
    flash.setDepth(9);
    flash.fillStyle(COLORS.flash, 0.55);
    for (const cell of cells) {
      if (cell.y < HIDDEN_ROWS) continue;
      flash.fillRoundedRect(
        cell.x * CELL_SIZE + 2,
        (cell.y - HIDDEN_ROWS) * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4,
        6,
      );
    }
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 160,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  // ------------------------------------------------------------------ gestures

  private bindGestures(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.pointerStartX = pointer.x;
      this.pointerStartY = pointer.y;
      this.pointerStartTime = pointer.downTime;
      this.pointerTravelled = false;
      this.softDragging = false;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const dx = pointer.x - this.pointerStartX;
      const dy = pointer.y - this.pointerStartY;

      if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        const steps = Math.trunc(dx / SWIPE_THRESHOLD);
        this.callbacks.onSwipeHorizontal(steps);
        this.pointerStartX += steps * SWIPE_THRESHOLD;
        this.pointerTravelled = true;
      } else if (dy > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        if (!this.softDragging) {
          this.softDragging = true;
          this.pointerTravelled = true;
          this.callbacks.onSoftDrop(true);
        }
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const elapsed = pointer.upTime - this.pointerStartTime;
      const drift = Math.hypot(pointer.x - this.pointerStartX, pointer.y - this.pointerStartY);
      const downward = pointer.y - this.pointerStartY;
      const velocity = downward / Math.max(elapsed, 1);

      if (this.softDragging) {
        this.callbacks.onSoftDrop(false);
        if (velocity > FLICK_VELOCITY && downward > CELL_SIZE) {
          this.callbacks.onFlickDown();
        }
        return;
      }
      if (!this.pointerTravelled && elapsed < TAP_MAX_MS && drift < TAP_MAX_DRIFT) {
        this.callbacks.onTap();
      }
    });
  }

  // --------------------------------------------------------------------- loop

  override update(_time: number, delta: number): void {
    this.callbacks.frameUpdate(delta);
    if (this.boardDirty) {
      this.redrawBoard();
      this.boardDirty = false;
    }
    this.drawPiece();
  }
}
