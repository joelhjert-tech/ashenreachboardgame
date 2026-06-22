import type { ReactElement } from "react";
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
  characters: CharacterCatalogEntry[];
  patch: PhonePatchPayload | null;
  onIntent: ((intent: import("../shared/types.js").ClientIntent) => void) | null;
  onLeave: () => void;
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
      onLeave={onLeave}
      className="phone-sheet-card-landscape"
    >
      {patch && onIntent && <PhoneActionPanel characters={characters} onIntent={onIntent} patch={patch} />}
    </MobilePlayerCard>
  );
}
