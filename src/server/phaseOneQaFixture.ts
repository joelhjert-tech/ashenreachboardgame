import { getBoardSpace } from "../game/data/boardSpaces.js";
import { loadGear } from "../game/content/gear.js";
import { loadThreatCards } from "../game/content/threats.js";
import { loadFollowers } from "../game/content/followers.js";
import { loadAnomalyCards } from "../game/content/anomalies.js";
import { loadEscalationCards } from "../game/content/escalations.js";
import { loadCharacters } from "../game/content/characters.js";
import type { GameState } from "../game/schema/session.schema.js";
import { getIntrinsicBaseStat } from "../game/rules/cooperativeAssistance.js";

export type PhaseOneQaFixture =
  | { kind: "setup-flow"; stage: "scenario-selection" }
  | { kind: "route"; stage: "first" | "duplicate" | "ordered-wrong" | "final" | "completion-ready" }
  | { kind: "shop"; stage: "wrong-shop" | "valid-first" | "valid-final" | "completion-ready" }
  | {
      kind: "host-shop";
      stage: "categories" | "items" | "equipment" | "artifacts" | "locked" | "insufficient" | "long-lore" | "single-category";
    }
  | { kind: "movement-journey"; stage: "ashen-chapel"; withChoirLantern?: boolean }
  | { kind: "phone-movement"; stage: "roll-required" | "four-routes" | "confirmed" }
  | { kind: "map-transition"; stage: "guardian-locked" | "guardian-cleared" | "core-locked" | "core-cleared" }
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
  | { kind: "card-category"; stage: "enemy" | "hazard" | "event" | "anomaly" | "escalation" | "persistent" };

const routeContractId = "choir-echo-triangulation";
const orderedRouteContractId = "compact-three-lantern-circuit";
const shopContractId = "dominion-foundry-proof-marks";

function clearResolution(state: GameState): void {
  state.currentEncounter = null;
  state.pendingEnemyRoll = null;
  state.pendingEffect = null;
  state.activeResolution = null;
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
    state.lobbyConfigured = false;
    state.setupHostSeatId = seatId;
    state.sequence += 1;
    clearResolution(state);
    return;
  }

  if (state.status !== "active" && fixture.kind !== "host-state") throw new Error("QA fixture requires an active session");
  clearResolution(state);
  state.sequence += 1;
  state.activeSeatIndex = Math.max(0, state.turnOrder.indexOf(seatId));

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

  if (fixture.kind === "host-shop") {
    const player = state.players.find((entry) => entry.seatId === seatId);
    if (!player) throw new Error(`QA fixture cannot find ${seatId}`);
    state.phase = "action";
    state.movementRolls = undefined;
    player.character.salvage = fixture.stage === "insufficient" ? 1 : 7;
    player.character.completedContracts = fixture.stage === "artifacts"
      ? ["qa-contract-1", "qa-contract-2", "qa-contract-3"]
      : [];

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
        : fixture.stage === "equipment" || fixture.stage === "insufficient" || fixture.stage === "long-lore"
          ? "equipment"
          : fixture.stage === "artifacts"
            ? "artifacts"
            : "categories",
      selectedId: fixture.stage === "items"
        ? "field-lens"
        : fixture.stage === "long-lore"
          ? "signal-pike"
          : fixture.stage === "equipment" || fixture.stage === "insufficient"
            ? "ashlock-cleaver"
            : null,
      updatedAt: `qa:host-shop:${fixture.stage}`
    };

    if (["items", "equipment", "insufficient", "long-lore"].includes(fixture.stage)) {
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
    const threatId = fixture.stage === "enemy" ? "lantern-ash-ghoul" : fixture.stage === "event" ? "trench-blast" : "suture-storm";
    const threat = loadThreatCards().get(threatId);
    const anomaly = fixture.stage === "anomaly" ? [...loadAnomalyCards().values()][0] : null;
    const escalation = fixture.stage === "escalation" ? [...loadEscalationCards().values()][0] : null;
    const category = fixture.stage === "persistent" ? "anomaly" : fixture.stage;
    const source = fixture.stage === "persistent" ? "scenario" : category === "enemy" || category === "hazard" || category === "event" ? "threat" : category;
    const id = anomaly?.id ?? escalation?.id ?? threat?.id ?? "rift-whispers";
    const title = anomaly?.title ?? escalation?.title ?? threat?.title ?? "Rift Whispers";
    const flavor = anomaly?.flavor ?? escalation?.flavor ?? threat?.flavor ?? "The chapel keeps the distortion anchored to this sector.";
    state.currentEncounter = fixture.stage === "enemy" || fixture.stage === "hazard" || fixture.stage === "event" ? threat ?? null : null;
    state.activeResolution = {
      id: `qa-card-category:${fixture.stage}:${id}`,
      playerId: seatId,
      source,
      stage: "roll_result",
      card: { id, title, type: category, flavor, artType: category === "enemy" || category === "hazard" || category === "event" ? "threat" : category },
      battle: {
        ...(fixture.stage === "enemy" ? { enemyName: title } : {}),
        stat: threat?.stat ?? "signal",
        difficulty: threat?.difficulty ?? 7,
        modifiers: [{ label: "Operative", value: 3 }]
      },
      roll: { dice: [3, 4], baseTotal: 7, modifierTotal: 3, finalTotal: 10, target: threat?.difficulty ?? 7, success: true },
      outcome: {
        title: fixture.stage === "persistent" ? "Challenge remains" : `${title} resolved`,
        text: fixture.stage === "persistent" ? "This authored tile challenge remains attached until its own removal condition is met." : "The authoritative effect resolved once.",
        effects: fixture.stage === "escalation" ? ["Global Escalation advanced as authored."] : ["No duplicate reward was created."]
      },
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
      : { ...(state.movementRolls ?? {}), [seatId]: 1 };
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
