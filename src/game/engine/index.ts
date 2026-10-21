/** Barrel export for the pure game engine. */

export { GameEngine } from "./gameEngine";
export { Board } from "./board";
export { PieceBag } from "./bag";
export { TypedEmitter } from "./emitter";
export {
  PIECE_TYPES,
  PIECE_COLORS,
  PIECE_DIM_COLORS,
  createPiece,
  getPieceCells,
  getBoxSize,
} from "./tetrominoes";
export { getKicks } from "./srs";
export { gravityIntervalMs, levelForLines } from "./gravity";
export { clearPoints, clearLabel, isDifficultClear, SCORE } from "./scoring";
export { DEFAULT_CONFIG } from "./types";
export type {
  BoardGrid,
  Cell,
  EngineConfig,
  EngineEvent,
  EngineEventMap,
  GameOverEvent,
  GameStatus,
  LineClearEvent,
  LockEvent,
  Piece,
  PieceType,
  RenderState,
  RotationState,
} from "./types";
