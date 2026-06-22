import type { ReactElement, ReactNode } from "react";
import { getCharacterPortraitPath, getPhoneSheetFramePath } from "../shared/assetPaths.js";
import type { AbilityChangeItem } from "../shared/abilityTelemetry.js";
import type {
  ActiveScenarioSummary,
  ContractCard,
  EncounterCard,
  OutcomeSummary,
  PhoneSelfState,
  ScenarioTelemetryItem,
  SessionStatus,
  Stat
} from "../shared/types.js";
import { formatEscalation } from "./formatEscalation.js";

interface MobilePlayerCardProps {
  self: PhoneSelfState;
  activeContractCard: ContractCard | null;
  localOpportunityCopy?: string | null;
  roomCode: string;
  displayName: string;
  connectionStatus: string;
  sessionStatus: SessionStatus | null;
  phase: string;
  activeSeatId: string | null;
  activeScenario: ActiveScenarioSummary | null;
  scenarioTelemetry?: ScenarioTelemetryItem[];
  escalationLevel?: number;
  escalationThreshold?: number;
  escalationModifier?: number;
  encounter: EncounterCard | null;
  outcomeSummary: OutcomeSummary | null;
  latestAbilityTriggerSummary?: string | null;
  abilityChangeItems?: AbilityChangeItem[];
  onLeave: () => void;
  children?: ReactNode;
  className?: string;
}

const statOrder = ["command", "grit", "signal", "guile", "forge"] as const;
const gearOrder = ["weapon", "armor", "utility"] as const;
const resourceTrackSlots = 5;

const statIconById: Record<Stat, string> = {
  command: "Cmd",
  grit: "Grit",
  signal: "Sig",
  guile: "Gui",
  forge: "Forg"
};

function toTitleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildTrack(count: number): boolean[] {
  return Array.from({ length: resourceTrackSlots }, (_, index) => index < count);
}

export function MobilePlayerCard({
  self,
  activeContractCard,
  localOpportunityCopy = null,
  roomCode,
  displayName,
  connectionStatus,
  sessionStatus,
  phase,
  activeSeatId,
  activeScenario,
  scenarioTelemetry = [],
  escalationLevel = 0,
  escalationThreshold = 6,
  escalationModifier = 0,
  encounter,
  outcomeSummary,
  latestAbilityTriggerSummary = null,
  abilityChangeItems = [],
  onLeave,
  children,
  className
}: MobilePlayerCardProps): ReactElement {
  const portraitPath = getCharacterPortraitPath(self.character.id);
  const framePath = getPhoneSheetFramePath();
  const heatTrack = buildTrack(self.character.heat);
  const woundTrack = buildTrack(self.character.wounds);
  const latestOutcome = outcomeSummary?.seatId === self.seatId ? outcomeSummary.summary : null;
  const contractCopy = activeContractCard
    ? `${activeContractCard.name} (${self.character.activeContract?.progress ?? 0}/${activeContractCard.objective.target})`
    : "No active contract";
  const encounterCopy = encounter
    ? `${encounter.title} | ${toTitleCase(encounter.cardType)} | ${toTitleCase(encounter.stat)} ${encounter.difficulty}`
    : `Phase ${toTitleCase(phase)}`;
  const scenarioCopy = activeScenario
    ? `${activeScenario.name} | ${activeScenario.confrontationTitle} | ${activeScenario.progress}/${activeScenario.threshold}`
    : "Scenario telemetry pending";
  const scenarioTelemetryCopy =
    scenarioTelemetry.length > 0
      ? scenarioTelemetry.map((entry) => `${entry.label}: ${entry.value}`).join(" | ")
      : "Awaiting ambient scenario telemetry";
  const escalationCopy = formatEscalation({ escalationLevel, escalationThreshold, escalationModifier });

  return (
    <section
      className={`mobile-player-card phone-sheet-card${className ? ` ${className}` : ""}`}
      aria-label={`${self.character.name} player card`}
    >
      <img className="mobile-player-card-frame phone-sheet-frame" src={framePath} alt="" aria-hidden="true" />

      <div className="phone-sheet-topbar" aria-label="Controller status">
        <div className="phone-sheet-identity-chip">
          <span>{roomCode}</span>
          <strong>{displayName}</strong>
        </div>

        <div className="phone-sheet-medallion-row">
          <div className="phone-sheet-medallion">
            <span>Seat</span>
            <strong>{self.seatId}</strong>
          </div>
          <div className="phone-sheet-medallion">
            <span>Active</span>
            <strong>{activeSeatId ?? "Standby"}</strong>
          </div>
          <div className="phone-sheet-medallion">
            <span>Phase</span>
            <strong>{toTitleCase(phase)}</strong>
          </div>
          <div className="phone-sheet-medallion">
            <span>Link</span>
            <strong>{connectionStatus}</strong>
          </div>
          <div className="phone-sheet-medallion">
            <span>Session</span>
            <strong>{sessionStatus ? toTitleCase(sessionStatus) : "Syncing"}</strong>
          </div>
        </div>

        <div className="phone-sheet-resource-stack">
          <div className="phone-sheet-track">
            <span>Heat</span>
            <div className="phone-sheet-track-pips">
              {heatTrack.map((filled, index) => (
                <span key={`heat-${index}`} className={filled ? "phone-sheet-pip phone-sheet-pip-filled" : "phone-sheet-pip"} />
              ))}
            </div>
          </div>
          <div className="phone-sheet-track">
            <span>Wounds</span>
            <div className="phone-sheet-track-pips">
              {woundTrack.map((filled, index) => (
                <span key={`wounds-${index}`} className={filled ? "phone-sheet-pip phone-sheet-pip-alert" : "phone-sheet-pip"} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="phone-sheet-layout">
        <aside className="phone-sheet-left">
          <div className="mobile-player-card-portrait-shell phone-sheet-portrait-shell">
            <img className="mobile-player-card-portrait phone-sheet-portrait" src={portraitPath} alt={self.character.name} />
          </div>
          <button type="button" className="phone-button phone-button-secondary phone-sheet-leave-button" onClick={onLeave}>
            Leave Seat
          </button>
        </aside>

        <section className="phone-sheet-center">
          <div className="mobile-player-card-title phone-sheet-title">
            <p className="mobile-player-card-kicker">{self.character.archetype}</p>
            <h2>{self.character.name}</h2>
            <p className="mobile-player-card-subtitle">Sector {toTitleCase(self.sectorId)}</p>
          </div>

          <div className="phone-sheet-vitals">
            <div className="phone-sheet-vital-card">
              <span>Heat</span>
              <strong>{self.character.heat}</strong>
            </div>
            <div className="phone-sheet-vital-card">
              <span>Wounds</span>
              <strong>{self.character.wounds}</strong>
            </div>
            <div className="phone-sheet-vital-card">
              <span>Status</span>
              <strong>{toTitleCase(self.character.status)}</strong>
            </div>
          </div>

          <div className="phone-sheet-section">
            <div className="phone-sheet-section-heading">Attributes</div>
            <div className="mobile-player-card-stats phone-sheet-stat-grid">
              {statOrder.map((stat) => (
                <div key={stat} className="mobile-player-stat phone-sheet-stat-card">
                  <span>{statIconById[stat]}</span>
                  <strong>{self.character.stats[stat]}</strong>
                  <p>{toTitleCase(stat)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="phone-sheet-vital-strip">
            <span>{encounterCopy}</span>
            {latestOutcome && <strong>{latestOutcome}</strong>}
          </div>

          {(latestAbilityTriggerSummary || abilityChangeItems.length > 0) && (
            <div className="phone-sheet-trigger-panel">
              <div className="phone-sheet-trigger-header">
                <span>Triggered ability</span>
                {abilityChangeItems.length > 0 && (
                  <div className="phone-sheet-trigger-changes">
                    {abilityChangeItems.map((item) => (
                      <span key={`${item.label}-${item.value}`} className={`phone-sheet-trigger-chip phone-sheet-trigger-chip-${item.tone}`}>
                        {item.label} {item.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {latestAbilityTriggerSummary && <strong className="phone-sheet-trigger-copy">{latestAbilityTriggerSummary}</strong>}
            </div>
          )}

          <div className="phone-sheet-vital-strip">
            <span>{scenarioCopy}</span>
          </div>

          <div className="phone-sheet-vital-strip phone-sheet-vital-strip-ambient">
            <span>{scenarioTelemetryCopy}</span>
          </div>

          <div className="phone-sheet-vital-strip">
            <span>{escalationCopy}</span>
          </div>

          {localOpportunityCopy && (
            <div className="phone-sheet-vital-strip phone-sheet-vital-strip-ambient">
              <span>{localOpportunityCopy}</span>
            </div>
          )}

          <div className="phone-sheet-section">
            <div className="phone-sheet-section-heading">Equipped Gear</div>
            <div className="phone-sheet-gear-grid">
              {gearOrder.map((slot) => (
                <article key={slot} className="phone-sheet-gear-slot">
                  <span>{toTitleCase(slot)}</span>
                  <strong>{self.character.equippedGear[slot] ?? "Empty"}</strong>
                </article>
              ))}
              <article className="phone-sheet-gear-slot">
                <span>Held</span>
                <strong>{self.character.heldGear.map((item) => item.name).join(", ") || "None"}</strong>
              </article>
              <article className="phone-sheet-gear-slot">
                <span>Effects</span>
                <strong>{self.character.scars.join(", ") || self.notes.join(", ") || "Stable"}</strong>
              </article>
            </div>
          </div>
        </section>

        <aside className="phone-sheet-right">
          <div className="phone-sheet-section">
            <div className="phone-sheet-section-heading">Special Abilities</div>
            <div className="phone-sheet-ability-list">
              {self.character.abilities.length > 0 ? (
                self.character.abilities.slice(0, 4).map((ability, index) => (
                  <article key={ability.id} className="phone-sheet-ability-card">
                    <div className="phone-sheet-ability-icon">{index + 1}</div>
                    <div className="phone-sheet-ability-copy">
                      <h3>{ability.name}</h3>
                      <p>{ability.text}</p>
                    </div>
                  </article>
                ))
              ) : (
                Array.from({ length: 4 }, (_, index) => (
                  <article key={`empty-ability-${index}`} className="phone-sheet-ability-card phone-sheet-ability-card-empty">
                    <div className="phone-sheet-ability-icon">{index + 1}</div>
                    <div className="phone-sheet-ability-copy">
                      <h3>Ability Slot {index + 1}</h3>
                      <p>Awaiting ability data for this operative.</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="phone-sheet-section phone-sheet-contract-section">
            <div className="phone-sheet-section-heading">Active Contract</div>
            <div className="phone-sheet-contract-card">
              <p>{contractCopy}</p>
              {activeContractCard && <span>{activeContractCard.text}</span>}
            </div>
          </div>
        </aside>
      </div>

      <div className="phone-sheet-bottom">{children}</div>
    </section>
  );
}
