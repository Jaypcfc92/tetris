import type { PieceType } from "@/game/engine";
import { PIECE_COLORS } from "@/game/engine";

/**
 * Playfield layout constants. The Phaser canvas has a fixed logical size of
 * 10x20 cells and is scaled to its container with Phaser.Scale.FIT, so all
 * drawing code works in stable pixel coordinates at 60 FPS.
 */

export const CELL_SIZE = 40;
export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const BOARD_WIDTH = COLS * CELL_SIZE; // 400
export const BOARD_HEIGHT = VISIBLE_ROWS * CELL_SIZE; // 800

/** Scene palette (ARGB numbers for Phaser). */
export const COLORS = {
  background: 0x05060f,
  gridLine: 0x1c2038,
  wellStroke: 0x232a4a,
  borderGlow: 0x22d3ee,
  flash: 0xffffff,
  ghostAlpha: 0.22,
} as const;

/** Numeric ARGB color per piece type, parsed once from the shared palette. */
export const PIECE_COLOR_NUM: Record<PieceType, number> = Object.fromEntries(
  (Object.entries(PIECE_COLORS) as [PieceType, string][]).map(([type, hex]) => [
    type,
    Number.parseInt(hex.slice(1), 16),
  ]),
) as Record<PieceType, number>;

/** Level-driven border hue cycle (cyan -> magenta -> lime). */
export function levelGlowColor(level: number): number {
  const palette = [0x22d3ee, 0xe879f9, 0x4ade80, 0xfacc15, 0xfb7185];
  return palette[(level - 1) % palette.length] ?? 0x22d3ee;
}
