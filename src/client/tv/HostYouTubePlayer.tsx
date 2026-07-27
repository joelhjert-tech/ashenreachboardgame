import { useEffect, useRef, useState, type ReactElement } from "react";
import "./HostYouTubePlayer.css";

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
    } else if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
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

function YouTubeIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2 31 31 0 0 0 2.6 12 31 31 0 0 0 3 15.8a3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.8 31 31 0 0 0-.4-3.8Z" />
      <path d="m10 9 5 3-5 3V9Z" />
    </svg>
  );
}

export function HostYouTubePlayer(): ReactElement {
  const storedUrl = typeof window === "undefined"
    ? ""
    : window.localStorage.getItem(soundtrackStorageKey) ?? "";
  const [open, setOpen] = useState(false);
  const controlsRef = useRef<HTMLElement | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState(storedUrl);
  const [connectedVideoId, setConnectedVideoId] = useState<string | null>(() => getYouTubeVideoId(storedUrl));
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const connectVideo = () => {
    const videoId = getYouTubeVideoId(youtubeUrl);
    if (!videoId) {
      setYoutubeError("Enter a valid YouTube video link.");
      return;
    }

    window.localStorage.setItem(soundtrackStorageKey, youtubeUrl.trim());
    setConnectedVideoId(videoId);
    setYoutubeError(null);
    setOpen(false);
  };

  const disconnectVideo = () => {
    window.localStorage.removeItem(soundtrackStorageKey);
    setConnectedVideoId(null);
    setYoutubeError(null);
    setOpen(false);
  };

  return (
    <section
      className={`host-youtube-player${connectedVideoId ? " is-connected" : ""}`}
      aria-label="YouTube table video"
      ref={controlsRef}
    >
      {connectedVideoId ? (
        <div className="host-youtube-player__viewport">
          <div className="host-youtube-player__frame-label" aria-hidden="true">
            <span>External relay</span>
            <strong>YouTube</strong>
          </div>
          <iframe
            title="Ashen Reach YouTube table video"
            src={`https://www.youtube-nocookie.com/embed/${connectedVideoId}?autoplay=1&loop=1&playlist=${connectedVideoId}&playsinline=1&rel=0`}
            width="560"
            height="315"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : null}

      <button
        type="button"
        className="host-youtube-player__toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="host-youtube-connector"
        aria-label={connectedVideoId ? "Change connected YouTube video" : "Connect a YouTube video"}
      >
        <YouTubeIcon />
        <span>{connectedVideoId ? "YouTube connected" : "Connect YouTube"}</span>
      </button>

      {open ? (
        <div
          className="host-youtube-player__connector"
          id="host-youtube-connector"
          role="dialog"
          aria-label="YouTube connection"
        >
          <header>
            <div>
              <span>External table relay</span>
              <strong>YouTube video</strong>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close YouTube connection">
              Close
            </button>
          </header>
          <label>
            <span>YouTube link</span>
            <input
              type="url"
              value={youtubeUrl}
              placeholder="https://youtube.com/watch?v=..."
              onChange={(event) => {
                setYoutubeUrl(event.currentTarget.value);
                setYoutubeError(null);
              }}
            />
          </label>
          {youtubeError ? <p role="alert">{youtubeError}</p> : null}
          <div className="host-youtube-player__actions">
            <button type="button" onClick={connectVideo}>
              {connectedVideoId ? "Change video" : "Connect video"}
            </button>
            {connectedVideoId ? (
              <button type="button" onClick={disconnectVideo}>Disconnect</button>
            ) : null}
          </div>
          <small>The selected YouTube video plays only on this Host TV.</small>
        </div>
      ) : null}
    </section>
  );
}
