import Phaser from "phaser";
import { GameEngine, clearLabel } from "@/game/engine";
import type { LineClearEvent } from "@/game/engine";
import { audioManager } from "@/game/audio/audioManager";
import { useGameStore } from "@/store/gameStore";
import { useSettingsStore } from "@/store/settingsStore";
import { topScore, useHighScoresStore } from "@/store/highScoresStore";
import { PlayfieldScene, type SceneCallbacks } from "./PlayfieldScene";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./constants";

const DAS_MS = 150;
const ARR_MS = 35;

const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "Space",
  "KeyZ",
  "KeyX",
  "KeyC",
  "KeyP",
  "KeyR",
  "KeyM",
  "ShiftLeft",
  "ControlLeft",
  "Escape",
  "Enter",
]);

/**
 * The bridge between layers: owns the engine, feeds it input (keyboard with
 * DAS/ARR, plus gestures from the scene), mirrors discrete events into the
 * Zustand stores and triggers audio and visual effects.
 */
export class GameController implements SceneCallbacks {
  readonly engine = new GameEngine();

  private scene: PlayfieldScene | null = null;
  private dasDirection: -1 | 0 | 1 = 0;
  private dasTimerMs = 0;
  private arrTimerMs = 0;
  private popupId = 0;
  private softDropHeld = false;
  private readonly cleanups: (() => void)[] = [];

  constructor() {
    this.wireEngineEvents();
    this.wireKeyboard();
    this.wireVisibility();
    this.applySettings();
    this.cleanups.push(
      useSettingsStore.subscribe(() => this.applySettings()),
    );
  }

  // ------------------------------------------------------------------ attach

  /** Called by the scene on create so effects have a rendering target. */
  registerScene(scene: PlayfieldScene): void {
    this.scene = scene;
    scene.setGhostEnabled(useSettingsStore.getState().ghostEnabled);
  }

  getSceneCallbacks(): SceneCallbacks {
    return this;
  }

  // ------------------------------------------------------------- public cmds

  startGame(): void {
    audioManager.unlock();
    this.applySettings();
    audioManager.play("start");
    this.engine.start();
  }

  restart(): void {
    this.engine.restart();
  }

  togglePause(): void {
    this.engine.togglePause();
  }

  moveHorizontal(direction: -1 | 1): void {
    if (direction === -1) this.engine.moveLeft();
    else this.engine.moveRight();
  }

  rotateCW(): void {
    if (this.engine.rotateCW()) audioManager.play("rotate");
  }

  rotateCCW(): void {
    if (this.engine.rotateCCW()) audioManager.play("rotate");
  }

  hardDrop(): void {
    this.engine.hardDrop();
  }

  holdPiece(): void {
    if (this.engine.hold()) audioManager.play("hold");
  }

  setSoftDrop(active: boolean): void {
    this.softDropHeld = active;
    this.engine.setSoftDrop(active);
  }

  toggleMute(): void {
    const settings = useSettingsStore.getState();
    settings.setSoundEnabled(!settings.soundEnabled);
  }

  // -------------------------------------------------------- SceneCallbacks

  frameUpdate(deltaMs: number): void {
    // Cap the step so a background tab returning doesn't fast-forward gravity.
    this.engine.tick(Math.min(deltaMs, 100));
    this.tickDAS(deltaMs);
  }

  onTap(): void {
    const status = useGameStore.getState().status;
    if (status === "playing") this.rotateCW();
  }

  onSwipeHorizontal(cells: number): void {
    const steps = Math.abs(cells);
    for (let i = 0; i < steps; i += 1) this.moveHorizontal(cells > 0 ? 1 : -1);
  }

  onSoftDrop(active: boolean): void {
    this.setSoftDrop(active);
  }

  onFlickDown(): void {
    this.hardDrop();
  }

  // ------------------------------------------------------------------- DAS

  private tickDAS(deltaMs: number): void {
    if (this.dasDirection === 0) return;
    this.dasTimerMs += deltaMs;
    if (this.dasTimerMs < DAS_MS) return;
    this.arrTimerMs += deltaMs;
    while (this.arrTimerMs >= ARR_MS) {
      this.arrTimerMs -= ARR_MS;
      if (this.dasDirection === -1) this.engine.moveLeft();
      else this.engine.moveRight();
    }
  }

  private beginDas(direction: -1 | 1): void {
    this.moveHorizontal(direction);
    this.dasDirection = direction;
    this.dasTimerMs = 0;
    this.arrTimerMs = 0;
  }

  private endDas(direction: -1 | 1): void {
    if (this.dasDirection === direction) this.dasDirection = 0;
  }

  // ---------------------------------------------------------------- keyboard

  private wireKeyboard(): void {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!GAME_KEYS.has(event.code)) return;
      event.preventDefault();
      audioManager.unlock();
      if (event.repeat) return;

      switch (event.code) {
        case "ArrowLeft":
          this.beginDas(-1);
          break;
        case "ArrowRight":
          this.beginDas(1);
          break;
        case "ArrowDown":
          this.setSoftDrop(true);
          break;
        case "ArrowUp":
        case "KeyX":
          this.rotateCW();
          break;
        case "KeyZ":
        case "ControlLeft":
          this.rotateCCW();
          break;
        case "Space":
          this.hardDrop();
          break;
        case "KeyC":
        case "ShiftLeft":
          this.holdPiece();
          break;
        case "KeyP":
        case "Escape":
          this.togglePause();
          break;
        case "KeyR":
          this.restart();
          break;
        case "KeyM":
          this.toggleMute();
          break;
        case "Enter": {
          const status = useGameStore.getState().status;
          if (status === "idle") this.startGame();
          else if (status === "gameover") this.restart();
          else if (status === "paused") this.togglePause();
          break;
        }
        default:
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent): void => {
      if (!GAME_KEYS.has(event.code)) return;
      event.preventDefault();
      switch (event.code) {
        case "ArrowLeft":
          this.endDas(-1);
          break;
        case "ArrowRight":
          this.endDas(1);
          break;
        case "ArrowDown":
          this.setSoftDrop(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: false });
    this.cleanups.push(() => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    });
  }

  private wireVisibility(): void {
    const onHidden = (): void => {
      if (document.hidden) this.engine.pause();
    };
    document.addEventListener("visibilitychange", onHidden);
    this.cleanups.push(() => document.removeEventListener("visibilitychange", onHidden));
  }

  // ----------------------------------------------------------- engine -> UI

  private wireEngineEvents(): void {
    const events = this.engine.events;
    const store = useGameStore;

    events.on("started", () => {
      store.getState().resetRun();
      store.getState().setStatus("playing");
      this.scene?.syncBoard();
    });

    events.on("paused", () => store.getState().setStatus("paused"));
    events.on("resumed", () => store.getState().setStatus("playing"));

    events.on("pieceMoved", () => audioManager.play("move"));

    events.on("pieceRotated", () => {
      audioManager.play("rotate");
    });

    events.on("softDropped", () => audioManager.play("softDrop"));

    events.on("hardDropped", (payload) => {
      audioManager.play("hardDrop");
      this.scene?.hardDropTrail(payload.piece, payload.distance);
    });

    events.on("pieceLocked", (payload) => {
      audioManager.play("lock");
      this.scene?.lockFlash(payload.event.lockedCells);
    });

    events.on("linesCleared", (payload) => {
      const { event } = payload;
      this.scene?.syncBoard();
      if (event.lines > 0) {
        this.scene?.flashRows(event.rows, this.engine.config.clearDelayMs, event.lines === 4);
      }
      audioManager.play(resolveClearSound(event));
      this.popupId += 1;
      store.getState().setPopup({
        id: this.popupId,
        label: clearLabel(event.lines, event.isTSpin, event.isMiniTSpin),
        points: event.points,
        lines: event.lines,
        isTSpin: event.isTSpin,
        isBackToBack: event.isBackToBack,
        combo: event.combo,
      });
      this.syncStats();
      store.getState().setCombo(event.combo, event.isBackToBack);
    });

    events.on("scoreChanged", () => this.syncStats());

    events.on("levelChanged", (payload) => {
      audioManager.play("levelUp");
      this.scene?.pulseLevel(payload.level);
    });

    events.on("holdSwapped", (payload) => {
      audioManager.play("hold");
      store.getState().setHold(payload.piece, payload.canHold);
    });

    events.on("queueChanged", (payload) => {
      store.getState().setQueue(payload.queue);
    });

    events.on("boardChanged", () => {
      this.scene?.syncBoard();
      const state = this.engine.getRenderState();
      store.getState().setHold(state.hold, state.canHold);
    });

    events.on("gameOver", (payload) => {
      audioManager.play("gameOver");
      store.getState().setStatus("gameover");
      this.scene?.syncBoard();
      const { addEntry } = useHighScoresStore.getState();
      addEntry({
        score: payload.event.score,
        lines: payload.event.lines,
        level: payload.event.level,
      });
      const entries = useHighScoresStore.getState().entries;
      store.getState().setBestScore(topScore(entries));
    });
  }

  private syncStats(): void {
    useGameStore.getState().setStats({
      score: this.engine.getScore(),
      lines: this.engine.getLines(),
      level: this.engine.getLevel(),
    });
  }

  private applySettings(): void {
    const settings = useSettingsStore.getState();
    audioManager.setVolume(settings.volume);
    audioManager.setSoundEnabled(settings.soundEnabled);
    audioManager.setMusicEnabled(settings.musicEnabled);
    this.scene?.setGhostEnabled(settings.ghostEnabled);
  }

  destroy(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.engine.events.clear();
    this.scene = null;
  }
}

function resolveClearSound(event: LineClearEvent): "tSpin" | "tetris" | "clear1" | "clear2" | "clear3" {
  if (event.isTSpin) return "tSpin";
  if (event.lines === 4) return "tetris";
  if (event.lines === 3) return "clear3";
  if (event.lines === 2) return "clear2";
  return "clear1";
}

/** Phaser game configuration for a single-scene, fixed-logical-size canvas. */
export function createGameConfig(
  parent: HTMLElement,
  engine: GameEngine,
  callbacks: SceneCallbacks,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    transparent: true,
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      powerPreference: "high-performance",
      antialias: true,
    },
    fps: {
      target: 60,
      min: 30,
    },
    scene: PlayfieldScene,
    callbacks: {
      preBoot: (game: Phaser.Game) => {
        game.registry.set("engine", engine);
        game.registry.set("callbacks", callbacks);
      },
    },
  };
}
