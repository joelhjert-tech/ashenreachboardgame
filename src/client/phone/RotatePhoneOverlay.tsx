import type { ReactElement } from "react";
import { getPhoneBackgroundPath } from "../shared/assetPaths.js";

interface RotatePhoneOverlayProps {
  playerName: string;
  roomCode: string;
  connectionStatus: string;
  phaseStatus: string;
}

export function RotatePhoneOverlay({
  playerName,
  roomCode,
  connectionStatus,
  phaseStatus
}: RotatePhoneOverlayProps): ReactElement {
  return (
    <section className="rotate-overlay" aria-live="polite">
      <div className="rotate-overlay-card" style={{ backgroundImage: `url(${getPhoneBackgroundPath()})` }}>
        <div className="rotate-overlay-panel">
          <p className="rotate-overlay-kicker">Limited Portrait View</p>
          <h1>{playerName}</h1>
          <div className="rotate-overlay-meta">
            <p>
              <span>Room</span>
              <strong>{roomCode}</strong>
            </p>
            <p>
              <span>Connection</span>
              <strong>{connectionStatus}</strong>
            </p>
            <p>
              <span>Status</span>
              <strong>{phaseStatus}</strong>
            </p>
          </div>
          <p className="rotate-overlay-message">Flip phone to landscape for full controls</p>
        </div>
        <div className="rotate-overlay-hint" aria-hidden="true">
          <span className="rotate-overlay-arrow">TURN</span>
          <span>Rotate device</span>
        </div>
      </div>
    </section>
  );
}
