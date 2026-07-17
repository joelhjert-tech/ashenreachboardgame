import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { AshenReachMixer } from "./AshenReachAudioManager.js";
import type { AshenReachAudioController } from "./useAshenReachAudio.js";

const mixerLabels: Array<{ id: AshenReachMixer; label: string }> = [
  { id: "music", label: "Music" },
  { id: "sfx", label: "Effects" },
  { id: "ambient", label: "Ambient" }
];

function AudioIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M16 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

export function HostAudioControls({ audio }: { audio: AshenReachAudioController }): ReactElement {
  const [open, setOpen] = useState(false);
  const controlsRef = useRef<HTMLElement | null>(null);
  const mixers = mixerLabels.map((mixer) => audio.settings[mixer.id]);
  const allMuted = mixers.every((setting) => setting.muted);
  const masterVolume = useMemo(() => mixers.reduce((sum, setting) => sum + setting.volume, 0) / mixers.length, [mixers]);
  const status = !audio.available ? "unavailable" : allMuted ? "muted" : audio.unlocked ? "playing" : "off";
  const statusLabel = !audio.available ? "Unavailable" : allMuted ? "Muted" : audio.unlocked ? "Playing" : "Off";

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (controlsRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);

    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const setMasterVolume = (volume: number) => {
    for (const mixer of mixerLabels) {
      audio.setVolume(mixer.id, volume);
    }
  };

  const toggleMasterMute = () => {
    const shouldMute = !allMuted;

    for (const mixer of mixerLabels) {
      if (audio.settings[mixer.id].muted !== shouldMute) {
        audio.toggleMute(mixer.id);
      }
    }
  };

  return (
    <section className="tv-audio-controls" aria-label="Audio controls" ref={controlsRef}>
      <button
        type="button"
        className={`tv-audio-toggle tv-audio-toggle-${status}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="host-audio-popover"
        aria-label={`Open audio controls. Status: ${statusLabel}`}
      >
        <AudioIcon />
        <span className="tv-audio-status-dot" aria-hidden="true" />
        <span className="tv-audio-toggle-text">{statusLabel}</span>
      </button>

      {open && (
        <div className="tv-audio-popover" id="host-audio-popover" role="dialog" aria-label="Audio control panel">
          <div className="tv-audio-controls-header">
            <div>
              <span>Audio control</span>
              <strong>{statusLabel}</strong>
            </div>
            <button type="button" className="tv-audio-close" onClick={() => setOpen(false)} aria-label="Close audio controls">
              Close
            </button>
          </div>

          <div className="tv-audio-mixers">
            <label className="tv-audio-mixer-row">
              <span>Master</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterVolume}
                disabled={!audio.available}
                onChange={(event) => setMasterVolume(Number(event.currentTarget.value))}
                aria-label="Master volume"
              />
              <button type="button" onClick={toggleMasterMute} aria-pressed={allMuted} disabled={!audio.available}>
                {allMuted ? "Muted" : "On"}
              </button>
            </label>

            {mixerLabels.map((mixer) => {
              const setting = audio.settings[mixer.id];

              return (
                <label key={mixer.id} className="tv-audio-mixer-row">
                  <span>{mixer.label}</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={setting.volume}
                    disabled={!audio.available}
                    onChange={(event) => audio.setVolume(mixer.id, Number(event.currentTarget.value))}
                    aria-label={`${mixer.label} volume`}
                  />
                  <button type="button" onClick={() => audio.toggleMute(mixer.id)} aria-pressed={setting.muted} disabled={!audio.available}>
                    {setting.muted ? "Muted" : "On"}
                  </button>
                </label>
              );
            })}
          </div>

          <button type="button" className="tv-audio-enable" onClick={audio.unlock} disabled={!audio.available || audio.unlocked}>
            {!audio.available ? "Audio unavailable" : audio.unlocked ? "Audio ready" : "Enable audio"}
          </button>
        </div>
      )}
    </section>
  );
}
