import type { ReactElement } from "react";
import { getPhoneBackgroundPath } from "../shared/assetPaths.js";
import type { CharacterCatalogEntry, ClientIntent, ContractCard, PhonePatchPayload, PhoneSelfState } from "../shared/types.js";

interface PortraitControllerViewProps {
  self: PhoneSelfState | null;
  roomCode: string;
  displayName: string;
  connectionStatus: string;
  activeSeatId: string | null;
  activeContractCard: ContractCard | null;
  patch: PhonePatchPayload | null;
  characters: CharacterCatalogEntry[];
  onIntent: ((intent: ClientIntent) => void) | null;
  onLeave: () => void;
}

export function PortraitControllerView({
  self,
  roomCode,
  displayName,
  connectionStatus,
  activeSeatId
}: PortraitControllerViewProps): ReactElement {
  if (!self) {
    return (
      <section
        className="phone-portrait-controller phone-portrait-controller-empty"
        style={{ backgroundImage: `url(${getPhoneBackgroundPath()})` }}
      >
        <div className="phone-portrait-panel">
          <p className="phone-panel-kicker">Ashen Reach Controller</p>
          <h1>Connecting...</h1>
          <p className="phone-muted-copy">Syncing the latest character state for your seat.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="phone-portrait-controller" style={{ backgroundImage: `url(${getPhoneBackgroundPath()})` }}>
      <div className="phone-portrait-panel phone-portrait-panel-limited">
        <div className="phone-portrait-topline">
          <div>
            <p className="phone-panel-kicker">Seat {self.seatId}</p>
            <h1>{self.character.name}</h1>
            <p className="phone-muted-copy">{self.character.archetype}</p>
          </div>
        </div>

        <div className="phone-portrait-chip-row">
          <span>{roomCode}</span>
          <span>{displayName}</span>
          <span>{connectionStatus}</span>
          <span>{activeSeatId === self.seatId ? "Active Turn" : "Standby"}</span>
        </div>

        <p className="phone-portrait-rotate-hint">Rotate to landscape for the full character card.</p>
      </div>
    </section>
  );
}
