import type { AshenReachAudioCue, AshenReachMusicState } from "./audioEventSelectors.js";

export type AshenReachMixer = "music" | "sfx" | "ambient";

export interface MixerSetting {
  volume: number;
  muted: boolean;
}

export type AudioSettingsSnapshot = Record<AshenReachMixer, MixerSetting>;

type AudioContextConstructor = typeof AudioContext;

const defaultSettings: AudioSettingsSnapshot = {
  music: { volume: 0.28, muted: false },
  sfx: { volume: 0.72, muted: false },
  ambient: { volume: 0.34, muted: false }
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function jitter(amount: number): number {
  return 1 + (Math.random() * 2 - 1) * amount;
}

export class AshenReachAudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private mixerGains: Record<AshenReachMixer, GainNode | null> = { music: null, sfx: null, ambient: null };
  private settings: AudioSettingsSnapshot = {
    music: { ...defaultSettings.music },
    sfx: { ...defaultSettings.sfx },
    ambient: { ...defaultSettings.ambient }
  };
  private musicState: AshenReachMusicState = "silent";
  private musicNodes: Array<OscillatorNode | AudioBufferSourceNode> = [];
  private musicGain: GainNode | null = null;
  private ambientNodes: Array<OscillatorNode | AudioBufferSourceNode> = [];
  private ambientGain: GainNode | null = null;

  getSettings(): AudioSettingsSnapshot {
    return {
      music: { ...this.settings.music },
      sfx: { ...this.settings.sfx },
      ambient: { ...this.settings.ambient }
    };
  }

  ensureStarted(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    if (!this.context) {
      const contextCtor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext);

      if (!contextCtor) {
        return false;
      }

      this.context = new contextCtor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.82;
      this.master.connect(this.context.destination);

      (Object.keys(this.mixerGains) as AshenReachMixer[]).forEach((mixer) => {
        const gain = this.context!.createGain();
        gain.connect(this.master!);
        this.mixerGains[mixer] = gain;
      });

      this.applyMixerSettings();
      this.startAmbientBed();
    }

    if (this.context.state === "suspended") {
      void this.context.resume();
    }

    return true;
  }

  setMixerVolume(mixer: AshenReachMixer, volume: number): void {
    this.settings[mixer] = { ...this.settings[mixer], volume: clamp(volume) };
    this.applyMixerSettings();
  }

  setMixerMuted(mixer: AshenReachMixer, muted: boolean): void {
    this.settings[mixer] = { ...this.settings[mixer], muted };
    this.applyMixerSettings();
  }

  setMusicState(state: AshenReachMusicState): void {
    if (this.musicState === state) {
      return;
    }

    this.musicState = state;

    if (!this.ensureStarted()) {
      return;
    }

    this.stopMusicBed();

    if (state === "silent") {
      return;
    }

    this.startMusicBed(state);
  }

  play(cue: AshenReachAudioCue): void {
    if (!this.ensureStarted() || !this.context) {
      return;
    }

    switch (cue) {
      case "dice_roll":
        this.playDiceRoll();
        break;
      case "dice_land":
        this.playImpact(82, 0.16, 0.5);
        this.playBell(430, 0.09, 0.12, "sfx");
        break;
      case "battle_start":
        this.playWhoosh(0.22, 0.38);
        this.playImpact(62, 0.2, 0.62);
        break;
      case "hit":
        this.playImpact(118, 0.12, 0.38);
        this.playBell(260, 0.11, 0.12, "sfx");
        break;
      case "critical":
        this.playBell(620, 0.42, 0.22, "sfx");
        this.playBell(930, 0.5, 0.12, "sfx");
        break;
      case "damage":
        this.playImpact(54, 0.14, 0.46);
        this.playNoise(0.1, 0.22, 240, "lowpass", "sfx");
        break;
      case "card_reveal":
        this.playWhoosh(0.18, 0.18);
        this.playBell(540, 0.15, 0.11, "sfx");
        break;
      case "loot":
        this.playBell(720, 0.12, 0.12, "sfx");
        this.playBell(890, 0.12, 0.08, "sfx", 0.04);
        break;
      case "shop":
        this.playBell(460, 0.08, 0.11, "sfx");
        this.playBell(690, 0.08, 0.08, "sfx", 0.05);
        this.playNoise(0.09, 0.1, 1800, "bandpass", "sfx");
        break;
      case "shrine":
        this.playBell(420, 0.58, 0.11, "sfx");
        this.playBell(630, 0.6, 0.08, "sfx");
        break;
      case "portal":
        this.playWhoosh(0.36, 0.34);
        this.playImpact(44, 0.3, 0.28);
        break;
      case "boss":
        this.playImpact(42, 0.38, 0.58);
        this.playBell(170, 0.7, 0.14, "sfx");
        break;
      case "victory":
        this.playBell(440, 0.6, 0.16, "sfx");
        this.playBell(660, 0.8, 0.13, "sfx", 0.08);
        this.playBell(880, 1, 0.1, "sfx", 0.16);
        break;
      case "defeat":
        this.playImpact(38, 0.7, 0.55);
        this.playBell(110, 0.9, 0.16, "sfx");
        break;
    }
  }

  private applyMixerSettings(): void {
    if (!this.context) {
      return;
    }

    (Object.keys(this.settings) as AshenReachMixer[]).forEach((mixer) => {
      const node = this.mixerGains[mixer];

      if (!node) {
        return;
      }

      const setting = this.settings[mixer];
      node.gain.setTargetAtTime(setting.muted ? 0 : setting.volume, this.context!.currentTime, 0.025);
    });
  }

  private getMixer(mixer: AshenReachMixer): GainNode | null {
    return this.mixerGains[mixer];
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    const context = this.context!;
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < frameCount; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
    }

    return buffer;
  }

  private playNoise(
    duration: number,
    volume: number,
    frequency: number,
    filterType: BiquadFilterType,
    mixer: AshenReachMixer,
    delay = 0
  ): void {
    const context = this.context!;
    const target = this.getMixer(mixer);

    if (!target) {
      return;
    }

    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = this.createNoiseBuffer(duration);
    filter.type = filterType;
    filter.frequency.value = frequency * jitter(0.03);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume * jitter(0.04), start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(target);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  private playBell(frequency: number, duration: number, volume: number, mixer: AshenReachMixer, delay = 0): void {
    const context = this.context!;
    const target = this.getMixer(mixer);

    if (!target) {
      return;
    }

    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequency * jitter(0.03), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume * jitter(0.05), start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(target);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  private playImpact(frequency: number, duration: number, volume: number): void {
    const context = this.context!;
    const target = this.getMixer("sfx");

    if (!target) {
      return;
    }

    const start = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency * jitter(0.03), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(22, frequency * 0.42), start + duration);
    filter.type = "lowpass";
    filter.frequency.value = 520;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume * jitter(0.05), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(target);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private playWhoosh(duration: number, volume: number): void {
    this.playNoise(duration, volume, 680, "bandpass", "sfx");
    this.playNoise(duration * 0.72, volume * 0.34, 110, "lowpass", "sfx", 0.03);
  }

  private playDiceRoll(): void {
    this.playNoise(0.23, 0.32, 1400, "bandpass", "sfx");
    this.playBell(180, 0.08, 0.08, "sfx", 0.03);
    this.playBell(240, 0.08, 0.08, "sfx", 0.1);
    this.playBell(150, 0.1, 0.06, "sfx", 0.18);
  }

  private startAmbientBed(): void {
    if (!this.context || this.ambientGain) {
      return;
    }

    const target = this.getMixer("ambient");

    if (!target) {
      return;
    }

    this.ambientGain = this.context.createGain();
    this.ambientGain.gain.value = 0.18;
    this.ambientGain.connect(target);

    [48, 71].forEach((frequency) => {
      const osc = this.context!.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.connect(this.ambientGain!);
      osc.start();
      this.ambientNodes.push(osc);
    });
  }

  private startMusicBed(state: AshenReachMusicState): void {
    const context = this.context!;
    const target = this.getMixer("music");

    if (!target) {
      return;
    }

    const profiles: Record<Exclude<AshenReachMusicState, "silent">, { frequencies: number[]; gain: number }> = {
      exploration: { frequencies: [55, 82.5], gain: 0.12 },
      combat: { frequencies: [44, 66, 132], gain: 0.18 },
      boss: { frequencies: [36, 54, 108], gain: 0.2 },
      victory: { frequencies: [73.4, 110, 146.8], gain: 0.15 },
      defeat: { frequencies: [41.2, 55, 77.8], gain: 0.16 }
    };
    const profile = profiles[state === "silent" ? "exploration" : state];

    this.musicGain = context.createGain();
    this.musicGain.gain.setValueAtTime(0.0001, context.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(profile.gain, context.currentTime + 0.45);
    this.musicGain.connect(target);

    profile.frequencies.forEach((frequency) => {
      const osc = context.createOscillator();
      osc.type = state === "combat" || state === "boss" ? "sawtooth" : "sine";
      osc.frequency.value = frequency;
      osc.detune.value = (Math.random() * 2 - 1) * 5;
      osc.connect(this.musicGain!);
      osc.start();
      this.musicNodes.push(osc);
    });
  }

  private stopMusicBed(): void {
    if (!this.context || !this.musicGain) {
      this.musicNodes = [];
      return;
    }

    const stopAt = this.context.currentTime + 0.36;
    this.musicGain.gain.cancelScheduledValues(this.context.currentTime);
    this.musicGain.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.08);

    this.musicNodes.forEach((node) => {
      try {
        node.stop(stopAt);
      } catch {
        // Already stopped.
      }
    });

    this.musicNodes = [];
    this.musicGain = null;
  }
}
