import { getPieceCells, PIECE_COLORS } from "@/game/engine";
import type { PieceType } from "@/game/engine";
import { cn } from "@/lib/utils";

interface PiecePreviewProps {
  readonly type: PieceType | null;
  readonly size?: "sm" | "md" | "lg";
  readonly dimmed?: boolean;
  readonly className?: string;
}

const CELL_PX: Record<NonNullable<PiecePreviewProps["size"]>, string> = {
  sm: "h-3.5 w-3.5 rounded-[3px]",
  md: "h-4.5 w-4.5 rounded-[4px]",
  lg: "h-5.5 w-5.5 rounded-[4px]",
};

interface NormalizedShape {
  readonly cols: number;
  readonly rows: number;
  readonly cells: readonly { x: number; y: number }[];
}

const SHAPE_CACHE = new Map<PieceType, NormalizedShape>();

function shapeFor(type: PieceType): NormalizedShape {
  const cached = SHAPE_CACHE.get(type);
  if (cached) return cached;
  const raw = getPieceCells({ type, rotation: 0, x: 0, y: 0 });
  const minX = Math.min(...raw.map((cell) => cell.x));
  const minY = Math.min(...raw.map((cell) => cell.y));
  const cells = raw.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));
  const shape: NormalizedShape = {
    cols: Math.max(...cells.map((cell) => cell.x)) + 1,
    rows: Math.max(...cells.map((cell) => cell.y)) + 1,
    cells,
  };
  SHAPE_CACHE.set(type, shape);
  return shape;
}

/**
 * CSS-grid mini rendering of a tetromino (used by the hold slot and the
 * next-piece queue). React previews stay pixel-crisp at any scale and only
 * update when the store changes, never per frame.
 */
export function PiecePreview({
  type,
  size = "md",
  dimmed = false,
  className,
}: PiecePreviewProps): React.ReactElement {
  if (type === null) {
    return (
      <div
        className={cn(
          "flex h-14 items-center justify-center font-heading text-xs tracking-widest text-muted-foreground/40",
          className,
        )}
        aria-label="Empty slot"
      >
        EMPTY
      </div>
    );
  }

  const shape = shapeFor(type);
  const color = PIECE_COLORS[type];
  const filled = new Set(shape.cells.map((cell) => `${cell.x},${cell.y}`));

  return (
    <div
      className={cn("grid gap-0.5", className)}
      style={{
        gridTemplateColumns: `repeat(${shape.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${shape.rows}, minmax(0, 1fr))`,
      }}
      role="img"
      aria-label={`${type} piece`}
    >
      {Array.from({ length: shape.rows * shape.cols }, (_, index) => {
        const x = index % shape.cols;
        const y = Math.floor(index / shape.cols);
        const isFilled = filled.has(`${x},${y}`);
        return (
          <span
            key={`${x}-${y}`}
            className={cn(
              CELL_PX[size],
              dimmed && "opacity-45",
            )}
            style={
              isFilled
                ? ({
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}88, inset 0 1px 0 rgba(255,255,255,0.45)`,
                    border: "1px solid rgba(255,255,255,0.55)",
                  } satisfies React.CSSProperties)
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
