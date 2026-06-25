import { useState, type ReactElement } from "react";
import type {
  CharacterCatalogEntry,
  ClientIntent,
  ContractCard,
  GearItem,
  PhonePatchPayload,
  SectorNode,
  Stat
} from "../shared/types.js";
import { getBoardSpace, isScenarioConfrontationSpace } from "../../game/data/boardSpaces.js";
import { describeContractObjective, formatContractObjectiveStatus } from "../../game/contracts/objectives.js";

interface PhoneActionPanelProps {
  characters: CharacterCatalogEntry[];
  onIntent: (intent: ClientIntent) => void;
  patch: PhonePatchPayload;
}

interface ActionButtonDefinition {
  key: string;
  label: string;
  detail?: string;
  tone: "primary" | "secondary";
  disabled?: boolean;
  onClick: () => void;
}

interface ActionSectionDefinition {
  key: string;
  title: string;
  detail?: string;
  actions: ActionButtonDefinition[];
  defaultOpen?: boolean;
}

interface SectorOpportunityItem {
  key: string;
  label: string;
  value: number;
}

const TROPHY_COST_PER_RANK = 4;
const MAX_STAT_RANK = 9;

const statLabelById: Record<Stat, string> = {
  command: "Command",
  grit: "Grit",
  signal: "Signal",
  guile: "Guile",
  forge: "Forge"
};

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

function getSectorOpportunityItems(sector: SectorNode | null): SectorOpportunityItem[] {
  if (!sector) {
    return [];
  }

  return [
    { key: "anomaly", label: "Anomaly", value: sector.encounterDecks.anomaly.length },
    { key: "artifact", label: "Salvage", value: sector.encounterDecks.artifact.length },
    { key: "contract", label: "Leads", value: sector.encounterDecks.contract.length },
    { key: "escalation", label: "Stabilize", value: sector.encounterDecks.escalation.length }
  ].filter((entry) => entry.value > 0);
}

function toTitleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function getGearActionDetail(item: GearItem): string {
  const baseDetail = item.activeText ?? toTitleCase(item.category ?? "active");

  if (item.useLimit !== "charge") {
    return baseDetail;
  }

  return `${baseDetail} | ${item.charges ?? 0} charge${item.charges === 1 ? "" : "s"} left`;
}

function ActionButtons({ actions }: { actions: ActionButtonDefinition[] }): ReactElement {
  if (actions.length === 0) {
    return <p className="phone-sheet-action-empty">No actions in this section.</p>;
  }

  return (
    <div className="phone-sheet-action-grid">
      {actions.map((action) => (
        <button
          key={action.key}
          className={`phone-button phone-sheet-action-button phone-button-${action.tone}`}
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
        >
          <span className="phone-sheet-action-label">{action.label}</span>
          {action.detail && <span className="phone-sheet-action-detail">{action.detail}</span>}
        </button>
      ))}
    </div>
  );
}

function ActionSections({ sections }: { sections: ActionSectionDefinition[] }): ReactElement {
  const visibleSections = sections.filter((section) => section.actions.length > 0);

  if (visibleSections.length === 0) {
    return <p className="phone-sheet-action-empty">No quick actions available in this step.</p>;
  }

  return (
    <div className="phone-sheet-action-sections">
      {visibleSections.map((section) => (
        <details key={section.key} className="phone-sheet-action-section" open={section.defaultOpen}>
          <summary>
            <span>{section.title}</span>
            {section.detail && <small>{section.detail}</small>}
          </summary>
          <ActionButtons actions={section.actions} />
        </details>
      ))}
    </div>
  );
}

function SectorOpportunityChips({ items }: { items: SectorOpportunityItem[] }): ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="phone-sheet-action-chips" aria-label="Local opportunities">
      {items.map((item) => (
        <span key={item.key}>
          <strong>{item.value}</strong>
          {item.label}
        </span>
      ))}
    </div>
  );
}

function TrophyAdvanceDisclosure({
  actions,
  trophies
}: {
  actions: ActionButtonDefinition[];
  trophies: number;
}): ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);

  if (actions.length === 0) {
    return null;
  }

  return (
    <details
      className="phone-sheet-action-section phone-sheet-action-section-advance"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary>
        <span>Spend trophies</span>
        <small>
          {trophies} held, {TROPHY_COST_PER_RANK} per rank
        </small>
      </summary>
      <ActionButtons actions={actions} />
    </details>
  );
}

export function PhoneActionPanel({ characters, onIntent, patch }: PhoneActionPanelProps): ReactElement {
  const self = patch.self;

  if (!self) {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">Trophies: 0</p>
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
  const sectorOpportunityItems = getSectorOpportunityItems(sector);
  const isScenarioConfrontation = isScenarioConfrontationSpace(self.sectorId);
  const canRaiseStat =
    patch.phase === "action" &&
    !patch.encounter &&
    !patch.pendingEnemyRoll &&
    self.character.status === "active";

  if (patch.status === "ended") {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">Trophies: {self.character.trophies}</p>
        <p className="phone-sheet-action-copy">Game over: {winnerName} wins.</p>
      </section>
    );
  }

  if (patch.phase === "action" && pendingEnemyRoll) {
    if (isAssignedEnemyRoller) {
      return (
        <section className="phone-sheet-actions" aria-label="Quick actions">
          <div className="phone-sheet-section-heading">Quick Actions</div>
          <p className="phone-sheet-action-copy">Trophies: {self.character.trophies}</p>
          <p className="phone-sheet-action-copy">{pendingFighterName} is engaged. Trigger the enemy roll when the table is ready.</p>
          <ActionSections
            sections={[
              {
                key: "combat",
                title: "Combat",
                defaultOpen: true,
                actions: [
                  {
                    key: "enemy-roll",
                    label: "Roll for the enemy",
                    detail: pendingEnemyRoll.encounterTitle,
                    tone: "primary",
                    onClick: () =>
                      onIntent({
                        type: "ENEMY_ROLL_REQUESTED",
                        seatId: self.seatId
                      })
                  }
                ]
              }
            ]}
          />
        </section>
      );
    }

    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">Trophies: {self.character.trophies}</p>
        <p className="phone-sheet-action-copy">Waiting on {pendingRollerName} to roll for the enemy.</p>
      </section>
    );
  }

  if (!isActiveSeat) {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">Trophies: {self.character.trophies}</p>
        <p className="phone-sheet-action-copy">Waiting for another seat to finish its turn.</p>
      </section>
    );
  }

  if (self.character.status === "recalled") {
    return (
      <section className="phone-sheet-actions" aria-label="Quick actions">
        <div className="phone-sheet-section-heading">Quick Actions</div>
        <p className="phone-sheet-action-copy">Trophies: {self.character.trophies}</p>
        <p className="phone-sheet-action-copy">Your operative has been recalled. Recruit a replacement to continue.</p>
        <ActionSections
          sections={[
            {
              key: "recruit",
              title: "Recruit",
              defaultOpen: true,
              actions: characters.map((character) => ({
                key: character.id,
                label: `Recruit ${character.name}`,
                detail: character.archetype,
                tone: "primary" as const,
                onClick: () =>
                  onIntent({
                    type: "RECRUIT_REPLACEMENT",
                    seatId: self.seatId,
                    replacementCharacterId: character.id
                  })
              }))
            }
          ]}
        />
      </section>
    );
  }

  const moveActions: ActionButtonDefinition[] = [];
  const threatActions: ActionButtonDefinition[] = [];
  const resolveActions: ActionButtonDefinition[] = [];
  const gearActions: ActionButtonDefinition[] = [];
  const objectActions: ActionButtonDefinition[] = [];
  const followerActions: ActionButtonDefinition[] = [];
  const tableActions: ActionButtonDefinition[] = [];
  const contractActions: ActionButtonDefinition[] = [];
  const advanceActions: ActionButtonDefinition[] = [];
  const statRaiseActions: ActionButtonDefinition[] = [];

  if (patch.phase === "navigation") {
    (sector?.neighbors ?? []).forEach((neighborId) => {
      const neighbor = getSector(patch.sectors, neighborId);

      moveActions.push({
        key: `move-${neighborId}`,
        label: neighbor?.name ?? neighborId,
        detail: "Move",
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
    threatActions.push({
      key: "hazard-check",
      label: `Attempt ${statLabelById[patch.encounter.stat]} check`,
      detail: patch.encounter.title,
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
    threatActions.push({
      key: "enemy-combat",
      label: "Enter combat",
      detail: patch.encounter.enemyName ?? patch.encounter.title,
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

    if (canResolveSpaceText && !isScenarioConfrontation) {
      if (boardSpace?.textBox.choices && boardSpace.textBox.choices.length > 0) {
        boardSpace.textBox.choices.forEach((choice) => {
          resolveActions.push({
            key: `resolve-space-text-${choice.id}`,
            label: choice.label,
            detail: boardSpace.textBox.title,
            tone: "secondary",
            onClick: () =>
              onIntent({
                type: "RESOLVE_SPACE_TEXT",
                seatId: self.seatId,
                choiceId: choice.id
              })
          });
        });
      } else {
        resolveActions.push({
          key: "resolve-space-text",
          label: boardSpace?.textBox.title ? `Resolve ${boardSpace.textBox.title}` : "Resolve sector text",
          tone: "secondary",
          onClick: () =>
            onIntent({
              type: "RESOLVE_SPACE_TEXT",
              seatId: self.seatId
            })
        });
      }
    }

    if (!patch.encounter && patch.escalationLevel > 0) {
      resolveActions.push({
        key: "stabilize",
        label: "Stabilize breach",
        detail: `Escalation ${patch.escalationLevel}/${patch.escalationThreshold}`,
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
        if (item.activeText || item.useLimit) {
          objectActions.push({
            key: `use-${item.id}`,
            label: `Use ${item.name}`,
            detail: getGearActionDetail(item),
            tone: item.useLimit === "discard" ? "primary" : "secondary",
            disabled: item.useLimit === "charge" && (item.charges ?? 0) <= 0,
            onClick: () =>
              onIntent({
                type: "USE_GEAR",
                seatId: self.seatId,
                gearId: item.id
              })
          });
        }

        return;
      }

      gearActions.push({
        key: `equip-${item.id}`,
        label: `Equip ${item.name}`,
        detail: `${toTitleCase(item.slot)}: +${item.statBonus.amount} ${statLabelById[item.statBonus.stat]}`,
        tone: "secondary",
        onClick: () =>
          onIntent({
            type: "EQUIP_GEAR",
            seatId: self.seatId,
            gearId: item.id,
            slot: item.slot
          })
      });

      if (item.activeText || item.useLimit) {
        objectActions.push({
          key: `use-${item.id}`,
          label: `Use ${item.name}`,
          detail: getGearActionDetail(item),
          tone: item.useLimit === "discard" ? "primary" : "secondary",
          disabled: item.useLimit === "charge" && (item.charges ?? 0) <= 0,
          onClick: () =>
            onIntent({
              type: "USE_GEAR",
              seatId: self.seatId,
              gearId: item.id
            })
        });
      }
    });

    (Object.entries(self.character.equippedGear) as Array<[keyof typeof self.character.equippedGear, string | null]>).forEach(
      ([slot, gearId]) => {
        if (!gearId) {
          return;
        }

        gearActions.push({
          key: `unequip-${slot}`,
          label: `Unequip ${toTitleCase(slot)}`,
          detail: gearId,
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

    (self.character.followers ?? []).forEach((follower) => {
      followerActions.push({
        key: `use-follower-${follower.id}`,
        label: `Use ${follower.name}`,
        detail: `${toTitleCase(follower.role)}${follower.useLimit ? ` | ${toTitleCase(follower.useLimit)}` : ""}`,
        tone: follower.useLimit === "discard" ? "primary" : "secondary",
        onClick: () =>
          onIntent({
            type: "USE_FOLLOWER",
            seatId: self.seatId,
            followerId: follower.id
          })
      });
    });

    if (patch.sessionMode !== "single-player") {
      const tableTargets = patch.seats.filter((seat) => seat.seatId !== self.seatId && seat.displayName && !seat.kicked);
      const baseInteractions = patch.interactionMode === "co-op" ? ["trade", "aid"] : ["trade", "aid", "duel", "interfere"];

      tableTargets.forEach((seat) => {
        baseInteractions.forEach((interactionKind) => {
          tableActions.push({
            key: `${interactionKind}-${seat.seatId}`,
            label: `${toTitleCase(interactionKind)} ${seat.displayName}`,
            detail:
              interactionKind === "interfere" && patch.interactionMode !== "ruthless"
                ? "Bounded rivalry"
                : toTitleCase(patch.interactionMode ?? "rivalry"),
            tone: interactionKind === "aid" || interactionKind === "trade" ? "secondary" : "primary",
            onClick: () =>
              onIntent({
                type: "TABLE_INTERACTION",
                seatId: self.seatId,
                targetSeatId: seat.seatId,
                interactionKind: interactionKind as "trade" | "aid" | "duel" | "interfere"
              })
          });
        });
      });
    }

    if (!self.character.activeContract) {
      patch.availableContracts.forEach((contract) => {
        contractActions.push({
          key: `contract-${contract.id}`,
          label: `Accept ${contract.name}`,
          detail: describeContractObjective(contract),
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
      contractActions.push({
        key: `complete-${activeContract.id}`,
        label: `Complete ${activeContract.name}`,
        detail: formatContractObjectiveStatus(activeContract, self.character.activeContract.progress),
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "COMPLETE_CONTRACT",
            seatId: self.seatId,
            contractId: activeContract.id
          })
      });
    }

    if (canRaiseStat) {
      (Object.entries(self.character.stats) as Array<[Stat, number]>).forEach(([stat, value]) => {
        const atCap = value >= MAX_STAT_RANK;
        const canAfford = self.character.trophies >= TROPHY_COST_PER_RANK;
        const nextValue = Math.min(value + 1, MAX_STAT_RANK);

        statRaiseActions.push({
          key: `raise-${stat}`,
          label: statLabelById[stat],
          detail: atCap ? "At rank cap" : `${value} to ${nextValue}, cost ${TROPHY_COST_PER_RANK}`,
          tone: "secondary",
          disabled: atCap || !canAfford,
          onClick: () =>
            onIntent({
              type: "RAISE_STAT_REQUESTED",
              seatId: self.seatId,
              stat
            })
        });
      });
    }

    if (isScenarioConfrontation && patch.activeScenario && !patch.encounter) {
      advanceActions.push({
        key: "resolve-scenario",
        label: `Resolve ${patch.activeScenario.confrontationTitle}`,
        detail: patch.nemesis?.name,
        tone: "primary",
        onClick: () =>
          onIntent({
            type: "SCENARIO_CONFRONTATION_REQUESTED",
            seatId: self.seatId
          })
      });
    } else if (!patch.encounter) {
      advanceActions.push({
        key: "end-turn",
        label: "End turn",
        detail: "Pass control to the table",
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
      : patch.phase === "action" && isScenarioConfrontation
        ? "The Cinder Gate is open. Resolve the active scenario confrontation."
      : patch.phase === "action" && boardSpace
        ? `Resolve ${boardSpace.textBox.title}, then handle gear, contracts, or advancement.`
      : patch.phase === "action"
        ? "Resolve your current action, gear, or contract."
        : "Waiting for the server to resolve the current step.";

  return (
    <section className="phone-sheet-actions" aria-label="Quick actions">
      <div className="phone-sheet-section-heading">Quick Actions</div>
      <div className="phone-sheet-action-status">
        <span>Trophies: {self.character.trophies}</span>
        <span>{copy}</span>
      </div>
      <SectorOpportunityChips items={sectorOpportunityItems} />
      <ActionSections
        sections={[
          { key: "move", title: "Move", detail: sector?.name, actions: moveActions, defaultOpen: true },
          { key: "threat", title: "Threat", detail: patch.encounter?.title, actions: threatActions, defaultOpen: true },
          { key: "resolve", title: "Resolve", detail: boardSpace?.textBox.title, actions: resolveActions, defaultOpen: true },
          { key: "gear", title: "Gear", detail: `${gearActions.length} available`, actions: gearActions },
          { key: "objects", title: "Objects", detail: `${objectActions.length} usable`, actions: objectActions },
          { key: "followers", title: "Followers", detail: `${followerActions.length} ready`, actions: followerActions },
          { key: "table", title: "Table", detail: patch.interactionMode ?? "rivalry", actions: tableActions },
          { key: "contracts", title: "Contracts", detail: `${contractActions.length} available`, actions: contractActions },
          { key: "advance", title: "Advance", detail: "Finish or confront", actions: advanceActions, defaultOpen: true }
        ]}
      />
      <TrophyAdvanceDisclosure actions={statRaiseActions} trophies={self.character.trophies} />
    </section>
  );
}
