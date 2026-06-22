import type { ReactElement } from "react";
import type { AbilityChangeItem } from "../shared/abilityTelemetry.js";
import type { CharacterCatalogEntry, ContractCard, EncounterCard, OutcomeSummary, PhonePatchPayload, PhoneSelfState, SessionStatus } from "../shared/types.js";
import { MobilePlayerCard } from "./MobilePlayerCard.js";
import { PhoneActionPanel } from "./PhoneActionPanel.js";

interface LandscapeCharacterCardViewProps {
  self: PhoneSelfState | null;
  activeContractCard: ContractCard | null;
  roomCode: string;
  displayName: string;
  connectionStatus: string;
  sessionStatus: SessionStatus | null;
  phase: string;
  activeSeatId: string | null;
  encounter: EncounterCard | null;
  outcomeSummary: OutcomeSummary | null;
  latestAbilityTriggerSummary: string | null;
  abilityChangeItems: AbilityChangeItem[];
  characters: CharacterCatalogEntry[];
  patch: PhonePatchPayload | null;
  onIntent: ((intent: import("../shared/types.js").ClientIntent) => void) | null;
  onLeave: () => void;
}

function getLocalOpportunityCopy(patch: PhonePatchPayload | null, sectorId: string | null): string | null {
  if (!patch || !sectorId) {
    return null;
  }

  const sector = patch.sectors.find((entry) => entry.id === sectorId);

  if (!sector) {
    return null;
  }

  const parts = [
    sector.encounterDecks.anomaly.length ? `${sector.encounterDecks.anomaly.length} anomaly signal${sector.encounterDecks.anomaly.length === 1 ? "" : "s"}` : null,
    sector.encounterDecks.artifact.length ? `${sector.encounterDecks.artifact.length} salvage cache${sector.encounterDecks.artifact.length === 1 ? "" : "s"}` : null,
    sector.encounterDecks.contract.length ? `${sector.encounterDecks.contract.length} contract lead${sector.encounterDecks.contract.length === 1 ? "" : "s"}` : null,
    sector.encounterDecks.escalation.length ? `${sector.encounterDecks.escalation.length} stabilization window${sector.encounterDecks.escalation.length === 1 ? "" : "s"}` : null
  ].filter((entry): entry is string => Boolean(entry));

  return parts.length > 0 ? `Local opportunities | ${parts.join(" | ")}` : null;
}

export function LandscapeCharacterCardView({
  self,
  activeContractCard,
  roomCode,
  displayName,
  connectionStatus,
  sessionStatus,
  phase,
  activeSeatId,
  encounter,
  outcomeSummary,
  latestAbilityTriggerSummary,
  abilityChangeItems,
  characters,
  patch,
  onIntent,
  onLeave
}: LandscapeCharacterCardViewProps): ReactElement {
  if (!self) {
    return (
      <section className="phone-panel phone-empty-panel phone-connecting-panel">
        <h2>Connecting...</h2>
        <p className="phone-muted-copy">Rejoining your seat and syncing the latest session state.</p>
      </section>
    );
  }

  return (
    <MobilePlayerCard
      self={self}
      activeContractCard={activeContractCard}
      localOpportunityCopy={getLocalOpportunityCopy(patch, self.sectorId)}
      roomCode={roomCode}
      displayName={displayName}
      connectionStatus={connectionStatus}
      sessionStatus={sessionStatus}
      phase={phase}
      activeSeatId={activeSeatId}
      activeScenario={patch?.activeScenario ?? null}
      scenarioTelemetry={patch?.scenarioTelemetry ?? []}
      escalationLevel={patch?.escalationLevel ?? 0}
      escalationThreshold={patch?.escalationThreshold ?? 6}
      escalationModifier={patch?.escalationModifier ?? 0}
      encounter={encounter}
      outcomeSummary={outcomeSummary}
      latestAbilityTriggerSummary={latestAbilityTriggerSummary}
      abilityChangeItems={abilityChangeItems}
      onLeave={onLeave}
      className="phone-sheet-card-landscape"
    >
      {patch && onIntent && <PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />}
    </MobilePlayerCard>
  );
}
