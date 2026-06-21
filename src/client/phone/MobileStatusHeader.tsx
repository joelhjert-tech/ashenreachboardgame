import type { ReactElement } from "react";
import type { PhoneSelfState, SessionStatus } from "../shared/types.js";

interface MobileStatusHeaderProps {
  roomCode: string;
  status: string;
  displayName: string;
  self: PhoneSelfState | null;
  sessionStatus: SessionStatus | null;
  onLeave: () => void;
}

export function MobileStatusHeader({
  roomCode,
  status,
  displayName,
  self,
  sessionStatus,
  onLeave
}: MobileStatusHeaderProps): ReactElement {
  return (
    <header className="phone-status-header">
      <div className="phone-status-header-copy">
        <h1>{displayName}</h1>
        <div className="phone-status-chips">
          <span className="phone-status-chip">Room {roomCode}</span>
          <span className="phone-status-chip">Connection {status}</span>
          {sessionStatus && <span className="phone-status-chip">Session {sessionStatus}</span>}
          {self && <span className="phone-status-chip">Sector {self.sectorId}</span>}
        </div>
      </div>
      <button type="button" className="phone-button phone-button-secondary phone-leave-button" onClick={onLeave}>
        Leave seat
      </button>
    </header>
  );
}
