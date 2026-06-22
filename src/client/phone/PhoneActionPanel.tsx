import type { ReactElement } from "react";
import type {
  CharacterCatalogEntry,
  ClientIntent,
  ContractCard,
  PhonePatchPayload,
  SectorNode
} from "../shared/types.js";
import { getBoardSpace } from "../../game/data/boardSpaces.js";

interface PhoneActionPanelProps {
  characters: CharacterCatalogEntry[];
  onIntent: (intent: ClientIntent) => void;
  patch: PhonePatchPayload;
}

interface ActionButtonDefinition {
  key: string;
  label: string;
  tone: "primary" | "secondary";
  onClick: () => void;
}

function getSector(sectors: SectorNode[], sectorId: string): SectorNode | null {
  return sectors.find((sector) => sector.id === sectorId) ?? null;
}

function getActiveSeatId(patch: PhonePatchPayload): string | null {
  return patch.turnOrder[patch.activeSeatIndex] ?? null;
}

function getActiveContractCard(patch: PhonePatchPayload): ContractCard | null {
  const contractId = patch.self?.character.activeContract?.contractId;
  return contractId ? patch.availableContracts.find((contract) => contract.id === contractId) ?? null : null;
}

function getSectorOpportunityCopy(sector: SectorNode | null): string | null {
  if (!sector) {
    return null;
  }

  const parts = [
    sector.encounterDecks.anomaly.length ? `${sector.encounterDecks.anomaly.length} anomaly signal${sector.encounterDecks.anomaly.length === 1 ? "" : "s"}` : null,
    sector.encounterDecks.artifact.length ? `${sector.encounterDecks.artifact.length} salvage cache${sector.encounterDecks.artifact.length === 1 ? "" : "s"}` : null,
    sector.encounterDecks.contract.length ? `${sector.encounterDecks.contract.length} contract lead${sector.encounterDecks.contract.length === 1 ? "" : "s"}` : null,
    sector.encounterDecks.escalation.length ? `${sector.encounterDecks.escalation.length} stabilization window${sector.encounterDecks.escalation.length === 1 ? "" : "s"}` : null
  ].filter((entry): entry is string => Boolean(entry));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function ActionButtons({ actions }: { actions: ActionButtonDefinition[] }): ReactElement {
  if (actions.length === 0) {
    return <p className="phone-sheet-action-empty">No quick actions available in this step.</p>;
  }

  return (
    <div className="phone-sheet-action-grid">
      {actions.map((action) => (
        <button
          key={action.key}
          className={`phone-button phone-sheet-action-button phone-button-${action.tone}`}
          type="button"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function PhoneActionPanel({ characters, onIntent, patch }: PhoneActionPanelProps): ReactElement {
  const self = patch.self;

  if (!self) {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">No seat is attached.</p>
      </section>
    );
  }

  const isActiveSeat = getActiveSeatId(patch) === self.seatId;
  const sector = getSector(patch.sectors, self.sectorId);
  const boardSpace = getBoardSpace(self.sectorId);
  const activeContract = getActiveContractCard(patch);
  const equippedIds = new Set(Object.values(self.character.equippedGear).filter((value): value is string => Boolean(value)));
  const winnerName = patch.seats.find((seat) => seat.seatId === patch.winnerSeatId)?.displayName ?? patch.winnerSeatId ?? "unknown";
  const pendingEnemyRoll = patch.pendingEnemyRoll;
  const isAssignedEnemyRoller = pendingEnemyRoll?.assignedRollerSeatId === self.seatId;
  const pendingRollerName =
    patch.seats.find((seat) => seat.seatId === pendingEnemyRoll?.assignedRollerSeatId)?.displayName ??
    pendingEnemyRoll?.assignedRollerSeatId ??
    "another seat";
  const pendingFighterName =
    patch.seats.find((seat) => seat.seatId === pendingEnemyRoll?.fighterSeatId)?.displayName ??
    pendingEnemyRoll?.fighterSeatId ??
    "the active seat";
  const sectorOpportunityCopy = getSectorOpportunityCopy(sector);

  if (patch.status === "ended") {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">Game over - winner: {winnerName}</p>
      </section>
    );
  }

  if (patch.phase === "action" && pendingEnemyRoll) {
    if (isAssignedEnemyRoller) {
      return (
        <section className="phone-sheet-actions" aria-label="Quick actions">
          <div className="phone-sheet-section-heading">Quick Actions</div>
          <p className="phone-sheet-action-copy">{pendingFighterName} is engaged. Trigger the enemy roll when the table is ready.</p>
          <ActionButtons
            actions={[
              {
                key: "enemy-roll",
                label: "Roll for the Enemy",
                tone: "primary",
                onClick: () =>
                  onIntent({
                    type: "ENEMY_ROLL_REQUESTED",
                    seatId: self.seatId
                  })
              }
            ]}
          />
        </section>
      );
    }

    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">Waiting on {pendingRollerName} to roll for the enemy.</p>
      </section>
    );
  }

  if (!isActiveSeat) {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">Waiting for another seat to finish its turn.</p>
      </section>
    );
  }

  if (self.character.status === "recalled") {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">Your operative has been recalled. Recruit a replacement to continue.</p>
        <ActionButtons
          actions={characters.map((character) => ({
            key: character.id,
            label: `Recruit ${character.name}`,
            tone: "primary" as const,
            onClick: () =>
              onIntent({
                type: "RECRUIT_REPLACEMENT",
                seatId: self.seatId,
                replacementCharacterId: character.id
              })
          }))}
        />
      </section>
    );
  }

  const actions: ActionButtonDefinition[] = [];

  if (patch.phase === "navigation") {
    (sector?.neighbors ?? []).forEach((neighborId) => {
      const neighbor = getSector(patch.sectors, neighborId);

      actions.push({
        key: `move-${neighborId}`,
        label: `Move: ${neighbor?.name ?? neighborId}`,
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "MOVE_REQUESTED",
            seatId: self.seatId,
            toSectorId: neighborId
          })
      });
    });
  }

  if (patch.phase === "action" && patch.encounter?.cardType === "hazard") {
    actions.push({
      key: "hazard-check",
      label: `Attempt ${patch.encounter.stat} check`,
      tone: "primary",
      onClick: () =>
        onIntent({
          type: "CHECK_REQUESTED",
          seatId: self.seatId,
          stat: patch.encounter?.stat ?? "grit"
        })
    });
  }

  if (patch.phase === "action" && patch.encounter?.cardType === "enemy") {
    actions.push({
      key: "enemy-combat",
      label: `Enter combat with ${patch.encounter.enemyName ?? patch.encounter.title}`,
      tone: "primary",
      onClick: () =>
        onIntent({
          type: "COMBAT_REQUESTED",
          seatId: self.seatId,
          stat: patch.encounter?.stat ?? "grit"
        })
    });
  }

  if (patch.phase === "action") {
    const canResolveSpaceText =
      !patch.encounter &&
      !!boardSpace &&
      (boardSpace.tier === "inner" || boardSpace.tier === "center" || (sector?.encounterDecks.threat.length ?? 0) === 0);

    if (canResolveSpaceText && self.sectorId !== "center_cinder_gate") {
      actions.push({
        key: "resolve-space-text",
        label: boardSpace?.textBox.title ? `Resolve ${boardSpace.textBox.title}` : "Resolve Sector Text",
        tone: "secondary",
        onClick: () =>
          onIntent({
            type: "RESOLVE_SPACE_TEXT",
            seatId: self.seatId
          })
      });
    }

    if (!patch.encounter && patch.escalationLevel > 0) {
      actions.push({
        key: "stabilize",
        label: "Stabilize the Breach",
        tone: "secondary",
        onClick: () =>
          onIntent({
            type: "STABILIZE_REQUESTED",
            seatId: self.seatId
          })
      });
    }

    self.character.heldGear.forEach((item) => {
      if (equippedIds.has(item.id)) {
        return;
      }

      actions.push({
        key: `equip-${item.id}`,
        label: `Equip ${item.name}`,
        tone: "secondary",
        onClick: () =>
          onIntent({
            type: "EQUIP_GEAR",
            seatId: self.seatId,
            gearId: item.id,
            slot: item.slot
          })
      });
    });

    (Object.entries(self.character.equippedGear) as Array<[keyof typeof self.character.equippedGear, string | null]>).forEach(
      ([slot, gearId]) => {
        if (!gearId) {
          return;
        }

        actions.push({
          key: `unequip-${slot}`,
          label: `Unequip ${slot}`,
          tone: "secondary",
          onClick: () =>
            onIntent({
              type: "UNEQUIP_GEAR",
              seatId: self.seatId,
              slot
            })
        });
      }
    );

    if (!self.character.activeContract) {
      patch.availableContracts.forEach((contract) => {
        actions.push({
          key: `contract-${contract.id}`,
          label: `Accept ${contract.name}`,
          tone: "secondary",
          onClick: () =>
            onIntent({
              type: "ACCEPT_CONTRACT",
              seatId: self.seatId,
              contractId: contract.id
            })
        });
      });
    }

    if (self.character.activeContract && activeContract && self.character.activeContract.progress >= activeContract.objective.target) {
      actions.push({
        key: `complete-${activeContract.id}`,
        label: `Complete ${activeContract.name}`,
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "COMPLETE_CONTRACT",
            seatId: self.seatId,
            contractId: activeContract.id
          })
      });
    }

    const isAtCinderGate = self.sectorId === "center_cinder_gate";

    if (isAtCinderGate && patch.activeScenario && !patch.encounter) {
      const confrontationTarget = patch.nemesis ? `${patch.activeScenario.confrontationTitle} | ${patch.nemesis.name}` : patch.activeScenario.confrontationTitle;
      actions.push({
        key: "resolve-scenario",
        label: `Resolve ${confrontationTarget}`,
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "SCENARIO_CONFRONTATION_REQUESTED",
            seatId: self.seatId
          })
      });
    } else if (!patch.encounter) {
      actions.push({
        key: "end-turn",
        label: "End Turn",
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "PHASE_ADVANCED",
            seatId: self.seatId,
            toPhase: "resolution"
          })
      });
    }
  }

  const copy =
    patch.phase === "navigation"
      ? "Choose a neighboring sector."
      : patch.phase === "action" && self.sectorId === "center_cinder_gate"
        ? "The Cinder Gate is open. Resolve the active scenario confrontation."
      : patch.phase === "action" && boardSpace
        ? `Resolve ${boardSpace.textBox.title}, gear, contracts, or the current threat.${sectorOpportunityCopy ? ` Local reads: ${sectorOpportunityCopy}.` : ""}`
      : patch.phase === "action"
        ? "Resolve your current action, gear, or contract."
        : "Waiting for the server to resolve the current step.";

  return (
    <section className="phone-sheet-actions" aria-label="Quick actions">
      <div className="phone-sheet-section-heading">Quick Actions</div>
      <p className="phone-sheet-action-copy">{copy}</p>
      <ActionButtons actions={patch.phase === "navigation" || patch.phase === "action" ? actions : []} />
    </section>
  );
}
