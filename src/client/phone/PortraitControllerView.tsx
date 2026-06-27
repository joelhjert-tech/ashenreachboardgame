import { useState, type ReactElement } from "react";
import { getCharacterPortraitPath, getPhoneBackgroundPath } from "../shared/assetPaths.js";
import type { CharacterCatalogEntry, ClientIntent, ContractCard, PhonePatchPayload, PhoneSelfState } from "../shared/types.js";
import { PhoneInventoryPanel } from "./PhoneInventoryPanel.js";
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
  onLobbyBack?: () => void;
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
  onLeave,
  onLobbyBack
}: PortraitControllerViewProps): ReactElement {
  const [activeTab, setActiveTab] = useState<"player" | "inventory" | "quests" | "log">("player");

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

  const activeScenario = patch?.activeScenario ?? null;
  const ownSeat = patch?.seats.find((seat) => seat.seatId === self.seatId) ?? null;
  const activeContractProgress = activeContractCard && self.character.activeContract
    ? `${self.character.activeContract.progress}`
    : null;
  const notes = self.notes ?? [];
  const latestOutcome = patch?.outcomeSummary ?? null;

  if (patch?.status === "lobby") {
    const isReady = ownSeat?.ready ?? false;
    const abilityText = self.character.abilities.map((ability) => `${ability.name}: ${ability.text}`);
    const startingGear = self.character.heldGear;

    return (
      <section className="phone-portrait-controller" style={{ backgroundImage: `url(${getPhoneBackgroundPath()})` }}>
        <div className="phone-portrait-panel">
          <main className="phone-portrait-scroll phone-lobby-waiting-scroll" aria-label="Character waiting">
            <section className="phone-lobby-ready-panel phone-character-waiting-panel">
              <div className="phone-character-waiting-topline">
                <span>{roomCode}</span>
                <span>{displayName}</span>
                <span>{connectionStatus}</span>
              </div>

              <div className="phone-character-waiting-hero">
                <img src={getCharacterPortraitPath(self.character.id)} alt="" />
                <div>
                  <p className="phone-panel-kicker">Character locked</p>
                  <strong>{self.character.name}</strong>
                  <span>{self.character.archetype}</span>
                  <small>{isReady ? "Ready for host start" : "Character selected"}</small>
                </div>
              </div>

              <div className="phone-portrait-attributes" aria-label="Character stats">
                {Object.entries(self.character.stats).map(([stat, value]) => (
                  <div key={stat}>
                    <span>{stat}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <section className="phone-character-waiting-section">
                <h3>Special Abilities</h3>
                {abilityText.length > 0 ? (
                  abilityText.map((ability) => <p key={ability}>{ability}</p>)
                ) : (
                  <p>No special ability text is recorded for this character.</p>
                )}
              </section>

              <section className="phone-character-waiting-section">
                <h3>Starting Equipment</h3>
                {startingGear.length > 0 ? (
                  <div className="phone-character-waiting-gear">
                    {startingGear.map((item) => (
                      <span key={item.id}>{item.name}</span>
                    ))}
                  </div>
                ) : (
                  <p>No starting equipment.</p>
                )}
              </section>

              <p className="phone-lobby-ready-state">Waiting for host to start the game</p>

              {onLobbyBack ? (
                <button type="button" className="phone-button phone-button-secondary phone-lobby-ready-button" onClick={onLobbyBack}>
                  Back
                </button>
              ) : null}
              {onIntent ? (
                <span className="phone-character-waiting-status">{isReady ? "Seat reserved" : "Reservation syncing"}</span>
              ) : (
                <span className="phone-character-waiting-status">Waiting for room sync</span>
              )}
            </section>
          </main>
        </div>
      </section>
    );
  }

  return (
    <section className="phone-portrait-controller" style={{ backgroundImage: `url(${getPhoneBackgroundPath()})` }}>
      <div className="phone-portrait-panel">
        <header className="phone-portrait-header">
          <div className="phone-portrait-header-art">
            <img src={getCharacterPortraitPath(self.character.id)} alt="" />
          </div>
          <div className="phone-portrait-header-copy">
            <span>Seat {self.seatId}</span>
            <h1>{self.character.name}</h1>
            <p>{self.character.archetype}</p>
          </div>
          <div className="phone-portrait-header-vitals" aria-label="Character vitals">
            <span>Health</span>
            <strong>{self.character.wounds} wounds</strong>
            <small>{self.character.heat} heat</small>
          </div>
          <button type="button" className="phone-button phone-button-secondary phone-portrait-leave-button" onClick={onLeave}>
            Leave
          </button>
        </header>

        <main className="phone-portrait-scroll" aria-label="Phone content">
          {activeTab === "player" && (
            <div className="phone-portrait-screen">
              <section className="phone-portrait-hero-card">
                <div className="phone-portrait-art">
                  <img src={getCharacterPortraitPath(self.character.id)} alt={self.character.name} />
                </div>
                <div className="phone-portrait-hero-copy">
                  <p className="phone-panel-kicker">{activeSeatId === self.seatId ? "Active turn" : "Standby"}</p>
                  <h2>{self.character.name}</h2>
                  <p>{self.character.archetype}</p>
                  <div className="phone-portrait-chip-row">
                    <span>{roomCode}</span>
                    <span>{displayName}</span>
                    <span>{connectionStatus}</span>
                    <span>{self.character.status}</span>
                  </div>
                </div>
              </section>

              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Stats</div>
                <div className="phone-portrait-attributes" aria-label="Character stats">
              {Object.entries(self.character.stats).map(([stat, value]) => (
                <div key={stat}>
                  <span>{stat}</span>
                  <strong>{value}</strong>
                </div>
              ))}
                </div>
              </section>

              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Vitals</div>
                <div className="phone-portrait-vitals" aria-label="Character vitals">
                  <span>Heat {self.character.heat}</span>
                  <span>Wounds {self.character.wounds}</span>
                  <span>Trophies {self.character.trophies}</span>
                  <span>Gear {self.character.heldGear.length}</span>
                </div>
              </section>

              {patch && onIntent && (
                <PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />
              )}
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="phone-portrait-screen">
              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Inventory</div>
                {patch && onIntent ? (
                <PhoneInventoryPanel patch={patch} onIntent={onIntent} />
              ) : (
                  <p className="phone-muted-copy">Inventory appears when the room syncs.</p>
              )
                }
              </section>
            </div>
          )}

          {activeTab === "quests" && (
            <div className="phone-portrait-screen">
              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Active Quest</div>
                <article className="phone-portrait-info-card">
                  <strong>{activeContractCard?.name ?? "No active contract"}</strong>
                  <span>{activeContractProgress ? `Progress ${activeContractProgress}` : "No contract progress yet."}</span>
                  <p>{activeContractCard?.text ?? "Accept a contract from the board to track private objectives here."}</p>
                </article>
              </section>
              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Scenario</div>
                <article className="phone-portrait-info-card">
                  <strong>{activeScenario?.name ?? "No active scenario"}</strong>
                  <span>{activeScenario ? `${activeScenario.progress}/${activeScenario.threshold}` : "Awaiting scenario"}</span>
                  <p>{activeScenario?.pressureSummary ?? "Scenario pressure appears here once the host starts the room."}</p>
                </article>
              </section>
            </div>
          )}

          {activeTab === "log" && (
            <div className="phone-portrait-screen">
              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Recent Result</div>
                <article className="phone-portrait-info-card">
                  <strong>{latestOutcome?.encounterTitle ?? "No result yet"}</strong>
                  <span>{latestOutcome?.success === true ? "Success" : latestOutcome?.success === false ? "Failure" : "Waiting"}</span>
                  <p>{latestOutcome?.summary ?? "Rolls, card effects, and private reminders will appear as the turn resolves."}</p>
                </article>
              </section>
              <section className="phone-portrait-section">
                <div className="phone-sheet-section-heading">Notes</div>
                {notes.length > 0 ? (
                  <div className="phone-portrait-log-list">
                    {notes.map((note, index) => (
                      <p key={`${index}-${note}`}>{note}</p>
                    ))}
                  </div>
                ) : (
                  <p className="phone-muted-copy">No private notes yet.</p>
                )}
              </section>
            </div>
          )}
        </main>

        <nav className="phone-portrait-bottom-nav" role="tablist" aria-label="Phone navigation">
          {[
            ["player", "Player Card"],
            ["inventory", "Inventory"],
            ["quests", "Quests"],
            ["log", "Log"]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              className={activeTab === key ? "phone-portrait-tab phone-portrait-tab-active" : "phone-portrait-tab"}
              onClick={() => setActiveTab(key as typeof activeTab)}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
