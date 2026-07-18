import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { AshenReachMixer } from "./AshenReachAudioManager.js";
import type { AshenReachAudioController } from "./useAshenReachAudio.js";

const mixerLabels: Array<{ id: AshenReachMixer; label: string }> = [
  { id: "music", label: "Music" },
  { id: "sfx", label: "Effects" },
  { id: "ambient", label: "Ambient" }
];

const soundtrackStorageKey = "ashenreach.hostSoundtrackUrl";

export function getYouTubeVideoId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let candidate: string | null = null;

    if (host === "youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      candidate = url.searchParams.get("v");
      if (!candidate) {
        const segments = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(segments[0] ?? "")) {
          candidate = segments[1] ?? null;
        }
      }
    }

    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

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
  const [soundtrackUrl, setSoundtrackUrl] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(soundtrackStorageKey) ?? ""
  );
  const [connectedVideoId, setConnectedVideoId] = useState<string | null>(null);
  const [soundtrackError, setSoundtrackError] = useState<string | null>(null);
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

  const connectSoundtrack = () => {
    const videoId = getYouTubeVideoId(soundtrackUrl);
    if (!videoId) {
      setSoundtrackError("Enter a valid YouTube video link.");
      return;
    }

    window.localStorage.setItem(soundtrackStorageKey, soundtrackUrl.trim());
    setSoundtrackError(null);
    setConnectedVideoId(videoId);
  };

  const disconnectSoundtrack = () => {
    setConnectedVideoId(null);
    setSoundtrackError(null);
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

          <section className="tv-audio-soundtrack" aria-label="YouTube background ambience">
            <div>
              <span>Table soundtrack</span>
              <small>Paste a YouTube link chosen by the players. Playback stays on this host display.</small>
            </div>
            <label>
              <span>YouTube link</span>
              <input
                type="url"
                value={soundtrackUrl}
                placeholder="https://youtube.com/watch?v=..."
                onChange={(event) => {
                  setSoundtrackUrl(event.currentTarget.value);
                  setSoundtrackError(null);
                }}
              />
            </label>
            {soundtrackError ? <p role="alert">{soundtrackError}</p> : null}
            <div className="tv-audio-soundtrack-actions">
              <button type="button" onClick={connectSoundtrack}>
                {connectedVideoId ? "Change soundtrack" : "Connect soundtrack"}
              </button>
              {connectedVideoId ? <button type="button" onClick={disconnectSoundtrack}>Stop</button> : null}
            </div>
            {connectedVideoId ? (
              <iframe
                className="tv-audio-youtube-player"
                title="Ashen Reach table soundtrack"
                src={`https://www.youtube-nocookie.com/embed/${connectedVideoId}?autoplay=1&loop=1&playlist=${connectedVideoId}`}
                allow="autoplay; encrypted-media"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : null}
          </section>

          <button type="button" className="tv-audio-enable" onClick={audio.unlock} disabled={!audio.available || audio.unlocked}>
            {!audio.available ? "Audio unavailable" : audio.unlocked ? "Audio ready" : "Enable audio"}
          </button>
        </div>
      )}
    </section>
  );
}
