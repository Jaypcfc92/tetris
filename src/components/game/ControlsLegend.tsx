import { NeonPanel } from "./NeonPanel";

const SHORTCUTS: readonly { readonly keys: string; readonly action: string }[] = [
  { keys: "← →", action: "Move" },
  { keys: "↓", action: "Soft drop" },
  { keys: "Space", action: "Hard drop" },
  { keys: "↑ / X", action: "Rotate CW" },
  { keys: "Z / Ctrl", action: "Rotate CCW" },
  { keys: "C / Shift", action: "Hold" },
  { keys: "P / Esc", action: "Pause" },
  { keys: "R", action: "Restart" },
  { keys: "M", action: "Mute" },
];

/** Desktop keyboard legend. */
export function ControlsLegend(): React.ReactElement {
  return (
    <NeonPanel label="Controls" accent="green">
      <dl className="space-y-1 text-sm">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.keys} className="flex items-center justify-between gap-2">
            <dt>
              <kbd className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-foreground/85">
                {shortcut.keys}
              </kbd>
            </dt>
            <dd className="text-muted-foreground">{shortcut.action}</dd>
          </div>
        ))}
      </dl>
    </NeonPanel>
  );
}
