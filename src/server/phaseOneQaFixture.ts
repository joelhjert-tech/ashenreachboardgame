import { getBoardSpace } from "../game/data/boardSpaces.js";
import { loadGear } from "../game/content/gear.js";
import { loadThreatCards } from "../game/content/threats.js";
import { loadFollowers } from "../game/content/followers.js";
import { loadAnomalyCards } from "../game/content/anomalies.js";
import { loadEscalationCards } from "../game/content/escalations.js";
import { loadCharacters } from "../game/content/characters.js";
import { loadContracts } from "../game/content/contracts.js";
import { loadTileChallenges } from "../game/content/tileChallenges.js";
import type { GameState } from "../game/schema/session.schema.js";
import { getIntrinsicBaseStat } from "../game/rules/cooperativeAssistance.js";
import { createScarChoice } from "../game/rules/scarSystem.js";
import { getScenarioDefinition } from "../game/data/scenarios.js";
import { getEscalationCollapseLevel } from "../game/engine/escalation.js";

export type PhaseOneQaFixture =
  | {
      kind: "setup-flow";
      stage: "scenario-selection" | "operative-selection" | "mission-selection" | "ready-check" | "start-blocked" | "start-available" | "maximum-players";
    }
  | { kind: "route"; stage: "first" | "duplicate" | "ordered-wrong" | "final" | "completion-ready" }
  | { kind: "shop"; stage: "wrong-shop" | "valid-first" | "valid-final" | "completion-ready" }
  | {
      kind: "host-shop";
      stage: "categories" | "items" | "equipment" | "artifacts" | "services" | "sell" | "sold-out" | "locked" | "insufficient" | "long-lore" | "single-category";
    }
  | {
      kind: "inventory-player-card";
      stage:
        | "basic" | "battle" | "movement" | "wounds-scars" | "equipped" | "carried"
        | "consumable" | "charged" | "exhausted" | "wrong-timing" | "passive-artifact"
        | "active-artifact" | "empty" | "many" | "long-copy" | "missing-art"
        | "relevant-one" | "relevant-many" | "none-relevant" | "use-result" | "reconnect";
    }
  | { kind: "movement-journey"; stage: "ashen-chapel"; withChoirLantern?: boolean }
  | { kind: "tile-arrival"; stage: "challenge" | "multi-effect" | "optional-shop" | "single-next-turn" }
  | { kind: "phone-action"; stage: "free-action" | "many-actions" | "hazard-ready" | "challenge-ready" | "event-ready" | "blocked-start" }
  | { kind: "phone-movement"; stage: "roll-required" | "four-routes" | "medium-routes" | "long-routes" | "confirmed" }
  | { kind: "map-transition"; stage: "guardian-locked" | "guardian-cleared" | "core-locked" | "core-cleared" }
  | { kind: "mission-reward"; stage: "progress" | "ready" }
  | {
      kind: "objective-presentation";
      stage: "shared" | "contract" | "contract-near" | "replacement" | "agenda-locked" | "agenda-revealed" | "agenda-complete" | "private-resolution" | "long-content";
    }
  | { kind: "relic-trade"; completedContracts: 0 | 1 | 2 | 3 }
  | { kind: "follower"; stage: "acquired" | "used" | "reconnected" }
  | { kind: "host-state"; stage: "scenario-preparation" | "disconnected" | "victory" | "loss" }
  | {
      kind: "host-rare";
      stage: "stacked-operatives" | "reaction-pending" | "reaction-final" | "recall-triggered" | "scar-pending" | "scar-resolved";
    }
  | {
      kind: "phone-battle";
      stage: "encounter" | "battle-setup" | "pending-enemy-roll" | "rolled-result" | "success" | "defeat";
    }
  | {
      kind: "cooperative-assistance";
      stage: "active-selector" | "helper-pending" | "one-accepted" | "two-accepted" | "result" | "scenario-node";
    }
  | {
      kind: "cinder-wattle";
      stage: "player-card" | "ability-available" | "ability-prepared" | "ability-used" | "battle-result" | "hazard-result";
    }
  | {
      kind: "discovery-equipment";
      stage: "equipment-reveal" | "follower-reveal" | "auto-equipped" | "equip-choice" | "command-item-invalid" | "grit-item-valid";
    }
  | {
      kind: "scar-system";
      stage: "choice" | "owned-one" | "owned-two" | "third-warning" | "removal" | "retired" | "adaptation-available" | "adaptation-used";
    }
  | {
      kind: "salvage-resolution";
      stage: "payment" | "optional-payment" | "insufficient" | "battle-reward" | "event-reward";
    }
  | { kind: "card-category"; stage: "enemy" | "hazard" | "hazard-before" | "hazard-failure" | "event" | "anomaly" | "escalation" | "persistent" }
  | {
      kind: "progression-endgame";
      stage:
        | "early-progress" | "near-win" | "progress-gain" | "early-pressure" | "near-loss"
        | "pressure-gain" | "critical" | "final-stage" | "coop-victory" | "coop-defeat"
        | "solo-victory" | "solo-defeat" | "rivalry-result" | "nemesis-result"
        | "long-mission" | "long-defeat" | "reconnect-victory";
    }
  | {
      kind: "waiting-handoff";
      stage: "result" | "long-result" | "private-choice" | "end-turn" | "handoff" | "next-turn";
    };

const routeContractId = "choir-echo-triangulation";
const orderedRouteContractId = "compact-three-lantern-circuit";
const shopContractId = "dominion-foundry-proof-marks";

function clearResolution(state: GameState): void {
  state.currentEncounter = null;
  state.pendingEnemyRoll = null;
  state.cooperativeAssistance = null;
  state.pendingCooperativeTest = null;
  state.pendingEffect = null;
  state.pendingEncounterDecision = null;
  state.pendingMemoryTaxChoice = null;
  state.pendingForcedDestinationChoice = null;
  state.pendingEquipmentSuppressionChoice = null;
  state.activeResolution = null;
  state.pendingTileChallenge = null;
  state.pendingFailureReaction = null;
  state.pendingStaticIntercessionReaction = null;
  state.pendingScarConsequence = null;
  state.pendingScarConsequenceQueue = [];
  state.pendingScarChoice = null;
  state.pendingScarThreshold = null;
  state.pendingScarRemovalChoice = null;
  state.resolutionSource = null;
  state.lastOutcomeSummary = null;
  state.pendingGearEquipChoice = null;
  state.shopStockReveals = [];
}

function placePlayer(state: GameState, seatId: string, sectorId: string): void {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
  player.sectorId = sectorId;
  player.character.currentSpaceId = sectorId;
  clearSector(state, sectorId);
}

function clearSector(state: GameState, sectorId: string): void {
  const sector = state.sectors.find((entry) => entry.id === sectorId);
  if (!sector) throw new Error(`QA fixture cannot find sector ${sectorId}`);
  sector.threatIcons = [];
  sector.encounterDecks = { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] };
}

function setContract(state: GameState, seatId: string, contractId: string, progress: number, completedTargetIds: string[] = []): void {
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
  if (!state.availableContracts.some((entry) => entry.id === contractId)) throw new Error(`QA fixture cannot find contract ${contractId}`);
  player.character.activeContract = { contractId, progress, completedTargetIds };
}

function setPhoneBattleFixture(
  state: GameState,
  seatId: string,
  stage: Extract<PhaseOneQaFixture, { kind: "phone-battle" }>["stage"]
): void {
  const threat = loadThreatCards().get("lantern-ash-ghoul");
  const player = state.players.find((entry) => entry.seatId === seatId);
  if (!threat || threat.cardType !== "enemy" || !player) throw new Error("QA fixture cannot create phone battle");

  state.phase = stage === "rolled-result" || stage === "success" || stage === "defeat" ? "resolution" : "action";
  state.currentEncounter = threat;
  state.pendingEnemyRoll = null;
  state.lastOutcomeSummary = null;
  state.activeResolution = null;
  state.resolutionSource = "encounter";
  player.character.wounds = stage === "defeat" ? 1 : 0;

  if (stage === "encounter") {
    return;
  }

  state.activeResolution = {
    id: `qa-phone-battle:${seatId}:lantern-ash-ghoul`,
    playerId: seatId,
    source: "threat",
    stage: stage === "battle-setup" || stage === "pending-enemy-roll" ? "battle_setup" : stage === "rolled-result" ? "roll_result" : "outcome_summary",
    card: {
      id: threat.id,
      title: threat.title,
      type: threat.cardType,
      flavor: threat.flavor,
      artType: "threat"
    },
    battle: {
      enemyName: threat.enemyName ?? threat.title,
      stat: threat.stat,
      difficulty: 12,
      modifiers: [{ label: "Base Grit", value: 5 }]
    },
    ...(stage === "battle-setup" || stage === "pending-enemy-roll"
      ? {}
      : {
          roll: {
            dice: stage === "defeat" ? [1, 1] : [3, 4],
            baseTotal: stage === "defeat" ? 2 : 7,
            modifierTotal: 5,
            finalTotal: stage === "defeat" ? 7 : 12,
            target: 12,
            success: stage !== "defeat"
          }
        }),
    ...(stage === "success"
      ? {
          outcome: {
            title: "Threat defeated",
            text: "You end the ghoul quietly and keep the lamp burning.",
            effects: ["Lantern-Ash Ghoul added to the Trophy Pile.", "The ward gains 1 seal token."]
          }
        }
      : stage === "defeat"
        ? {
            outcome: {
              title: "Operative defeated",
              text: "The ghoul drives you back from the lamp.",
              effects: ["Suffer 1 Wound.", "Lantern-Ash Ghoul remains on this space."]
            }
          }
        : {})
  };

  if (stage === "pending-enemy-roll") {
    state.pendingEnemyRoll = {
      fighterSeatId: seatId,
      assignedRollerSeatId: seatId,
      encounterCardId: threat.id,
      encounterTitle: threat.title,
      stat: threat.stat
    };
    return;
  }

  if (stage === "success" || stage === "defeat") {
    const success = stage === "success";
    state.lastOutcomeSummary = {
      seatId,
      movedToSectorId: player.character.currentSpaceId,
      encounterCardId: threat.id,
      encounterTitle: threat.title,
      encounterCardType: "enemy",
      checkStat: threat.stat,
      die1: success ? 3 : 1,
      die2: success ? 4 : 1,
      statBonus: 5,
      checkTotal: success ? 12 : 7,
      difficulty: threat.difficulty,
      enemyRollerSeatId: null,
      enemyDie1: 6,
      enemyDie2: 6,
      enemyBonus: 0,
      enemyTotal: 12,
      success,
      summary: success
        ? "Lantern-Ash Ghoul defeated. +1 trophy. The ward gains 1 seal token."
        : "Lantern-Ash Ghoul remains. Suffer 1 Wound.",
    };
  }
}

export function applyPhaseOneQaFixture(state: GameState, seatId: string, fixture: PhaseOneQaFixture): void {
  if (fixture.kind === "setup-flow") {
    const seat = state.seats.find((entry) => entry.seatId === seatId);
    if (!seat) throw new Error(`QA fixture cannot find ${seatId}`);
    state.status = "lobby";
    state.phase = "start";
    state.lobbyConfigured = fixture.stage !== "scenario-selection";
    state.setupHostSeatId = seatId;
    const occupiedCount = fixture.stage === "maximum-players"
      ? state.seats.length
      : fixture.stage === "start-blocked" || fixture.stage === "start-available"
        ? Math.min(2, state.seats.length)
        : 1;
    state.seats.forEach((entry, index) => {
      const occupied = index < occupiedCount;
      entry.displayName = occupied ? ["Joel", "Anna", "Erik", "Mira", "Liv", "Jonas"][index] ?? `Player ${index + 1}` : null;
      entry.connected = occupied;
      entry.characterSelected = occupied && fixture.stage !== "operative-selection";
      entry.startingContractOptions = entry.characterSelected
        ? Array.from({ length: Math.min(3, state.availableContracts.length) }, (_, optionIndex) =>
            state.availableContracts[(index + optionIndex) % state.availableContracts.length]?.id
          ).filter((contractId): contractId is string => Boolean(contractId))
        : [];
      entry.selectedStartingContractId = occupied && !["operative-selection", "mission-selection"].includes(fixture.stage)
        ? entry.startingContractOptions[0] ?? null
        : null;
      entry.ready = occupied && (fixture.stage === "start-available" || fixture.stage === "maximum-players" || (fixture.stage === "start-blocked" && index === 0));
    });
    state.sequence += 1;
    clearResolution(state);
    return;
  }

  if (state.status !== "active" && fixture.kind !== "host-state" && fixture.kind !== "progression-endgame") throw new Error("QA fixture requires an active session");
  clearResolution(state);
  state.sequence += 1;
  state.activeSeatIndex = Math.max(0, state.turnOrder.indexOf(seatId));

  if (fixture.kind === "progression-endgame") {
    const stage = fixture.stage;
    state.activeScenarioId = stage === "long-mission" || stage === "long-defeat"
      ? "scenario_broken_concordance"
      : "scenario_broken_seal";
    const progressionEventTypes = new Set([
      "SCENARIO_OBJECTIVE_PROGRESS_TRIGGERED",
      "SCENARIO_OBJECTIVE_COMPLETED",
      "SCENARIO_VICTORY_ACHIEVED",
      "ESCALATION_ADVANCED"
    ]);
    state.eventLog = state.eventLog.filter((entry) => {
      const type = typeof entry === "object" && entry !== null && "type" in entry
        ? (entry as { type?: unknown }).type
        : null;
      const createdAt = typeof entry === "object" && entry !== null && "createdAt" in entry
        ? (entry as { createdAt?: unknown }).createdAt
        : null;
      return !progressionEventTypes.has(typeof type === "string" ? type : "")
        && (typeof createdAt !== "string" || !createdAt.startsWith("qa-p14-"));
    });
    const scenario = getScenarioDefinition(state.activeScenarioId);
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!scenario || !player) throw new Error("QA progression fixture requires an active scenario and operative");
    state.sessionMode = stage === "solo-victory" || stage === "solo-defeat" ? "single-player" : "multiplayer";
    state.interactionMode = stage === "rivalry-result" ? "rivalry" : "co-op";
    state.gameMode = stage === "nemesis-result" ? "nemesis_relay" : "standard";
    const collapseLimit = getEscalationCollapseLevel(state.sessionMode);
    const isVictory = ["coop-victory", "solo-victory", "rivalry-result", "nemesis-result", "reconnect-victory"].includes(stage);
    const isDefeat = ["coop-defeat", "solo-defeat", "long-defeat"].includes(stage);
    const winTarget = scenario.victoryThreshold;
    const winCurrent = stage === "early-progress" || stage === "early-pressure" ? Math.min(1, winTarget)
      : stage === "near-win" || stage === "progress-gain" || stage === "critical" || stage === "near-loss" || stage === "pressure-gain"
        ? Math.max(0, winTarget - 1)
        : isVictory ? winTarget : Math.max(0, winTarget - 1);
    if (scenario.id === "scenario_broken_seal") {
      state.scenarioConfrontation.progress.restorationMarks = winCurrent;
    } else if (scenario.id === "scenario_broken_concordance") {
      state.scenarioConfrontation.progress.concordanceStages = winCurrent;
    } else {
      state.scenarioProgress[scenario.winConditionKey] = winCurrent;
    }
    state.escalationLevel = stage === "early-pressure" ? 1
      : stage === "near-loss" || stage === "pressure-gain" || stage === "critical" || isDefeat
        ? Math.max(0, collapseLimit - (stage === "near-loss" ? 2 : stage === "critical" || stage === "pressure-gain" ? 1 : 0))
        : Math.min(state.escalationLevel, 2);
    state.phase = "action";
    state.status = isVictory || isDefeat ? "ended" : "active";
    state.winnerSeatId = isVictory ? seatId : null;
    state.scenarioConfrontation.active = stage === "final-stage" || isVictory || isDefeat;
    state.scenarioConfrontation.confrontationId = state.scenarioConfrontation.active ? `${scenario.id}:qa-final` : null;
    state.scenarioConfrontation.stage = state.scenarioConfrontation.active ? "stage-1" : null;
    state.scenarioResult = {
      status: isVictory ? "victory" : isDefeat ? "loss" : "unresolved",
      victoryConditionId: isVictory ? `${scenario.id}:qa-victory` : null,
      sourceType: isVictory || isDefeat ? "confrontation" : null,
      sourceId: isVictory || isDefeat ? `${scenario.id}:qa-result` : null,
      winningSeatId: isVictory ? seatId : null,
      shared: isVictory ? stage !== "rivalry-result" : isDefeat ? true : null,
      achievedAtSequence: isVictory || isDefeat ? state.sequence : null
    };
    const summary = stage === "long-defeat"
      ? "Loss Pressure reached its canonical limit after the relay lattice failed across the outer settlements, leaving no stable route for the operatives to reach the final confrontation."
      : isVictory
        ? stage === "nemesis-result"
          ? "All Nemesis Champions were defeated before the Ashen Crown Nexus activated."
          : `${scenario.name} reached its canonical victory condition.`
        : isDefeat
          ? `Loss Pressure reached ${state.escalationLevel} / ${collapseLimit} and ${scenario.name} failed.`
          : stage === "final-stage"
            ? `${scenario.confrontationTitle} has begun at the Cinder Gate.`
            : "The shared Mission remains active.";
    state.lastOutcomeSummary = {
      seatId,
      movedToSectorId: player.character.currentSpaceId,
      encounterCardId: null,
      encounterTitle: isVictory ? "Mission Victory" : isDefeat ? "Mission Defeat" : null,
      encounterCardType: null,
      checkStat: null,
      die1: null,
      die2: null,
      statBonus: null,
      checkTotal: null,
      difficulty: null,
      enemyRollerSeatId: null,
      enemyDie1: null,
      enemyDie2: null,
      enemyBonus: null,
      enemyTotal: null,
      success: isVictory ? true : isDefeat ? false : null,
      summary
    };
    if (stage === "progress-gain") {
      state.eventLog.push({
        type: "SCENARIO_OBJECTIVE_PROGRESS_TRIGGERED",
        seatId,
        triggerType: "public objective",
        amount: 1,
        summary: "A severed relay node was restored. Victory Progress advanced by 1.",
        createdAt: `qa-p14-progress-${state.sequence}`
      });
    }
    if (stage === "pressure-gain") {
      state.eventLog.push({
        type: "ESCALATION_ADVANCED",
        seatId,
        amount: 1,
        modifier: 0,
        reason: "The Ash Tide advanced",
        createdAt: `qa-p14-pressure-${state.sequence}`
      });
    }
    return;
  }

  if (fixture.kind === "objective-presentation") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "action";
    state.pendingMissionSelection = null;
    player.character.completedContracts = [];
    player.character.completedMissionRecords = [];
    if (player.private.rivalryAgenda) {
      player.private.rivalryAgenda = {
        revealState: "revealLocked",
        progressCurrent: 0,
        progressRequired: player.private.rivalryAgenda.progressRequired,
        progressLabel: player.private.rivalryAgenda.progressLabel
      };
    }
    const canonicalContracts = loadContracts();
    state.availableContracts = state.availableContracts.map((entry) => ({ ...(canonicalContracts.get(entry.id) ?? entry) }));
    state.scenarioProgress[state.activeScenarioId] = fixture.stage === "shared" ? 1 : 2;

    const contract = state.availableContracts.find((entry) => entry.id === routeContractId) ?? state.availableContracts[0];
    if (!contract) throw new Error("QA fixture cannot find an objective Contract");
    const progress = fixture.stage === "contract-near" ? Math.max(0, contract.objective.type === "multiStopRoute" ? contract.objective.targets.length - 1 : 1) : 1;
    player.character.activeContract = { contractId: contract.id, progress, completedTargetIds: contract.objective.type === "multiStopRoute" ? contract.objective.targets.slice(0, progress).map((target) => target.id) : [] };

    if (fixture.stage === "replacement") {
      const completedContract = contract;
      const optionIds = state.availableContracts.filter((entry) => entry.id !== completedContract.id).slice(0, 3).map((entry) => entry.id);
      player.character.activeContract = null;
      player.character.completedContracts = [...new Set([...(player.character.completedContracts ?? []), completedContract.id])];
      player.character.completedMissionRecords = [{ missionId: completedContract.id, completedByPlayerId: seatId, completedAtSequence: state.sequence, rewardGranted: true, spent: false }];
      state.pendingMissionSelection = {
        id: `qa-objective-replacement:${state.sequence}`,
        ownerSeatId: seatId,
        completedContractId: completedContract.id,
        optionIds,
        status: "awaitingSelection",
        continuationPhase: "action",
        createdAt: "qa-objective"
      };
      return;
    }

    if (fixture.stage === "agenda-locked" || fixture.stage === "agenda-revealed" || fixture.stage === "agenda-complete") {
      const revealState = fixture.stage === "agenda-locked" ? "revealLocked" : fixture.stage === "agenda-complete" ? "completed" : "revealed";
      player.private.rivalryAgenda = {
        revealState,
        progressCurrent: fixture.stage === "agenda-complete" ? 3 : 2,
        progressRequired: 3,
        progressLabel: "Trophies held",
        ...(revealState !== "revealLocked" ? {
          revealedAtRound: 1,
          revealedBySeatId: seatId,
          publicRevealTitle: "Rivalry Agenda",
          publicRevealSummary: `${state.seats.find((entry) => entry.seatId === seatId)?.displayName ?? "An operative"} revealed a Rivalry Agenda.`
        } : {}),
        ...(revealState === "completed" ? {
          pointsAwarded: 1,
          completedAtRound: 1,
          completedBySeatId: seatId,
          publicCompletionTitle: "Rivalry Agenda",
          publicCompletionSummary: "An operative completed a Rivalry Agenda.",
          privateCompletionSummary: "Your private Agenda is complete."
        } : {})
      };
      return;
    }

    if (fixture.stage === "private-resolution") {
      state.resolutionSource = "contract";
      state.activeResolution = {
        id: `qa-objective-private:${state.sequence}`,
        playerId: seatId,
        source: "contract",
        stage: "outcome_summary",
        card: { id: contract.id, title: contract.name, type: "contract", artType: "contract" },
        outcome: { title: "Contract complete", text: "The private Contract reward has resolved.", effects: ["Reward granted once."] },
        origin: { sourceDeck: "contract", sourceSectorId: player.sectorId, sourceEventId: `qa-objective:${state.sequence}`, queuePosition: 0, privacy: "owner" }
      };
      return;
    }

    if (fixture.stage === "long-content") {
      const contractIndex = state.availableContracts.findIndex((entry) => entry.id === contract.id);
      state.availableContracts[contractIndex] = {
        ...contract,
        name: "The Ordinance of the Last Unbroken Signal-Bearer Beyond the Seven Silent Relays",
        text: "Carry the sealed concordance through every abandoned station without surrendering its final name to the listening dark."
      };
    }
    return;
  }

  if (fixture.kind === "waiting-handoff") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);

    if (fixture.stage === "private-choice") {
      const threat = loadThreatCards().get("gate-tax-collectors");
      if (!threat) throw new Error("QA fixture cannot find payment encounter");
      state.phase = "resolution";
      state.currentEncounter = threat;
      state.pendingEncounterDecision = {
        decisionId: "qa-p4-private-payment",
        decisionVersion: 1,
        seatId,
        sourceCardId: threat.id,
        sourceResolutionId: "qa-p4-private-payment-resolution",
        sourceBranch: "woundOnLoss",
        decisionKey: "qa-p4-payment",
        mode: "optional",
        prompt: "Pay 1 Salvage or accept the authored consequence.",
        salvageCost: 1,
        paidOptionId: "pay",
        paidLabel: "Pay 1 Salvage",
        paidEffect: { type: "none", summary: "Payment accepted." },
        declineOptionId: "accept-loss",
        declineLabel: "Accept loss",
        declineEffect: { type: "none", summary: "The consequence is accepted." },
        unavailableEffect: { type: "none", summary: "Payment unavailable." },
        legalOptionIds: ["pay", "accept-loss"],
        createdAt: "qa-p4",
        status: "pending"
      };
      return;
    }

    if (fixture.stage === "end-turn") {
      state.phase = "action";
      return;
    }

    if (fixture.stage === "handoff" || fixture.stage === "next-turn") {
      const fromSeatId = seatId;
      const fromIndex = state.turnOrder.indexOf(fromSeatId);
      const nextIndex = state.turnOrder.length > 1 ? (fromIndex + 1) % state.turnOrder.length : fromIndex;
      state.activeSeatIndex = Math.max(0, nextIndex);
      state.phase = "navigation";
      state.eventLog.push({ type: "TURN_COMPLETED", seatId: fromSeatId, createdAt: `qa-p4:${state.sequence}` });
      return;
    }

    state.phase = "resolution";
    const long = fixture.stage === "long-result";
    const outcomeText = long
      ? "The relay steadies. Your signal holds through the ash, the route remains open, and the operative may continue after reviewing the resolved effects."
      : "The relay steadies and the route remains open.";
    state.activeResolution = {
      id: `qa-p4-result:${fixture.stage}`,
      playerId: seatId,
      source: "threat",
      stage: "outcome_summary",
      card: { id: "qa-p4-ashfall-shear", title: "Ashfall Shear", type: "hazard", artType: "threat" },
      battle: { stat: "signal", difficulty: 6, modifiers: [{ label: "Base Signal", value: player.character.stats.signal }] },
      roll: { dice: [3, 4], baseTotal: 7, modifierTotal: player.character.stats.signal, finalTotal: 7 + player.character.stats.signal, target: 6, success: true },
      outcome: {
        title: "Hazard cleared",
        text: outcomeText,
        effects: long ? ["Gain 1 Salvage.", "Clear the route marker.", "Continue the turn."] : ["Continue the turn."]
      }
    };
    state.lastOutcomeSummary = {
      seatId,
      movedToSectorId: player.sectorId,
      encounterCardId: "qa-p4-ashfall-shear",
      encounterTitle: "Ashfall Shear",
      encounterCardType: "hazard",
      checkStat: "signal",
      die1: 3,
      die2: 4,
      statBonus: player.character.stats.signal,
      checkTotal: 7 + player.character.stats.signal,
      difficulty: 6,
      enemyRollerSeatId: null,
      enemyDie1: null,
      enemyDie2: null,
      enemyBonus: null,
      enemyTotal: null,
      success: true,
      summary: outcomeText
    };
    return;
  }

  if (fixture.kind === "phone-action") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "action";
    state.resolutionSource = null;

    if (fixture.stage === "free-action" || fixture.stage === "many-actions") {
      if (fixture.stage === "many-actions") {
        player.character.heldGear = [...loadGear().values()].slice(0, 6).map((item, index) => ({
          ...item,
          instanceId: `qa-action:${index}:${item.id}`
        }));
        player.character.followers = [...loadFollowers().values()].slice(0, 3);
      }
      return;
    }

    if (fixture.stage === "challenge-ready") {
      const challenge = [...loadTileChallenges().values()][0];
      if (!challenge) throw new Error("QA fixture cannot find a tile Challenge");
      const encounter = {
        id: challenge.id,
        type: "threat" as const,
        cardType: "hazard" as const,
        title: challenge.name,
        text: `Recurring ${challenge.challengeType} challenge.`,
        flavor: challenge.lore,
        severity: Math.max(1, Math.min(5, Math.ceil(challenge.difficulty / 3))),
        stat: challenge.testStat,
        difficulty: challenge.difficulty,
        successEffect: challenge.successEffect,
        failEffect: challenge.failureEffect
      };
      state.currentEncounter = encounter;
      state.resolutionSource = "tileChallenge";
      state.pendingTileChallenge = {
        id: `qa-action:pending:${challenge.id}`,
        challengeId: challenge.id,
        sectorId: player.sectorId,
        seatId,
        challengeType: challenge.challengeType,
        testStat: challenge.testStat,
        difficulty: challenge.difficulty,
        sourceTags: challenge.tags,
        successEffect: challenge.successEffect,
        failureEffect: challenge.failureEffect,
        authoredOrder: challenge.authoredOrder,
        totalChallenges: 1,
        rolled: false,
        modifierSources: [],
        createdAt: "qa-action"
      };
      state.activeResolution = {
        id: `qa-action:resolution:${challenge.id}`,
        playerId: seatId,
        source: challenge.challengeType === "anomaly" ? "anomaly" : "threat",
        stage: "card_reveal",
        card: { id: challenge.artCardId, title: challenge.name, type: challenge.challengeType, flavor: challenge.lore, artType: "threat" },
        battle: { enemyName: challenge.name, stat: challenge.testStat, difficulty: challenge.difficulty, modifiers: [] }
      };
      return;
    }

    const threatId = fixture.stage === "event-ready" ? "trench-blast" : "suture-storm";
    const threat = loadThreatCards().get(threatId);
    if (!threat) throw new Error(`QA fixture cannot find ${threatId}`);
    state.currentEncounter = threat;
    state.resolutionSource = "encounter";
    state.activeResolution = {
      id: `qa-action:resolution:${threat.id}`,
      playerId: fixture.stage === "blocked-start" ? "seat-restored-elsewhere" : seatId,
      source: "threat",
      stage: "card_reveal",
      card: { id: threat.id, title: threat.title, type: threat.cardType, flavor: threat.flavor, artType: "threat" },
      battle: { stat: threat.stat, difficulty: threat.difficulty, modifiers: [] }
    };
    return;
  }

  if (fixture.kind === "salvage-resolution") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    const isPayment = fixture.stage === "payment" || fixture.stage === "optional-payment" || fixture.stage === "insufficient";
    const threatId = fixture.stage === "optional-payment"
      ? "rust-choir-peddlers"
      : fixture.stage === "battle-reward"
        ? "latchspire-raider"
        : "gate-tax-collectors";
    const threat = fixture.stage === "event-reward" ? null : loadThreatCards().get(threatId);
    const anomaly = fixture.stage === "event-reward"
      ? loadAnomalyCards().get("anomaly-bellrain-inversion")
      : null;
    if (!threat && !anomaly) throw new Error(`QA fixture cannot load Salvage card for ${fixture.stage}`);
    if (threat && threat.cardType !== "enemy") throw new Error(`QA fixture ${threat.id} must be an enemy`);
    const cardId = threat?.id ?? anomaly!.id;
    const cardTitle = threat?.title ?? anomaly!.title;
    const testedStat = threat?.stat ?? "signal";
    const difficulty = threat?.difficulty ?? 7;
    const effect = fixture.stage === "optional-payment"
      ? threat?.defeatReward
      : isPayment
        ? threat?.woundOnLoss
        : fixture.stage === "battle-reward"
          ? threat?.defeatReward
          : anomaly?.resolveEffect;
    if (!effect) throw new Error(`QA fixture card ${cardId} has no Salvage effect`);
    const success = !isPayment;
    const source = fixture.stage === "event-reward" ? "anomaly" as const : "threat" as const;
    player.character.salvage = fixture.stage === "insufficient" ? 0 : 3;
    if (fixture.stage === "optional-payment") player.character.wounds = Math.max(1, player.character.wounds);
    state.phase = "resolution";
    state.resolutionSource = "encounter";
    state.currentEncounter = threat ?? null;
    state.pendingEffect = effect;
    state.pendingEncounterDecision = null;
    state.resolvedEncounterDecisionIds = [];
    state.activeResolution = {
      id: `qa-salvage:${fixture.stage}`,
      playerId: seatId,
      source,
      stage: "roll_result",
      card: { id: cardId, title: cardTitle, type: fixture.stage === "event-reward" ? "anomaly" : "enemy", artType: fixture.stage === "event-reward" ? "anomaly" : "threat" },
      battle: { stat: testedStat, difficulty, modifiers: [] },
      roll: { dice: success ? [6, 6] : [1, 1], baseTotal: success ? 12 : 2, modifierTotal: 0, finalTotal: success ? 12 : 2, target: difficulty, success },
      outcome: { title: success ? "Reward pending" : "Loss pending", text: success ? "The Salvage reward is ready to resolve." : "The authored loss is ready to resolve.", effects: [success ? "Gain 1 Salvage." : "Payment consequence pending."] }
    };
    state.lastOutcomeSummary = {
      seatId,
      movedToSectorId: player.sectorId,
      encounterCardId: cardId,
      encounterTitle: cardTitle,
      encounterCardType: fixture.stage === "event-reward" ? null : "enemy",
      checkStat: testedStat,
      die1: success ? 6 : 1,
      die2: success ? 6 : 1,
      statBonus: 0,
      checkTotal: success ? 12 : 2,
      difficulty,
      enemyRollerSeatId: null,
      enemyDie1: null,
      enemyDie2: null,
      enemyBonus: null,
      enemyTotal: null,
      success,
      summary: success ? `${cardId} succeeded.` : `${cardId} failed.`
    };
    return;
  }

  if (fixture.kind === "scar-system") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "action";
    state.pendingScarChoice = null;
    state.pendingScarRemovalChoice = null;
    state.pendingScarThreshold = null;
    player.character.status = "active";
    player.character.wounds = 1;
    player.character.scars = fixture.stage === "adaptation-available" || fixture.stage === "adaptation-used"
      ? ["scar-wound-9"]
      : fixture.stage === "owned-one" || fixture.stage === "removal"
      ? ["scar-wound-1"]
      : fixture.stage === "owned-two" || fixture.stage === "third-warning" || fixture.stage === "retired"
        ? ["scar-wound-1", "scar-wound-2"]
        : [];

    if (fixture.stage === "adaptation-available" || fixture.stage === "adaptation-used") {
      const elite = [...loadThreatCards().values()].find((card) => card.cardType === "enemy" && card.severity >= 5);
      if (!elite) throw new Error("QA fixture requires an elite enemy");
      const encounter = { ...elite, stat: "grit" as const };
      state.phase = "resolution";
      state.currentEncounter = encounter;
      state.activeResolution = {
        id: "qa-scar-adaptation-window",
        playerId: seatId,
        source: "threat",
        stage: "battle_setup",
        card: { id: encounter.id, title: encounter.title, type: "enemy" },
        battle: { stat: "grit", difficulty: encounter.difficulty, modifiers: [] }
      };
      if (fixture.stage === "adaptation-used") {
        state.scarUsage = [{
          usageId: "qa-scar-adaptation-used",
          seatId,
          scarId: "scar-wound-9",
          ruleKey: "elite-grit-bonus",
          scope: "round",
          scopeId: "round:0",
          sourceEventId: "qa-scar-adaptation-used",
          createdAt: "qa-scar-system"
        }];
      }
      return;
    }

    if (fixture.stage === "choice" || fixture.stage === "third-warning") {
      const offered = createScarChoice(
        state,
        seatId,
        {
          type: "gain_scar_choice",
          amount: 1,
          source: fixture.stage === "third-warning" ? "rift" : "flesh",
          sourceCardId: "qa-scar-system"
        },
        `qa-scar-system:${fixture.stage}`,
        "qa-scar-system"
      );
      Object.assign(state, offered.state);
      state.sequence += 1;
      return;
    }

    if (fixture.stage === "removal") {
      placePlayer(state, seatId, "middle_scar_surgery");
      player.character.salvage = 6;
      state.pendingScarRemovalChoice = {
        choiceId: "qa-scar-removal",
        ownerSeatId: seatId,
        sectorId: "middle_scar_surgery",
        visitId: "qa-scar-removal-visit",
        scarIds: ["scar-wound-1"],
        salvageCost: 4,
        createdAt: "qa-scar-system"
      };
      return;
    }

    if (fixture.stage === "retired") {
      player.character.status = "recalled";
      player.character.wounds = state.woundThreshold;
      player.character.scars = [];
      state.lastOutcomeSummary = {
        seatId,
        movedToSectorId: player.sectorId,
        encounterCardId: "qa-third-scar-retirement",
        encounterTitle: "The Wound Did Not Close",
        encounterCardType: null,
        checkStat: null,
        die1: null,
        die2: null,
        statBonus: null,
        checkTotal: null,
        difficulty: null,
        enemyRollerSeatId: null,
        enemyDie1: null,
        enemyDie2: null,
        enemyBonus: null,
        enemyTotal: null,
        success: false,
        summary: "A third Scar retired the operative after the resolution stack completed. Replacement recruitment is required."
      };
      return;
    }

    return;
  }

  if (fixture.kind === "host-rare") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "action";
    state.pendingSutureStormConsequence = null;
    state.pendingDisplacement = null;
    state.pendingScarConsequence = null;
    state.pendingScarConsequenceQueue = [];

    if (fixture.stage === "stacked-operatives") {
      for (const operative of state.players) {
        placePlayer(state, operative.seatId, "outer_waymarket");
      }
      state.phase = "navigation";
      state.movementRolls = { ...(state.movementRolls ?? {}), [seatId]: 2 };
      return;
    }

    if (fixture.stage === "reaction-pending") {
      player.character.wounds = 1;
      state.pendingSutureStormConsequence = {
        seatId,
        sourceCardId: "suture-storm",
        sourceResolutionId: "qa:suture-storm:failed-check",
        sourceEventId: "qa:suture-storm:ordered-consequence",
        stage: "afterInitialWound",
        requestedWounds: 1,
        preventedWounds: 0,
        actualWounds: 1,
        resultingWounds: 1,
        resultingStatus: "active",
        displacement: {
          type: "forcedDisplacement",
          direction: "counterclockwise",
          distance: 1,
          sameRing: true,
          failureStillCounts: true,
          fallbackEffect: { type: "take_wound", amount: 1 }
        },
        createdAt: "qa-host-rare-reaction"
      };
      return;
    }

    if (fixture.stage === "reaction-final") {
      player.character.wounds = 1;
      state.lastOutcomeSummary = {
        seatId,
        movedToSectorId: player.sectorId,
        encounterCardId: "suture-storm",
        encounterTitle: "Suture Storm",
        encounterCardType: "hazard",
        checkStat: "signal",
        die1: 2,
        die2: 2,
        statBonus: 2,
        checkTotal: 6,
        difficulty: 9,
        enemyRollerSeatId: null,
        enemyDie1: null,
        enemyDie2: null,
        enemyBonus: null,
        enemyTotal: null,
        success: false,
        summary: "Suture Storm resolved. The operative suffered 1 Wound."
      };
      return;
    }

    if (fixture.stage === "recall-triggered") {
      player.character.wounds = state.woundThreshold;
      player.character.status = "recalled";
      player.character.scars = [...player.character.scars.filter((id) => id !== "scar-wound-1"), "scar-wound-1"];
      state.lastOutcomeSummary = {
        seatId,
        movedToSectorId: player.sectorId,
        encounterCardId: "qa-wound-threshold",
        encounterTitle: "Wound threshold",
        encounterCardType: null,
        checkStat: null,
        die1: null,
        die2: null,
        statBonus: null,
        checkTotal: null,
        difficulty: null,
        enemyRollerSeatId: null,
        enemyDie1: null,
        enemyDie2: null,
        enemyBonus: null,
        enemyTotal: null,
        success: false,
        summary: "Wound threshold reached. Operative recalled and Ash-Lanced Scar gained."
      };
      return;
    }

    player.character.status = "active";
    player.character.scars = [...player.character.scars.filter((id) => id !== "scar-wound-2"), "scar-wound-2"];
    if (fixture.stage === "scar-pending") {
      state.pendingScarConsequence = {
        reactionId: "qa-scar-trigger:seat-1:scar-wound-2:0",
        seatId,
        scarInstanceId: `${seatId}:scar-wound-2:0`,
        scarCardId: "scar-wound-2",
        scarTitle: "Static Burn",
        triggerType: "beforeTest",
        sourceEventId: "qa-scar-trigger",
        pendingEffects: [{ effectId: "qa-scar-trigger:0", effect: { type: "gain_note", text: "Static Burn broadcast a warning through the operative." } }],
        createdAt: "qa-host-rare-scar",
        status: "pending"
      };
      return;
    }

    player.private.notes = [...player.private.notes, "Static Burn broadcast a warning through the operative."];
    state.resolvedScarSourceEventIds = [...(state.resolvedScarSourceEventIds ?? []), "qa-scar-trigger"];
    state.eventLog = [...state.eventLog, {
      type: "CONTINUE_SCAR_CONSEQUENCE",
      seatId,
      reactionId: "qa-scar-trigger:seat-1:scar-wound-2:0",
      createdAt: "qa-host-rare-scar-resolved",
      scarTitle: "Static Burn",
      sourceEventId: "qa-scar-trigger",
      summary: "Static Burn consequence resolved."
    }];
    return;
  }

  if (fixture.kind === "phone-battle") {
    setPhoneBattleFixture(state, seatId, fixture.stage);
    return;
  }

  if (fixture.kind === "host-state") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    const seat = state.seats.find((entry) => entry.seatId === seatId);
    if (!player || !seat) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "action";
    state.status = fixture.stage === "victory" || fixture.stage === "loss" ? "ended" : "active";
    seat.connected = fixture.stage !== "disconnected";
    state.scenarioPreparation.resources = fixture.stage === "scenario-preparation" ? { seals: 2, wards: 1 } : {};
    state.scenarioPreparation.completedObjectiveIds = fixture.stage === "scenario-preparation" ? ["qa-ward-restored"] : [];
    if (fixture.stage === "victory" || fixture.stage === "loss") {
      state.winnerSeatId = fixture.stage === "victory" ? seatId : null;
      state.scenarioResult = {
        status: fixture.stage,
        victoryConditionId: fixture.stage === "victory" ? "qa-final-confrontation" : null,
        sourceType: "confrontation",
        sourceId: "qa-host-endgame",
        winningSeatId: fixture.stage === "victory" ? seatId : null,
        shared: fixture.stage === "victory",
        achievedAtSequence: state.sequence
      };
    }
    return;
  }

  if (fixture.kind === "follower") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    const follower = loadFollowers().get("lucy-hell-puppy");
    if (!player || !follower) throw new Error("QA fixture cannot attach Lucy");
    state.phase = "action";
    player.character.followers = [{
      ...follower,
      instanceId: "qa-follower:lucy-hell-puppy",
      exhausted: fixture.stage === "used"
    }];
    state.lastOutcomeSummary = fixture.stage === "acquired" ? {
      seatId,
      movedToSectorId: player.character.currentSpaceId,
      encounterCardId: "artifact-lucy-hell-puppy",
      encounterTitle: "Lucy, Hell Puppy",
      encounterCardType: null,
      checkStat: null,
      die1: null,
      die2: null,
      statBonus: null,
      checkTotal: null,
      difficulty: null,
      enemyRollerSeatId: null,
      enemyDie1: null,
      enemyDie2: null,
      enemyBonus: null,
      enemyTotal: null,
      success: true,
      summary: "Lucy, Hell Puppy joined the active operative as a legendary follower."
    } : null;
    return;
  }

  if (fixture.kind === "relic-trade") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "action";
    state.movementRolls = undefined;
    player.character.completedContracts = Array.from(
      { length: fixture.completedContracts },
      (_, index) => `qa-completed-contract-${index + 1}`
    );
    placePlayer(state, seatId, "outer_surgery_tent");
    return;
  }

  if (fixture.kind === "movement-journey") {
    state.phase = "navigation";
    state.movementRolls = { ...(state.movementRolls ?? {}), [seatId]: 2 };
    state.pendingTileChallenge = null;
    placePlayer(state, seatId, "scorched-road");
    if (fixture.withChoirLantern) {
      const player = state.players.find((entry) => entry.seatId === seatId);
      const lantern = loadGear().get("choir-lantern");
      if (!player || !lantern) throw new Error("QA fixture cannot equip Choir Lantern");
      player.character.heldGear = [
        ...player.character.heldGear.filter((item) => item.id !== lantern.id),
        { ...lantern, instanceId: "qa-choir-lantern", currentCharges: 2, maxCharges: 2 }
      ];
      player.character.equippedGear.utility = lantern.id;
    }
    return;
  }

  if (fixture.kind === "tile-arrival") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.sequence += 1;
    clearResolution(state);
    state.pendingEncounterDecision = null;
    state.pendingMemoryTaxChoice = null;
    state.pendingForcedDestinationChoice = null;
    state.pendingDisplacement = null;
    state.pendingDisplacementArrival = null;
    state.pendingEquipmentSuppressionChoice = null;
    state.pendingFailureReaction = null;
    state.pendingStaticIntercessionReaction = null;
    state.pendingScarChoice = null;
    state.pendingScarRemovalChoice = null;
    state.pendingScarConsequence = null;
    state.pendingScarThreshold = null;
    state.pendingMissionSelection = null;
    state.cooperativeAssistance = null;
    state.pendingCooperativeTest = null;
    state.status = "active";
    state.activeSeatIndex = Math.max(0, state.turnOrder.indexOf(seatId));
    const sectorId = fixture.stage === "multi-effect"
      ? "middle_guardian_span"
      : fixture.stage === "optional-shop"
        ? "outer_waymarket"
        : "ashen-chapel";
    player.sectorId = sectorId;
    player.character.currentSpaceId = sectorId;
    const boardSpace = getBoardSpace(sectorId);
    if (!boardSpace) throw new Error(`QA fixture cannot find board space ${sectorId}`);
    const threatLanes = [...boardSpace.threatIcons];
    const threatRuleIds = threatLanes.map((lane, index) => `threat:${index}:${lane}`);
    state.tileArrivalThreatProgress = {
      arrivalId: `qa:arrival:${seatId}:${sectorId}`,
      seatId,
      sectorId,
      threatLanes,
      threatRuleIds,
      nextThreatIconIndex: fixture.stage === "optional-shop" ? threatLanes.length : 0
    };
    state.phase = fixture.stage === "optional-shop" ? "action" : fixture.stage === "single-next-turn" ? "navigation" : "sector";

    if (fixture.stage === "challenge") {
      const challenge = [...loadTileChallenges().values()].find((entry) => entry.sectorId === sectorId);
      if (!challenge) throw new Error(`QA fixture cannot find tile challenge for ${sectorId}`);
      const createdAt = "qa:tile-arrival:challenge";
      state.phase = "action";
      state.resolutionSource = "tileChallenge";
      state.tileChallengeProgress = { seatId, sectorId, resolvedChallengeIds: [] };
      state.pendingTileChallenge = {
        id: `qa:tile-challenge:${challenge.id}`,
        challengeId: challenge.id,
        sectorId,
        seatId,
        challengeType: challenge.challengeType,
        testStat: challenge.testStat,
        difficulty: challenge.difficulty,
        sourceTags: challenge.tags,
        successEffect: challenge.successEffect,
        failureEffect: challenge.failureEffect,
        authoredOrder: challenge.authoredOrder,
        totalChallenges: 1,
        rolled: false,
        modifierSources: [],
        createdAt
      };
      state.currentEncounter = {
        id: challenge.id,
        type: "threat",
        cardType: "hazard",
        title: challenge.name,
        text: `Recurring ${challenge.challengeType} challenge at ${boardSpace.name}.`,
        flavor: challenge.lore,
        severity: Math.max(1, Math.min(5, Math.ceil(challenge.difficulty / 3))),
        stat: challenge.testStat,
        difficulty: challenge.difficulty,
        successEffect: challenge.successEffect,
        failEffect: challenge.failureEffect,
        enemyFamily: "hazard",
        threatLane: "blue",
        rarity: "common",
        tempo: "stall"
      };
      state.activeResolution = {
        id: `qa:tile-challenge:${seatId}:${challenge.id}`,
        playerId: seatId,
        source: challenge.challengeType === "anomaly" ? "anomaly" : "threat",
        stage: "battle_setup",
        card: { id: challenge.artCardId, title: challenge.name, type: challenge.challengeType, flavor: challenge.lore, artType: "threat" },
        battle: { enemyName: challenge.name, stat: challenge.testStat, difficulty: challenge.difficulty, modifiers: [] }
      };
    }
    return;
  }

  if (fixture.kind === "host-shop") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "action";
    state.movementRolls = undefined;
    player.character.salvage = fixture.stage === "insufficient" ? 1 : 7;
    player.character.completedContracts = fixture.stage === "artifacts"
      ? ["qa-contract-1", "qa-contract-2", "qa-contract-3"]
      : [];
    if (fixture.stage === "sell") {
      const saleItem = loadGear().get("ashlock-cleaver");
      if (saleItem) player.character.heldGear = [{ ...saleItem, instanceId: "qa:shop:sale" }];
    } else if (fixture.stage === "services") {
      const repairItem = loadGear().get("route-star");
      if (repairItem) player.character.heldGear = [{ ...repairItem, instanceId: "qa:shop:repair", currentCharges: 0 }];
    } else if (fixture.stage === "sold-out") {
      const ownedItem = loadGear().get("ashlock-cleaver");
      if (ownedItem) player.character.heldGear = [{ ...ownedItem, instanceId: "qa:shop:owned" }];
    } else {
      player.character.heldGear = [];
    }

    const sectorId = fixture.stage === "artifacts" || fixture.stage === "locked"
      ? "middle_scar_surgery"
      : fixture.stage === "single-category"
        ? "outer_surgery_tent"
        : "kettleward-foundry";
    placePlayer(state, seatId, sectorId);
    state.shopBrowseSelection = {
      seatId,
      sectorId,
      view: fixture.stage === "items"
        ? "supplies"
        : fixture.stage === "services"
          ? "services"
          : fixture.stage === "sell"
            ? "sell"
        : fixture.stage === "equipment" || fixture.stage === "insufficient" || fixture.stage === "long-lore" || fixture.stage === "sold-out"
          ? "equipment"
          : fixture.stage === "artifacts"
            ? "artifacts"
            : "categories",
      selectedId: fixture.stage === "items"
        ? "field-lens"
        : fixture.stage === "long-lore"
          ? "signal-pike"
        : fixture.stage === "equipment" || fixture.stage === "insufficient" || fixture.stage === "sold-out"
            ? "ashlock-cleaver"
            : fixture.stage === "sell"
              ? "qa:shop:sale"
              : fixture.stage === "services"
                ? "repair-gear"
            : null,
      updatedAt: `qa:host-shop:${fixture.stage}`
    };

    if (["items", "equipment", "insufficient", "long-lore", "sold-out"].includes(fixture.stage)) {
      const supplies = fixture.stage === "items";
      state.shopStockReveals = [{
        seatId,
        sectorId,
        serviceId: supplies ? "buy-supplies" : "buy-gear",
        shopName: getBoardSpace(sectorId)?.name ?? sectorId,
        stockIds: supplies
          ? ["field-lens", "bridge-spike", "ember-poultice", "surveyor-chalk"]
          : fixture.stage === "long-lore"
            ? ["signal-pike", "saintplate-harness", "scrap-drone"]
            : ["ashlock-cleaver", "chapel-guard-harness", "emberlock-pistol", "ironhide-bracers"],
        createdAt: `qa:host-shop:${fixture.stage}`
      }];
    }
    return;
  }

  if (fixture.kind === "inventory-player-card") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    clearResolution(state);
    state.phase = "action";
    player.character.wounds = 1;
    player.character.scars = [];
    player.character.salvage = 5;
    player.character.followers = [];
    player.character.heldGear = [];
    player.character.equippedGear = { weapon: null, armor: null, utility: null };
    player.character.equippedGearInstances = { weapon: null, armor: null, utility: null };

    const addGear = (id: string, options: { equipped?: boolean; exhausted?: boolean; charges?: number; name?: string; activeText?: string; flavor?: string } = {}) => {
      const definition = loadGear().get(id);
      if (!definition) throw new Error(`QA fixture cannot load Gear ${id}`);
      const instanceId = `qa:p7:${fixture.stage}:${id}`;
      const item = {
        ...definition,
        instanceId,
        ...(options.exhausted !== undefined ? { exhausted: options.exhausted } : {}),
        ...(options.charges !== undefined ? { currentCharges: options.charges } : {}),
        ...(options.name ? { name: options.name } : {}),
        ...(options.activeText ? { activeText: options.activeText } : {}),
        ...(options.flavor ? { flavor: options.flavor } : {})
      };
      player.character.heldGear.push(item);
      if (options.equipped) {
        player.character.equippedGear[item.slot] = item.id;
        player.character.equippedGearInstances![item.slot] = instanceId;
      }
    };

    if (fixture.stage === "empty" || fixture.stage === "none-relevant") return;
    if (fixture.stage === "wounds-scars") {
      player.character.wounds = Math.max(1, state.woundThreshold - 1);
      player.character.scars = ["ash-lung", "glass-memory"];
      addGear("rivetplate-vest", { equipped: true });
      return;
    }
    if (fixture.stage === "battle" || fixture.stage === "relevant-one") {
      addGear("black-route-fuse");
      addGear("rivetplate-vest", { equipped: true });
      setPhoneBattleFixture(state, seatId, "battle-setup");
      return;
    }
    if (fixture.stage === "relevant-many") {
      addGear("black-route-fuse");
      addGear("red-march-warbell", { equipped: true });
      const follower = loadFollowers().get("fandiablos");
      if (follower) player.character.followers = [{ ...follower, instanceId: "qa:p7:fandiablos" }];
      setPhoneBattleFixture(state, seatId, "battle-setup");
      return;
    }
    if (fixture.stage === "movement") {
      addGear("ashen-route-compass", { equipped: true, charges: 2 });
      addGear("route-star", { equipped: true, charges: 2 });
      state.phase = "navigation";
      return;
    }
    if (fixture.stage === "equipped") {
      addGear("nailspike-maul", { equipped: true });
      addGear("rivetplate-vest", { equipped: true });
      addGear("oathchain-lens", { equipped: true, charges: 2 });
      return;
    }
    if (fixture.stage === "carried") {
      addGear("nailspike-maul");
      addGear("rivetplate-vest");
      addGear("field-lens");
      return;
    }
    if (fixture.stage === "consumable") {
      addGear("artifact-void-salt-poultice");
      player.character.wounds = 2;
      return;
    }
    if (fixture.stage === "charged" || fixture.stage === "active-artifact") {
      addGear("oathchain-lens", { equipped: true, charges: 2 });
      return;
    }
    if (fixture.stage === "exhausted") {
      addGear("red-march-warbell", { equipped: true, exhausted: true });
      setPhoneBattleFixture(state, seatId, "battle-setup");
      return;
    }
    if (fixture.stage === "wrong-timing") {
      addGear("route-star", { equipped: true, charges: 2 });
      return;
    }
    if (fixture.stage === "passive-artifact") {
      addGear("void-key", { equipped: true, charges: 0 });
      return;
    }
    if (fixture.stage === "long-copy") {
      addGear("route-star", {
        equipped: true,
        charges: 1,
        name: "The Last Cartographer's Unreasonably Long Breach-Route Instrument",
        activeText: "Choose one server-authorized route variant without changing movement distance, destination legality, gate requirements, blockers, tolls, ferries, bridges, or scenario restrictions.",
        flavor: "The instrument carries the scratched testimony of every route keeper who vanished while mapping the breach."
      });
      state.phase = "navigation";
      return;
    }
    if (fixture.stage === "missing-art") {
      addGear("black-route-fuse");
      return;
    }
    if (fixture.stage === "many") {
      ["nailspike-maul", "rivetplate-vest", "field-lens", "bridge-spike", "ember-poultice", "route-star", "oathchain-lens", "black-route-fuse"].forEach((id) => addGear(id));
      return;
    }
    if (fixture.stage === "use-result" || fixture.stage === "reconnect") {
      addGear("artifact-void-salt-poultice");
      player.character.wounds = 0;
      state.lastOutcomeSummary = {
        seatId,
        movedToSectorId: player.sectorId,
        encounterCardId: "qa:p7:use-result",
        encounterTitle: "Equipment resolved",
        encounterCardType: null,
        summary: "Void-Salt Poultice used. Wound restored.",
        checkStat: "signal",
        die1: 0,
        die2: 0,
        statBonus: 0,
        checkTotal: 0,
        difficulty: 0,
        enemyRollerSeatId: null,
        enemyDie1: null,
        enemyDie2: null,
        enemyBonus: null,
        enemyTotal: null,
        success: true,
      };
      return;
    }

    addGear("nailspike-maul", { equipped: true });
    addGear("field-lens");
    addGear("oathchain-lens", { equipped: true, charges: 2 });
    return;
  }

  if (fixture.kind === "cinder-wattle") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    const cw = loadCharacters().get("cinder-wattle");
    if (!player || !cw) throw new Error("QA fixture cannot load Cinder Wattle");
    player.character = {
      ...cw,
      salvage: player.character.salvage ?? (state.sessionMode === "single-player" ? 4 : 3),
      heldGear: player.character.heldGear,
      equippedGear: player.character.equippedGear
    };
    state.phase = "action";

    if (fixture.stage === "player-card") return;
    const threat = loadThreatCards().get(fixture.stage === "hazard-result" ? "glass-chime-swarm" : "lantern-ash-ghoul");
    if (!threat) throw new Error("QA fixture cannot load Cinder Wattle test threat");
    state.currentEncounter = threat;
    state.activeResolution = {
      id: `qa-cw:${fixture.stage}`,
      playerId: seatId,
      source: "threat",
      stage: fixture.stage === "ability-available" || fixture.stage === "ability-prepared" ? "battle_setup" : "outcome_summary",
      card: { id: threat.id, title: threat.title, type: threat.cardType, flavor: threat.flavor, artType: "threat" },
      battle: {
        stat: threat.stat,
        difficulty: threat.difficulty,
        modifiers: [
          { label: `Base ${threat.stat}`, value: 3 },
          ...(fixture.stage === "ability-prepared" || fixture.stage === "battle-result" || fixture.stage === "hazard-result"
            ? [{ label: "Scrap-Crowned Instinct", value: 1 }]
            : [])
        ]
      },
      ...(fixture.stage === "ability-used" || fixture.stage === "battle-result" || fixture.stage === "hazard-result"
        ? {
            roll: { dice: [3, 4], baseTotal: 7, modifierTotal: 4, finalTotal: 11, target: threat.difficulty, success: true },
            outcome: { title: "Instinct holds", text: "CW's warning click lands before the breach answers.", effects: [] }
          }
        : {})
    };
    if (["ability-prepared", "ability-used", "battle-result", "hazard-result"].includes(fixture.stage)) {
      state.eventLog.push({
        type: "ABILITY_TRIGGERED",
        seatId,
        abilityId: "scrap-crowned-instinct",
        sourceId: threat.id,
        testedStat: threat.stat,
        rollModifier: { label: "Scrap-Crowned Instinct", value: 1, stat: threat.stat, mode: threat.cardType === "enemy" ? "battle" : "check" },
        summary: `Scrap-Crowned Instinct prepared +1 ${threat.stat}.`,
        createdAt: "qa-cinder-wattle-instinct"
      });
    }
    if (["ability-used", "battle-result", "hazard-result"].includes(fixture.stage)) {
      state.eventLog.push({ type: threat.cardType === "enemy" ? "COMBAT_RESOLVED" : "CHECK_ROLLED", seatId, createdAt: "qa-cinder-wattle-resolved" });
    }
    return;
  }

  if (fixture.kind === "cooperative-assistance") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    const helpers = state.turnOrder
      .filter((helperSeatId) => helperSeatId !== seatId)
      .map((helperSeatId) => state.players.find((entry) => entry.seatId === helperSeatId))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .slice(0, 2);
    if (!player || helpers.length < 2) throw new Error("QA cooperative assistance fixture requires three active operatives");
    for (const seat of state.seats) {
      if (state.turnOrder.includes(seat.seatId)) {
        seat.connected = true;
        seat.characterSelected = true;
      }
    }
    state.status = "active";
    state.sessionMode = "multiplayer";
    state.gameMode = "standard";
    state.interactionMode = "co-op";
    state.phase = "action";
    state.pendingCooperativeTest = null;
    state.cooperativeAssistance = null;

    if (fixture.stage === "scenario-node") {
      state.activeScenarioId = "scenario_broken_concordance";
      placePlayer(state, seatId, "black-relay-spire");
      state.scenarioPreparation.resources = { concordanceNodes: 1 };
      state.scenarioPreparation.completedObjectiveIds = ["concordance-node-webglass"];
      return;
    }

    const threat = loadThreatCards().get("ash-choir-crusader");
    if (!threat || threat.cardType !== "enemy") throw new Error("QA assistance threat is missing");
    state.currentEncounter = threat;
    state.activeResolution = {
      id: "qa-cooperative-assistance",
      playerId: seatId,
      source: "threat",
      stage: fixture.stage === "result" ? "outcome_summary" : "battle_setup",
      card: { id: threat.id, title: threat.title, type: "enemy", flavor: threat.flavor, artType: "threat" },
      battle: { enemyName: threat.enemyName ?? threat.title, stat: threat.stat, difficulty: threat.difficulty, modifiers: [{ label: "Active operative", value: player.character.stats[threat.stat] }] },
      ...(fixture.stage === "result"
        ? {
            roll: { dice: [4, 3], baseTotal: 7, modifierTotal: player.character.stats[threat.stat] + 5, finalTotal: player.character.stats[threat.stat] + 12, target: threat.difficulty, success: true },
            assistance: {
              testedStat: threat.stat,
              activeSeatId: seatId,
              contributions: helpers.map((helper) => ({ seatId: helper.seatId, value: getIntrinsicBaseStat(helper, threat.stat) })),
              total: helpers.reduce((sum, helper) => sum + getIntrinsicBaseStat(helper, threat.stat), 0)
            },
            outcome: { title: "Concordant victory", text: "Both helper signals joined the active operative's single roll.", effects: ["No helper dice were rolled."] }
          }
        : {})
    };
    if (fixture.stage === "active-selector" || fixture.stage === "result") return;
    const acceptedSeatIds = fixture.stage === "one-accepted" || fixture.stage === "two-accepted" ? [helpers[0]!.seatId] : [];
    if (fixture.stage === "two-accepted") acceptedSeatIds.push(helpers[1]!.seatId);
    state.cooperativeAssistance = {
      id: "qa-assistance-request",
      sourceKind: "encounter",
      sourceId: threat.id,
      sourceTitle: threat.title,
      testedStat: threat.stat,
      activeSeatId: seatId,
      requestedSeatIds: helpers.map((helper) => helper.seatId),
      acceptedSeatIds,
      declinedSeatIds: [],
      lockedContributions: fixture.stage === "two-accepted"
        ? helpers.map((helper) => ({ seatId: helper.seatId, value: getIntrinsicBaseStat(helper, threat.stat) }))
        : [],
      status: fixture.stage === "two-accepted" ? "locked" : "requested",
      createdAt: "qa-cooperative-assistance"
    };
    return;
  }

  if (fixture.kind === "card-category") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "resolution";
    const normalizedStage = fixture.stage === "hazard-before" || fixture.stage === "hazard-failure" ? "hazard" : fixture.stage;
    const threatId = normalizedStage === "enemy" ? "lantern-ash-ghoul" : normalizedStage === "event" ? "trench-blast" : "suture-storm";
    const threat = loadThreatCards().get(threatId);
    const anomaly = fixture.stage === "anomaly" ? [...loadAnomalyCards().values()][0] : null;
    const escalation = fixture.stage === "escalation" ? [...loadEscalationCards().values()][0] : null;
    const persistentChallenge = fixture.stage === "persistent" ? [...loadTileChallenges().values()][0] ?? null : null;
    const category: "enemy" | "hazard" | "event" | "anomaly" | "escalation" = fixture.stage === "persistent"
      ? "anomaly"
      : normalizedStage as "enemy" | "hazard" | "event" | "anomaly" | "escalation";
    const source: "scenario" | "threat" | "anomaly" | "escalation" = fixture.stage === "persistent"
      ? "scenario"
      : category === "enemy" || category === "hazard" || category === "event"
        ? "threat"
        : category;
    const id = persistentChallenge?.id ?? anomaly?.id ?? escalation?.id ?? threat?.id ?? "rift-whispers";
    const title = persistentChallenge?.name ?? anomaly?.title ?? escalation?.title ?? threat?.title ?? "Rift Whispers";
    const flavor = persistentChallenge?.lore ?? anomaly?.flavor ?? escalation?.flavor ?? threat?.flavor ?? "The chapel keeps the distortion anchored to this sector.";
    state.currentEncounter = normalizedStage === "enemy" || normalizedStage === "hazard" || normalizedStage === "event" ? threat ?? null : null;
    state.phase = fixture.stage === "hazard-before" ? "action" : "resolution";
    const success = fixture.stage !== "hazard-failure";
    state.activeResolution = {
      id: `qa-card-category:${fixture.stage}:${id}`,
      playerId: seatId,
      source,
      stage: fixture.stage === "hazard-before" ? "battle_setup" : "roll_result",
      card: { id, title, type: category, flavor, artType: category === "enemy" || category === "hazard" || category === "event" ? "threat" : category },
      battle: {
        ...(normalizedStage === "enemy" ? { enemyName: title } : {}),
        stat: persistentChallenge?.testStat ?? threat?.stat ?? "signal",
        difficulty: persistentChallenge?.difficulty ?? threat?.difficulty ?? 7,
        modifiers: [{ label: "Operative", value: 3 }]
      },
      ...(fixture.stage === "hazard-before" ? {} : { roll: { dice: success ? [3, 4] : [1, 1], baseTotal: success ? 7 : 2, modifierTotal: 3, finalTotal: success ? 10 : 5, target: persistentChallenge?.difficulty ?? threat?.difficulty ?? 7, success } }),
      ...(fixture.stage === "hazard-before" ? {} : { outcome: {
        title: fixture.stage === "persistent" ? "Challenge remains" : `${title} resolved`,
        text: fixture.stage === "persistent"
          ? "This authored tile challenge remains attached until its own removal condition is met."
          : success
            ? "You crossed the storm on the beat between stitches."
            : "The storm stitches flesh to road.",
        effects: fixture.stage === "persistent"
          ? [`Canonical ${persistentChallenge?.successEffect.type.replace(/_/g, " ") ?? "success"} effect resolved; the challenge remains attached.`]
          : fixture.stage === "escalation"
          ? ["Global Escalation advanced as authored."]
          : success
            ? ["You crossed the storm on the beat between stitches."]
            : ["Gain 1 Wound.", "Move 1 sector counterclockwise on this ring; if blocked, gain 1 additional Wound."]
      } }),
      origin: {
        sourceDeck: fixture.stage === "persistent" ? "tile-challenge" : category,
        sourceSectorId: player.sectorId,
        sourceEventId: `qa-card-category:${fixture.stage}`,
        queuePosition: 0,
        privacy: "public"
      }
    };
    return;
  }

  if (fixture.kind === "discovery-equipment") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "resolution";

    if (fixture.stage === "command-item-invalid" || fixture.stage === "grit-item-valid") {
      const threatId = fixture.stage === "command-item-invalid" ? "ash-court-duelist" : "lantern-ash-ghoul";
      const threat = loadThreatCards().get(threatId);
      const fuse = loadGear().get("black-route-fuse");
      if (!threat || threat.cardType !== "enemy" || !fuse) throw new Error("QA fixture cannot create item eligibility battle");
      const item = { ...fuse, instanceId: "qa:black-route-fuse" };
      player.character.heldGear = [
        ...player.character.heldGear.filter((entry) => entry.id !== fuse.id),
        item
      ];
      state.phase = "action";
      state.currentEncounter = threat;
      state.resolutionSource = "encounter";
      state.activeResolution = {
        id: `qa-item-eligibility:${fixture.stage}`,
        playerId: seatId,
        source: "threat",
        stage: "battle_setup",
        card: { id: threat.id, title: threat.title, type: "enemy", flavor: threat.flavor, artType: "threat" },
        battle: { enemyName: threat.enemyName ?? threat.title, stat: threat.stat, difficulty: threat.difficulty, modifiers: [] }
      };
      return;
    }

    const followerDiscovery = fixture.stage === "follower-reveal";
    const threatId = followerDiscovery ? "roadside-bone-oracle" : "breach-halberd";
    const threat = loadThreatCards().get(threatId);
    if (!threat || threat.cardType !== "hazard") throw new Error("QA discovery encounter is missing");
    state.currentEncounter = threat;
    state.resolutionSource = "encounter";
    state.activeResolution = {
      id: `qa-discovery:${fixture.stage}:${threat.id}`,
      playerId: seatId,
      source: "threat",
      stage: "outcome_summary",
      card: { id: threat.id, title: threat.title, type: "asset", flavor: threat.flavor, artType: "threat" },
      battle: { stat: threat.stat, difficulty: threat.difficulty, modifiers: [{ label: "Operative", value: player.character.stats[threat.stat] }] },
      roll: { dice: [4, 3], baseTotal: 7, modifierTotal: player.character.stats[threat.stat], finalTotal: 7 + player.character.stats[threat.stat], target: threat.difficulty, success: true },
      outcome: {
        title: followerDiscovery ? "Follower discovered" : "Equipment discovered",
        text: followerDiscovery ? "The stranded guide accepts the operative's route-oath." : "The sealed cache yields usable field gear.",
        effects: [followerDiscovery ? "Saltflat Bone-Reader joined the operative." : "Bridge Spike gained."]
      }
    };

    if (fixture.stage === "auto-equipped") {
      const bridgeSpike = loadGear().get("bridge-spike");
      if (!bridgeSpike) throw new Error("QA Equipment is missing");
      const item = { ...bridgeSpike, instanceId: "qa:bridge-spike:auto" };
      player.character.heldGear = [...player.character.heldGear.filter((entry) => entry.slot !== "utility"), item];
      player.character.equippedGear.utility = item.id;
      player.character.equippedGearInstances = { ...(player.character.equippedGearInstances ?? { weapon: null, armor: null, utility: null }), utility: item.instanceId };
    }

    if (fixture.stage === "equip-choice") {
      const bridgeSpike = loadGear().get("bridge-spike");
      const fieldLens = loadGear().get("field-lens");
      if (!bridgeSpike || !fieldLens) throw new Error("QA Equipment choice definitions are missing");
      const current = { ...fieldLens, instanceId: "qa:field-lens:equipped" };
      const discovered = { ...bridgeSpike, instanceId: "qa:bridge-spike:carried" };
      player.character.heldGear = [...player.character.heldGear.filter((entry) => entry.slot !== "utility"), current, discovered];
      player.character.equippedGear.utility = current.id;
      player.character.equippedGearInstances = { ...(player.character.equippedGearInstances ?? { weapon: null, armor: null, utility: null }), utility: current.instanceId };
      state.pendingGearEquipChoice = {
        choiceId: "qa:discovery:equip-choice",
        ownerSeatId: seatId,
        itemCatalogId: discovered.id,
        itemInstanceId: discovered.instanceId,
        slot: "utility",
        currentItemCatalogId: current.id,
        currentItemInstanceId: current.instanceId,
        sourceResolutionId: state.activeResolution.id,
        createdAt: "qa:discovery:equip-choice"
      };
    }
    return;
  }

  if (fixture.kind === "phone-movement") {
    state.phase = "navigation";
    state.movementRolls = fixture.stage === "roll-required" || fixture.stage === "confirmed"
      ? undefined
      : {
          ...(state.movementRolls ?? {}),
          [seatId]: fixture.stage === "medium-routes" ? 2 : fixture.stage === "long-routes" ? 4 : 1
        };
    state.pendingTileChallenge = null;
    placePlayer(state, seatId, fixture.stage === "confirmed" ? "votive-engine-room" : "ashwake-crossing");
    setContract(state, seatId, routeContractId, 0);
    if (fixture.stage === "confirmed") {
      clearResolution(state);
      state.lastOutcomeSummary = {
        seatId,
        movedToSectorId: "votive-engine-room",
        encounterCardId: null,
        encounterTitle: null,
        encounterCardType: null,
        checkStat: null,
        die1: null,
        die2: null,
        statBonus: null,
        checkTotal: null,
        difficulty: null,
        enemyRollerSeatId: null,
        enemyDie1: null,
        enemyDie2: null,
        enemyBonus: null,
        enemyTotal: null,
        success: true,
        summary: "Movement confirmed to Votive Engine Room."
      };
    }
    return;
  }

  if (fixture.kind === "map-transition") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "navigation";
    state.movementRolls = { ...(state.movementRolls ?? {}), [seatId]: 1 };
    state.pendingTileChallenge = null;
    const atCoreApproach = fixture.stage.startsWith("core-");
    placePlayer(state, seatId, atCoreApproach ? "inner_gate_of_cinders" : "middle_guardian_span");
    player.private.notes = player.private.notes.filter(
      (note) => note !== "guardian-span-clearance" && note !== "gate-of-cinders-breached"
    );
    if (fixture.stage === "guardian-cleared") player.private.notes.push("guardian-span-clearance");
    if (fixture.stage === "core-cleared") player.private.notes.push("gate-of-cinders-breached");
    return;
  }

  if (fixture.kind === "mission-reward") {
    state.phase = "action";
    state.movementRolls = undefined;
    setContract(state, seatId, routeContractId, fixture.stage === "ready" ? 3 : 1, fixture.stage === "ready" ? ["echo-a", "echo-b", "echo-c"] : ["echo-a"]);
    placePlayer(state, seatId, "ashwake-crossing");
    return;
  }

  // Preserve legitimately earned progress while browser QA exits a movement
  // or shop prompt to exercise the normal mission-completion action.
  if (fixture.stage === "completion-ready") {
    state.phase = "action";
    state.movementRolls = undefined;
    return;
  }

  if (fixture.kind === "route") {
    state.phase = "navigation";
    state.movementRolls = { ...(state.movementRolls ?? {}), [seatId]: 1 };
    if (fixture.stage === "ordered-wrong") {
      setContract(state, seatId, orderedRouteContractId, 0);
      placePlayer(state, seatId, "north-dock-bastion");
      clearSector(state, "outer_waymarket");
      return;
    }
    if (fixture.stage === "first") {
      setContract(state, seatId, routeContractId, 0);
      placePlayer(state, seatId, "ashwake-crossing");
      clearSector(state, "glassmere-spindle");
      return;
    }
    if (fixture.stage === "duplicate") {
      setContract(state, seatId, routeContractId, 1, ["echo-a"]);
      placePlayer(state, seatId, "ashwake-crossing");
      clearSector(state, "glassmere-spindle");
      return;
    }
    setContract(state, seatId, routeContractId, 2, ["echo-a", "echo-b"]);
    const sunken = state.sectors.find((entry) => entry.id === "sunken-pier");
    const neighbor = sunken?.neighbors[0];
    if (!neighbor || !getBoardSpace(neighbor)) throw new Error("QA fixture cannot find a neighbor for Sunken Pier");
    placePlayer(state, seatId, neighbor);
    clearSector(state, "sunken-pier");
    return;
  }

  state.phase = "action";
  state.movementRolls = undefined;
  const progress = fixture.stage === "valid-final" ? 1 : 0;
  setContract(state, seatId, shopContractId, progress);
  const player = state.players.find((entry) => entry.seatId === seatId)!;
  player.character.salvage = Math.max(player.character.salvage ?? 0, 20);
  placePlayer(state, seatId, fixture.stage === "wrong-shop" ? "outer_surgery_tent" : "kettleward-foundry");
}
