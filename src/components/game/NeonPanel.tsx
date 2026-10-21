import { cn } from "@/lib/utils";

interface NeonPanelProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  /** Label rendered in the panel's top-left corner. */
  readonly label?: string;
  readonly accent?: "cyan" | "magenta" | "green" | "amber" | "plain";
}

const ACCENT_CLASSES: Record<NonNullable<NeonPanelProps["accent"]>, string> = {
  cyan: "border-cyan-400/25 shadow-[0_0_18px_rgba(34,211,238,0.12)]",
  magenta: "border-fuchsia-400/25 shadow-[0_0_18px_rgba(232,121,249,0.12)]",
  green: "border-emerald-400/25 shadow-[0_0_18px_rgba(74,222,128,0.12)]",
  amber: "border-amber-400/25 shadow-[0_0_18px_rgba(250,204,21,0.12)]",
  plain: "border-white/10",
};

/** Reusable glassmorphism card with an optional neon edge and corner label. */
export function NeonPanel({
  children,
  className,
  label,
  accent = "plain",
}: NeonPanelProps): React.ReactElement {
  return (
    <section
      className={cn(
        "glass relative rounded-xl p-3 pt-4 transition-colors duration-300",
        ACCENT_CLASSES[accent],
        className,
      )}
    >
      {label ? (
        <span className="absolute -top-2.5 left-3 bg-background/80 px-1.5 font-heading text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase backdrop-blur">
          {label}
        </span>
      ) : null}
      {children}
    </section>
  );
}
