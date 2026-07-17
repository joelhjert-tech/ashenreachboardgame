import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicPatchPayload, StatePatch } from "../shared/types.js";
import { AshenReachAudioManager, type AshenReachMixer, type AudioSettingsSnapshot } from "./AshenReachAudioManager.js";
import { getAshenReachAudioCues, getAshenReachMusicState } from "./audioEventSelectors.js";

export interface AshenReachAudioController {
  settings: AudioSettingsSnapshot;
  available: boolean;
  unlocked: boolean;
  unlock: () => void;
  setVolume: (mixer: AshenReachMixer, volume: number) => void;
  toggleMute: (mixer: AshenReachMixer) => void;
}

function canUseAudioApi(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
}

export function useAshenReachAudio(patch: StatePatch<PublicPatchPayload> | null): AshenReachAudioController {
  const manager = useMemo(() => new AshenReachAudioManager(), []);
  const previousPatchRef = useRef<StatePatch<PublicPatchPayload> | null>(null);
  const [settings, setSettings] = useState<AudioSettingsSnapshot>(() => manager.getSettings());
  const [available] = useState(() => canUseAudioApi());
  const [unlocked, setUnlocked] = useState(false);

  const unlock = () => {
    if (!available) {
      return;
    }

    const started = manager.ensureStarted();

    if (started) {
      setUnlocked(true);
      manager.setMusicState(getAshenReachMusicState(patch));
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onFirstGesture = () => {
      unlock();
    };

    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, [manager, patch]);

  useEffect(() => {
    if (!unlocked) {
      previousPatchRef.current = patch;
      return;
    }

    manager.setMusicState(getAshenReachMusicState(patch));

    for (const cue of getAshenReachAudioCues(previousPatchRef.current, patch)) {
      manager.play(cue);
    }

    previousPatchRef.current = patch;
  }, [manager, patch, unlocked]);

  return {
    settings,
    available,
    unlocked,
    unlock,
    setVolume: (mixer, volume) => {
      manager.setMixerVolume(mixer, volume);
      setSettings(manager.getSettings());
    },
    toggleMute: (mixer) => {
      manager.setMixerMuted(mixer, !settings[mixer].muted);
      setSettings(manager.getSettings());
    }
  };
}
