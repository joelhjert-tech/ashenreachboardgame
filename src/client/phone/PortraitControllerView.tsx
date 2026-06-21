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

function toTitleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
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

  const portraitPath = getCharacterPortraitPath(self.character.id);
  const contractCopy = activeContractCard
    ? `${activeContractCard.name} (${self.character.activeContract?.progress ?? 0}/${activeContractCard.objective.target})`
    : "No active contract";
  const abilityCopy = self.character.abilities[0]?.name ?? "No ability active";

  return (
    <section className="phone-portrait-controller" style={{ backgroundImage: `url(${getPhoneBackgroundPath()})` }}>
      <div className="phone-portrait-panel">
        <div className="phone-portrait-topline">
          <div>
            <p className="phone-panel-kicker">Seat {self.seatId}</p>
            <h1>{self.character.name}</h1>
            <p className="phone-muted-copy">{self.character.archetype}</p>
          </div>
          <button type="button" className="phone-button phone-button-secondary" onClick={onLeave}>
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
            <img src={portraitPath} alt={self.character.name} />
          </div>

          <div className="phone-portrait-stats">
            <div className="phone-portrait-vitals">
              <span>Heat {self.character.heat}</span>
              <span>Wounds {self.character.wounds}</span>
              <span>Scars {self.character.scars.length}</span>
            </div>

            <div className="phone-portrait-attributes">
              <div><strong>{self.character.stats.command}</strong><span>CMD</span></div>
              <div><strong>{self.character.stats.grit}</strong><span>GRIT</span></div>
              <div><strong>{self.character.stats.signal}</strong><span>SIGNAL</span></div>
              <div><strong>{self.character.stats.guile}</strong><span>GUILE</span></div>
              <div><strong>{self.character.stats.forge}</strong><span>FORGE</span></div>
            </div>

            <div className="phone-portrait-summary">
              <p><strong>Sector</strong><span>{toTitleCase(self.sectorId)}</span></p>
              <p><strong>Gear</strong><span>{Object.values(self.character.equippedGear).filter(Boolean).join(", ") || "No gear equipped"}</span></p>
              <p><strong>Contract</strong><span>{contractCopy}</span></p>
              <p><strong>Ability</strong><span>{abilityCopy}</span></p>
            </div>
          </div>
        </div>

        <div className="phone-portrait-actions">
          {patch && onIntent ? (
            <PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />
          ) : (
            <p className="phone-sheet-action-copy">Syncing quick actions...</p>
          )}
        </div>

        <p className="phone-portrait-rotate-hint">Rotate to landscape for the full character card.</p>
      </div>
    </section>
  );
}
