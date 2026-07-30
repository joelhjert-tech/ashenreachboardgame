import {
  useEffect,
  useRef,
  useState,
  type ReactElement
} from "react";
import { getHostGameIntroVideoPath } from "../shared/assetPaths.js";
import { useReducedMotion } from "../shared/useReducedMotion.js";
import "./HostGameIntro.css";

interface HostGameIntroProps {
  onComplete: () => void;
}

const exitDurationMs = 320;

export function HostGameIntro({ onComplete }: HostGameIntroProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const playbackAttemptedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const [autoplayMuted, setAutoplayMuted] = useState(false);
  const [manualStartRequired, setManualStartRequired] = useState(false);
  const [exiting, setExiting] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!reducedMotion || completedRef.current) {
      return;
    }

    completedRef.current = true;
    onCompleteRef.current();
  }, [reducedMotion]);

  useEffect(() => () => {
    if (completionTimerRef.current !== null) {
      window.clearTimeout(completionTimerRef.current);
    }
    videoRef.current?.pause();
  }, []);

  const complete = (immediate = false) => {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    if (immediate) {
      onCompleteRef.current();
      return;
    }

    setExiting(true);
    completionTimerRef.current = window.setTimeout(
      () => onCompleteRef.current(),
      exitDurationMs
    );
  };

  const startPlayback = async (video: HTMLVideoElement) => {
    if (playbackAttemptedRef.current || completedRef.current) {
      return;
    }

    playbackAttemptedRef.current = true;
    video.muted = false;

    try {
      await video.play();
    } catch {
      video.muted = true;
      setAutoplayMuted(true);

      try {
        await video.play();
      } catch {
        setManualStartRequired(true);
      }
    }
  };

  const enableSound = async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = false;
    setAutoplayMuted(false);
    setManualStartRequired(false);

    try {
      await video.play();
    } catch {
      video.muted = true;
      setAutoplayMuted(true);
    }
  };

  return (
    <section
      className={`host-game-intro${exiting ? " host-game-intro--exiting" : ""}`}
      data-testid="host-game-intro"
      role="dialog"
      aria-modal="true"
      aria-label="Ashen Reach opening transmission"
    >
      <video
        ref={videoRef}
        className="host-game-intro__video"
        data-testid="host-game-intro-video"
        src={getHostGameIntroVideoPath()}
        autoPlay
        playsInline
        preload="auto"
        disablePictureInPicture
        controls={false}
        onCanPlay={(event) => void startPlayback(event.currentTarget)}
        onEnded={() => complete()}
        onError={() => complete(true)}
      />

      <div className="host-game-intro__frame" aria-hidden="true" />

      <header className="host-game-intro__status">
        <span>Opening transmission</span>
        <strong>Ashen Reach</strong>
        <small>Signal Theatre follows</small>
      </header>

      <button
        type="button"
        className="host-game-intro__skip"
        onClick={() => complete()}
      >
        Skip intro
      </button>

      {autoplayMuted && !manualStartRequired ? (
        <button
          type="button"
          className="host-game-intro__sound"
          onClick={() => void enableSound()}
        >
          Enable sound
        </button>
      ) : null}

      {manualStartRequired ? (
        <div className="host-game-intro__manual" role="status" aria-live="polite">
          <span>Transmission ready</span>
          <button type="button" onClick={() => void enableSound()}>
            Begin transmission
          </button>
        </div>
      ) : null}
    </section>
  );
}
