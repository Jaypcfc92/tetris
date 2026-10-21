import type { GameController } from "./GameController";

/**
 * Module-level reference to the mounted game controller so React components
 * anywhere in the tree can send commands without prop drilling or context.
 */
let active: GameController | null = null;

export function setActiveController(controller: GameController | null): void {
  active = controller;
}

export function activeController(): GameController | null {
  return active;
}

/** Convenience wrapper: every command is a safe no-op before the game mounts. */
export const gameCommands = {
  start: (): void => active?.startGame(),
  restart: (): void => active?.restart(),
  togglePause: (): void => active?.togglePause(),
  moveLeft: (): void => active?.moveHorizontal(-1),
  moveRight: (): void => active?.moveHorizontal(1),
  rotateCW: (): void => active?.rotateCW(),
  rotateCCW: (): void => active?.rotateCCW(),
  hardDrop: (): void => active?.hardDrop(),
  hold: (): void => active?.holdPiece(),
  setSoftDrop: (activeDrop: boolean): void => active?.setSoftDrop(activeDrop),
  toggleMute: (): void => active?.toggleMute(),
};
