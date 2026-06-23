import type { ReactElement } from "react";
import { getCharacterPortraitPath, getPhoneBackgroundPath } from "../shared/assetPaths.js";
import type { CharacterCatalogEntry, ClientIntent, ContractCard, PhonePatchPayload, PhoneSelfState } from "../shared/types.js";
import { PhoneActionPanel } from "./PhoneActionPanel.js";

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
  activeSeatId,
  activeContractCard,
  patch,
  characters,
  onIntent,
  onLeave
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
      <div className="phone-portrait-panel">
        <div className="phone-portrait-topline">
          <div>
            <p className="phone-panel-kicker">Seat {self.seatId}</p>
            <h1>{self.character.name}</h1>
            <p className="phone-muted-copy">{self.character.archetype}</p>
          </div>
          <button type="button" className="phone-button phone-button-secondary phone-portrait-leave-button" onClick={onLeave}>
            Leave
          </button>
        </div>

        <div className="phone-portrait-chip-row">
          <span>{roomCode}</span>
          <span>{displayName}</span>
          <span>{connectionStatus}</span>
          <span>{activeSeatId === self.seatId ? "Active Turn" : "Standby"}</span>
        </div>

        <div className="phone-portrait-body">
          <div className="phone-portrait-art">
            <img src={getCharacterPortraitPath(self.character.id)} alt={self.character.name} />
          </div>
          <div className="phone-portrait-stats">
            <div className="phone-portrait-vitals" aria-label="Character vitals">
              <span>Heat {self.character.heat}</span>
              <span>Wounds {self.character.wounds}</span>
              <span>{self.character.status}</span>
            </div>
            <div className="phone-portrait-attributes" aria-label="Character stats">
              {Object.entries(self.character.stats).map(([stat, value]) => (
                <div key={stat}>
                  <strong>{value}</strong>
                  <span>{stat}</span>
                </div>
              ))}
            </div>
            <div className="phone-portrait-summary">
              <p>
                <strong>Contract</strong>
                <span>{activeContractCard?.name ?? "No active contract"}</span>
              </p>
              <p>
                <strong>Gear</strong>
                <span>{self.character.heldGear.map((item) => item.name).join(", ") || "No held gear"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="phone-portrait-actions">
          {patch && onIntent ? (
            <PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />
          ) : (
            <p className="phone-muted-copy">Actions appear when the room syncs.</p>
          )}
        </div>
      </div>
    </section>
  );
}
