"use client";

import { Volume2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/store/settingsStore";

/** Audio + gameplay preferences (persisted). */
export function SettingsDialog(): React.ReactElement {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const musicEnabled = useSettingsStore((state) => state.musicEnabled);
  const volume = useSettingsStore((state) => state.volume);
  const ghostEnabled = useSettingsStore((state) => state.ghostEnabled);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  const setMusicEnabled = useSettingsStore((state) => state.setMusicEnabled);
  const setVolume = useSettingsStore((state) => state.setVolume);
  const setGhostEnabled = useSettingsStore((state) => state.setGhostEnabled);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="glass gap-1.5 border-cyan-400/25 bg-transparent font-heading text-xs tracking-widest text-cyan-300 hover:bg-cyan-400/10 hover:text-cyan-200"
        >
          <Volume2 className="h-3.5 w-3.5" />
          SETTINGS
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-cyan-400/25 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold tracking-[0.2em] text-cyan-300">
            SETTINGS
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sound, music and gameplay options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <SettingRow
            id="sfx"
            label="Sound effects"
            control={
              <Switch id="sfx" checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            }
          />
          <SettingRow
            id="music"
            label="Chiptune music"
            control={
              <Switch id="music" checked={musicEnabled} onCheckedChange={setMusicEnabled} />
            }
          />
          <div className="space-y-2">
            <Label htmlFor="volume" className="text-sm text-foreground/90">
              Volume{" "}
              <span className="tabular-nums text-muted-foreground">
                {Math.round(volume * 100)}%
              </span>
            </Label>
            <Slider
              id="volume"
              value={[volume]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([value]) => setVolume(value ?? 0)}
            />
          </div>
          <SettingRow
            id="ghost"
            label="Ghost piece"
            control={
              <Switch id="ghost" checked={ghostEnabled} onCheckedChange={setGhostEnabled} />
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingRow({
  id,
  label,
  control,
}: {
  readonly id: string;
  readonly label: string;
  readonly control: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="text-sm text-foreground/90">
        {label}
      </Label>
      {control}
    </div>
  );
}
