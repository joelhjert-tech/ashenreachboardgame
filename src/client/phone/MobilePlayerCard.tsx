import type { ReactElement, ReactNode } from "react";
import { describeContractObjective, formatContractObjectiveStatus } from "../../game/contracts/objectives.js";
import { CardArtImage } from "../shared/CardArtImage.js";
import { getCharacterPortraitPath, getPhoneSheetFramePath } from "../shared/assetPaths.js";
import type { AbilityChangeItem } from "../shared/abilityTelemetry.js";
import {
  buildScenarioOutcomeSummary,
  buildScenarioRuleDigest,
  formatScenarioSummaryCopy,
  formatScenarioTelemetryInline
} from "../shared/scenarioPresentation.js";
import type {
  ActiveNemesisSummary,
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
  winnerSeatId?: string | null;
  phase: string;
  activeSeatId: string | null;
  activeNemesis: ActiveNemesisSummary | null;
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
  winnerSeatId = null,
  phase,
  activeSeatId,
  activeNemesis,
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
  const scenarioRuleDigest = buildScenarioRuleDigest(activeScenario, scenarioTelemetry, {
    telemetry: 4,
    specialRules: 2,
    confrontationSteps: 2
  });
  const scenarioOutcome = buildScenarioOutcomeSummary({
    status: sessionStatus,
    winnerSeatId,
    activeSeatId,
    activeScenario,
    seatLabelById: { [self.seatId]: displayName || self.character.name }
  });
  const contractCopy = activeContractCard
    ? activeContractCard.name
    : "No active contract";
  const contractStatusCopy = activeContractCard
    ? formatContractObjectiveStatus(activeContractCard, self.character.activeContract?.progress ?? 0)
    : null;
  const contractObjectiveCopy = activeContractCard
    ? describeContractObjective(activeContractCard)
    : null;
  const encounterCopy = encounter
    ? `${encounter.title} - ${toTitleCase(encounter.cardType)}, ${toTitleCase(encounter.stat)} ${encounter.difficulty}`
    : `Phase ${toTitleCase(phase)}`;
  const scenarioCopy = formatScenarioSummaryCopy(activeScenario);
  const scenarioTelemetryCopy = formatScenarioTelemetryInline(scenarioTelemetry);
  const escalationCopy = formatEscalation({ escalationLevel, escalationThreshold, escalationModifier });
  const nemesisRemaining = activeNemesis ? Math.max(0, activeNemesis.life - activeNemesis.damageDealt) : 0;
  const nemesisProgressPercent = activeNemesis ? Math.min(100, (activeNemesis.damageDealt / Math.max(activeNemesis.life, 1)) * 100) : 0;
  const scarCards = self.character.scarCards ?? [];
  const scarEffectSummary = scarCards.map((scar) => scar.title).join(", ") || self.character.scars.join(", ");

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

          {scenarioOutcome && (
            <div className={`phone-sheet-trigger-panel phone-sheet-trigger-panel-${scenarioOutcome.tone}`}>
              <div className="phone-sheet-trigger-header">
                <span>{scenarioOutcome.title}</span>
              </div>
              <strong className="phone-sheet-trigger-copy">{scenarioOutcome.detail}</strong>
            </div>
          )}

          {activeScenario && (
            <div className="phone-sheet-scenario-panel">
              <div className="phone-sheet-section-heading">Scenario Rules</div>
              <p className="phone-sheet-scenario-theme">{activeScenario.theme}</p>
              <p className="phone-sheet-scenario-rule">{scenarioRuleDigest?.pressureSummary ?? activeScenario.pressureSummary}</p>
              {(scenarioRuleDigest?.telemetry ?? []).map((entry) => (
                <p key={entry} className="phone-sheet-scenario-rule">
                  {entry}
                </p>
              ))}
              {(scenarioRuleDigest?.specialRules ?? activeScenario.specialRules.slice(0, 2)).map((rule) => (
                <p key={rule} className="phone-sheet-scenario-rule">
                  {rule}
                </p>
              ))}
              {(scenarioRuleDigest?.confrontationSteps ?? activeScenario.confrontationSteps.slice(0, 2)).map((step) => (
                <p key={step} className="phone-sheet-scenario-rule">
                  {step}
                </p>
              ))}
              <p className="phone-sheet-scenario-rule">{scenarioRuleDigest?.victoryText ?? activeScenario.victoryText}</p>
            </div>
          )}

          {activeNemesis && (
            <div className="phone-sheet-nemesis-panel">
              <div className="phone-sheet-nemesis-header">
                <div>
                  <span>Nemesis at the Gate</span>
                  <strong>{activeNemesis.name}</strong>
                  <small>{activeNemesis.title}</small>
                </div>
                <div className="phone-sheet-nemesis-life">
                  <span>
                    Damage {activeNemesis.damageDealt}/{activeNemesis.life}
                  </span>
                  <strong>{nemesisRemaining} left</strong>
                </div>
              </div>
              <div className="phone-sheet-nemesis-bar" aria-hidden="true">
                <span style={{ width: `${nemesisProgressPercent}%` }} />
              </div>
              <div className="phone-sheet-nemesis-abilities">
                {activeNemesis.abilities.slice(0, 2).map((ability) => (
                  <p key={`${ability.timing}-${ability.text}`}>
                    <strong>{toTitleCase(ability.timing)}</strong> {ability.text}
                  </p>
                ))}
              </div>
            </div>
          )}

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
                <strong>{scarEffectSummary || self.notes.join(", ") || "Stable"}</strong>
              </article>
            </div>
          </div>

          {scarCards.length > 0 && (
            <div className="phone-sheet-section">
              <div className="phone-sheet-section-heading">Scars</div>
              <div className="phone-sheet-ability-list">
                {scarCards.map((scar) => (
                  <article key={scar.id} className="phone-sheet-ability-card">
                    <div className="phone-sheet-ability-icon">Scar</div>
                    <div className="phone-sheet-ability-copy">
                      <h3>{scar.title}</h3>
                      <p>
                        <strong>{scar.trigger}</strong> {scar.penalty}
                      </p>
                      <p>{scar.relief}</p>
                      {scar.upside && <p>{scar.upside}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {(self.character.followers?.length ?? 0) > 0 && (
            <div className="phone-sheet-section">
              <div className="phone-sheet-section-heading">Followers</div>
              <div className="phone-sheet-ability-list phone-sheet-follower-list">
                {(self.character.followers ?? []).map((follower) => (
                  <article key={follower.id} className="phone-sheet-ability-card phone-sheet-follower-card">
                    <div className="phone-sheet-ability-icon">{toTitleCase(follower.role).slice(0, 3)}</div>
                    <div className="phone-sheet-ability-copy">
                      <h3>{follower.name}</h3>
                      <p>{follower.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
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
              <CardArtImage
                cardType="contract"
                cardId={activeContractCard?.id}
                alt=""
                aria-hidden="true"
                className="phone-sheet-contract-art"
              />
              <div className="phone-sheet-contract-copy">
                <p>{contractCopy}</p>
                {contractStatusCopy && <em>{contractStatusCopy}</em>}
                {contractObjectiveCopy && <strong>{contractObjectiveCopy}</strong>}
                {activeContractCard && <span>{activeContractCard.text}</span>}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="phone-sheet-bottom">{children}</div>
    </section>
  );
}
