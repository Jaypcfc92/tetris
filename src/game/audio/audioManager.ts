"use client";

/**
 * Procedural chiptune audio: every sound effect is synthesized on the fly
 * with the Web Audio API, so the game ships zero audio assets.
 */

export type SfxName =
  | "move"
  | "rotate"
  | "softDrop"
  | "hardDrop"
  | "lock"
  | "hold"
  | "clear1"
  | "clear2"
  | "clear3"
  | "tetris"
  | "tSpin"
  | "levelUp"
  | "gameOver"
  | "start";

interface ToneOptions {
  readonly frequency: number;
  readonly endFrequency?: number;
  readonly type?: OscillatorType;
  readonly duration: number;
  readonly gain?: number;
  readonly delay?: number;
}

const MUSIC_BPM = 140;
const MUSIC_PATTERN = [
  110.0, 0, 164.81, 0, 130.81, 0, 196.0, 110.0,
  110.0, 0, 164.81, 220.0, 130.81, 0, 196.0, 246.94,
];

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private nextNoteTime = 0;

  private volume = 0.7;
  private soundEnabled = true;
  private musicEnabled = false;

  /** Create/unlock the AudioContext. Must run inside a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.soundEnabled ? this.volume : 0;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.25 : 0;
      this.musicGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.soundEnabled ? this.volume : 0, this.ctx.currentTime, 0.02);
    }
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(enabled ? this.volume : 0, this.ctx.currentTime, 0.02);
    }
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(enabled ? 0.25 : 0, this.ctx.currentTime, 0.05);
    }
    if (enabled) this.startMusic();
    else this.stopMusic();
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.master || !this.soundEnabled) return;
    switch (name) {
      case "move":
        this.tone({ frequency: 320, duration: 0.04, type: "square", gain: 0.12 });
        break;
      case "rotate":
        this.tone({ frequency: 520, endFrequency: 700, duration: 0.06, type: "square", gain: 0.14 });
        break;
      case "softDrop":
        this.tone({ frequency: 220, duration: 0.03, type: "triangle", gain: 0.08 });
        break;
      case "hardDrop":
        this.noise(0.09, 0.35, 900);
        this.tone({ frequency: 160, endFrequency: 70, duration: 0.1, type: "square", gain: 0.2 });
        break;
      case "lock":
        this.tone({ frequency: 130, endFrequency: 100, duration: 0.07, type: "triangle", gain: 0.22 });
        break;
      case "hold":
        this.tone({ frequency: 440, duration: 0.05, type: "sine", gain: 0.15 });
        this.tone({ frequency: 660, duration: 0.05, type: "sine", gain: 0.12, delay: 0.05 });
        break;
      case "clear1":
        this.arpeggio([523.25, 659.25], 0.07, "square", 0.16);
        break;
      case "clear2":
        this.arpeggio([523.25, 659.25, 783.99], 0.07, "square", 0.17);
        break;
      case "clear3":
        this.arpeggio([523.25, 659.25, 783.99, 1046.5], 0.06, "square", 0.18);
        break;
      case "tetris":
        this.arpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0], 0.055, "square", 0.2);
        this.noise(0.35, 0.12, 2400, 0.15);
        break;
      case "tSpin":
        this.arpeggio([466.16, 587.33, 698.46, 880.0], 0.06, "sawtooth", 0.15);
        break;
      case "levelUp":
        this.arpeggio([392.0, 523.25, 659.25, 783.99, 1046.5], 0.07, "triangle", 0.2);
        break;
      case "start":
        this.arpeggio([261.63, 329.63, 392.0, 523.25], 0.08, "square", 0.18);
        break;
      case "gameOver":
        this.arpeggio([392.0, 349.23, 311.13, 261.63, 196.0], 0.16, "sawtooth", 0.18);
        break;
    }
  }

  private tone(options: ToneOptions): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const start = ctx.currentTime + (options.delay ?? 0);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const peak = options.gain ?? 0.15;

    oscillator.type = options.type ?? "square";
    oscillator.frequency.setValueAtTime(options.frequency, start);
    if (options.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, start + options.duration);
    }
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + options.duration + 0.02);
  }

  private arpeggio(
    frequencies: readonly number[],
    noteDuration: number,
    type: OscillatorType,
    gain: number,
  ): void {
    frequencies.forEach((frequency, i) => {
      this.tone({ frequency, duration: noteDuration, type, gain, delay: i * noteDuration * 0.85 });
    });
  }

  private noise(duration: number, gain: number, filterFrequency: number, delay = 0): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const start = ctx.currentTime + delay;
    const frames = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFrequency;
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    source.start(start);
  }

  // -------------------------------------------------------------------- music

  private startMusic(): void {
    if (this.musicTimer !== null || !this.ctx) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 40);
  }

  private stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /** Lookahead scheduler: keeps ~200 ms of notes queued at all times. */
  private scheduleMusic(): void {
    const ctx = this.ctx;
    const music = this.musicGain;
    if (!ctx || !music) return;
    const stepDuration = 60 / MUSIC_BPM / 2;
    while (this.nextNoteTime < ctx.currentTime + 0.2) {
      const note = MUSIC_PATTERN[this.musicStep % MUSIC_PATTERN.length] ?? 0;
      if (note > 0) this.musicNote(note, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.musicStep += 1;
    }
  }

  private musicNote(frequency: number, time: number, duration: number): void {
    const ctx = this.ctx;
    const music = this.musicGain;
    if (!ctx || !music) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.5, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 0.9);
    oscillator.connect(gain);
    gain.connect(music);
    oscillator.start(time);
    oscillator.stop(time + duration);
  }

  destroy(): void {
    this.stopMusic();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
    }
  }
}

/** App-wide singleton. */
export const audioManager = new AudioManager();
