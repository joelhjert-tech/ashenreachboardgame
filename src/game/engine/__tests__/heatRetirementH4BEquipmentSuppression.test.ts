import { describe, expect, it } from "vitest";
import { loadGear } from "../../content/gear.js";
import { loadThreatCards } from "../../content/threats.js";
import { getEquippedGearModifierSources } from "../gear.js";
import { reduceGameState } from "../reducer.js";
import {
  completeEquipmentSuppressionLifecycle,
  ensureOwnedGearInstanceIds,
  getEligibleEquipmentSuppressionTargets,
  getSuppressedEquipmentInstanceIds,
  normalizeEquipmentSuppressionState,
  reserveEquipmentSuppressions
} from "../../rules/equipmentSuppression.js";
import type { EncounterEffect, ThreatCard } from "../../schema/card.schema.js";
import type { GameState } from "../../schema/session.schema.js";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

const threats = loadThreatCards();
const gear = loadGear();

function requireThreat(id: "relay-husk" | "signal-rotted-engineer"): ThreatCard {
  const card = threats.get(id);
  if (!card) throw new Error(`Missing ${id}`);
  return card;
}

function failureEffect(card: ThreatCard): EncounterEffect {
  const effect = card.cardType === "enemy" ? card.woundOnLoss : card.failEffect;
  if (!effect) throw new Error(`Missing failure effect for ${card.id}`);
  return effect;
}

function withExactEquipment(sessionMode: "single-player" | "multiplayer" = "single-player"): GameState {
  const state = createInitialSessionState("h4b", sessionMode, undefined, undefined, "standard", sessionMode === "multiplayer" ? 2 : undefined);
  state.status = "active";
  const player = state.players[0]!;
  const first = { ...gear.get("ashlock-cleaver")!, instanceId: "ashlock:first" };
  const duplicate = { ...gear.get("ashlock-cleaver")!, instanceId: "ashlock:duplicate" };
  const carried = { ...gear.get("black-route-fuse")!, instanceId: "carried:utility" };
  const artifact = { ...gear.get("ashen-route-compass")!, instanceId: "artifact:utility" };
  const qa = { ...gear.get("black-route-fuse")!, instanceId: "qa:utility", qaOnly: true };
  player.character = ensureOwnedGearInstanceIds({
    ...player.character,
    heldGear: [first, duplicate, carried, artifact, qa],
    equippedGear: { weapon: first.id, armor: null, utility: artifact.id },
    equippedGearInstances: { weapon: first.instanceId, armor: null, utility: artifact.instanceId }
  }, player.seatId);
  return state;
}

function failedThreatState(id: "relay-husk" | "signal-rotted-engineer", eligible = true): GameState {
  const state = eligible ? withExactEquipment() : createInitialSessionState(`h4b-${id}`, "single-player");
  const player = state.players[0]!;
  const card = requireThreat(id);
  state.status = "active";
  state.phase = "resolution";
  state.currentEncounter = card;
  state.pendingEffect = failureEffect(card);
  state.activeResolution = {
    id: `${id}:source-resolution`,
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result",
    card: { id: card.id, title: card.title, type: card.cardType, flavor: card.flavor },
    roll: { dice: [1, 1], baseTotal: 2, modifierTotal: 0, finalTotal: 2, target: card.difficulty, success: false }
  };
  state.lastOutcomeSummary = {
    seatId: player.seatId,
    movedToSectorId: player.sectorId,
    encounterCardId: card.id,
    encounterTitle: card.title,
    encounterCardType: card.cardType,
    checkStat: card.stat,
    die1: 1,
    die2: 1,
    statBonus: 0,
    checkTotal: 2,
    difficulty: card.difficulty,
    success: false,
    summary: `${card.title} failed.`
  };
  return state;
}

function triggerChoice(state: GameState, id: "relay-husk" | "signal-rotted-engineer") {
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: state.players[0]!.seatId,
    effect: failureEffect(requireThreat(id)),
    sourceCardId: id,
    success: false,
    createdAt: "2026-07-14T10:00:00.000Z"
  });
}

function selectFirst(state: GameState) {
  const pending = state.pendingEquipmentSuppressionChoice!;
  return reduceGameState(state, {
    type: "SELECT_EQUIPMENT_SUPPRESSION_TARGET",
    seatId: state.players[0]!.seatId,
    choiceId: pending.choiceId,
    itemInstanceId: "ashlock:first",
    createdAt: "2026-07-14T10:01:00.000Z"
  });
}

describe("Heat Retirement H4B exact-instance Equipment suppression", () => {
  it("revises only the approved stable cards with typed effects and final wording", () => {
    expect(requireThreat("relay-husk")).toMatchObject({
      id: "relay-husk", cardType: "hazard", threatLane: "yellow", difficulty: 6,
      text: "If you fail, choose one equipped normal Equipment. It provides no effects through your next Threat.",
      failEffect: { type: "equipment_suppression", sourceCardId: "relay-husk", mode: "throughNextThreat" }
    });
    expect(requireThreat("signal-rotted-engineer")).toMatchObject({
      id: "signal-rotted-engineer", cardType: "enemy", threatLane: "yellow", difficulty: 4, trophyValue: 2,
      text: "If you lose, choose one equipped normal Equipment. It provides no effects during your next battle.",
      woundOnLoss: { type: "equipment_suppression", sourceCardId: "signal-rotted-engineer", mode: "duringNextBattle" }
    });
    expect([...threats.values()].reduce<Record<string, number>>((counts, card) => {
      counts[card.threatLane ?? "missing"] = (counts[card.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {})).toEqual({ red: 26, blue: 35, yellow: 48 });
    expect(threats.size).toBe(109);
  });

  it.each(["relay-husk", "signal-rotted-engineer"] as const)("%s creates one mandatory owner-private exact-instance choice", (id) => {
    const state = failedThreatState(id);
    expect(getEligibleEquipmentSuppressionTargets(state, state.players[0]!.seatId).map((item) => item.instanceId)).toEqual(["ashlock:first"]);
    const result = triggerChoice(state, id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.pendingEquipmentSuppressionChoice).toMatchObject({ ownerSeatId: state.players[0]!.seatId, sourceThreatId: id, eligibleInstanceIds: ["ashlock:first"] });
    const owner = createPhoneProjection(result.state, state.players[0]!.seatId);
    expect(owner.pendingEquipmentSuppressionChoice).toMatchObject({ options: [{ instanceId: "ashlock:first", catalogId: "ashlock-cleaver", equipped: true }] });
    expect(JSON.stringify(createTvProjection(result.state))).not.toContain("ashlock:first");
  });

  it("never projects another player's target list and rejects arbitrary or duplicate submissions", () => {
    const state = failedThreatState("relay-husk");
    const triggered = triggerChoice(state, "relay-husk");
    expect(triggered.ok).toBe(true);
    if (!triggered.ok) return;
    expect(createPhoneProjection(triggered.state, "seat-2").pendingEquipmentSuppressionChoice).toBeNull();
    const invalid = reduceGameState(triggered.state, { type: "SELECT_EQUIPMENT_SUPPRESSION_TARGET", seatId: "seat-1", choiceId: triggered.state.pendingEquipmentSuppressionChoice!.choiceId, itemInstanceId: "ashlock-cleaver", createdAt: "invalid" });
    expect(invalid.ok).toBe(false);
    const selected = selectFirst(triggered.state);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    expect(selected.state.equipmentSuppressions).toHaveLength(1);
    expect(reduceGameState(selected.state, {
      type: "SELECT_EQUIPMENT_SUPPRESSION_TARGET",
      seatId: "seat-1",
      choiceId: triggered.state.pendingEquipmentSuppressionChoice!.choiceId,
      itemInstanceId: "ashlock:first",
      createdAt: "duplicate"
    }).ok).toBe(false);
  });

  it("closes safely with no substitute penalty when there is no eligible Equipment", () => {
    for (const id of ["relay-husk", "signal-rotted-engineer"] as const) {
      const state = failedThreatState(id, false);
      state.players[0]!.character.heldGear = [];
      state.players[0]!.character.equippedGear = { weapon: null, armor: null, utility: null };
      const result = triggerChoice(state, id);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.state.pendingEquipmentSuppressionChoice).toBeNull();
      expect(result.state.equipmentSuppressions).toEqual([]);
      expect(result.state.activeResolution?.outcome?.text).toBe("No eligible Equipment to suppress.");
    }
  });

  it("suppresses only the selected duplicate and preserves ownership, equip state, and charges", () => {
    const triggered = triggerChoice(failedThreatState("signal-rotted-engineer"), "signal-rotted-engineer");
    expect(triggered.ok).toBe(true);
    if (!triggered.ok) return;
    const selected = selectFirst(triggered.state);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    const battle = reserveEquipmentSuppressions(selected.state, "seat-1", "next-battle", "battle");
    const suppressed = getSuppressedEquipmentInstanceIds(battle, "seat-1", "next-battle");
    expect([...suppressed]).toEqual(["ashlock:first"]);
    const character = battle.players[0]!.character;
    expect(getEquippedGearModifierSources(character, "grit", { mode: "battle", suppressedInstanceIds: suppressed })).toEqual([]);
    character.equippedGearInstances!.weapon = "ashlock:duplicate";
    expect(getEquippedGearModifierSources(character, "grit", { mode: "battle", suppressedInstanceIds: suppressed })).toEqual([{ label: "Ashlock Cleaver", value: 1 }]);
    expect(character.heldGear.map((item) => item.instanceId)).toContain("ashlock:first");
  });

  it("excludes the source lifecycle, reserves only the matching next owner lifecycle, and clears idempotently", () => {
    const triggered = triggerChoice(failedThreatState("relay-husk"), "relay-husk");
    expect(triggered.ok).toBe(true);
    if (!triggered.ok) return;
    const selected = selectFirst(triggered.state);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    const source = reserveEquipmentSuppressions(selected.state, "seat-1", "relay-husk:source-resolution", "threat");
    expect(source.equipmentSuppressions![0]!.qualifyingLifecycleId).toBeNull();
    const wrongOwner = reserveEquipmentSuppressions(source, "seat-2", "other-threat", "threat");
    expect(wrongOwner.equipmentSuppressions![0]!.qualifyingLifecycleId).toBeNull();
    const next = reserveEquipmentSuppressions(wrongOwner, "seat-1", "next-threat", "threat");
    expect(next.equipmentSuppressions![0]!.qualifyingLifecycleId).toBe("next-threat");
    expect(completeEquipmentSuppressionLifecycle(next, "unrelated").equipmentSuppressions).toHaveLength(1);
    const cleared = completeEquipmentSuppressionLifecycle(next, "next-threat");
    expect(cleared.equipmentSuppressions).toEqual([]);
    expect(completeEquipmentSuppressionLifecycle(cleared, "next-threat").equipmentSuppressions).toEqual([]);
  });

  it("retains through unequip/re-equip and reconnect-shaped projection, then clears on item removal, recall, or session end", () => {
    const triggered = triggerChoice(failedThreatState("relay-husk"), "relay-husk");
    expect(triggered.ok).toBe(true);
    if (!triggered.ok) return;
    const selected = selectFirst(triggered.state);
    expect(selected.ok).toBe(true);
    if (!selected.ok) return;
    selected.state.players[0]!.character.equippedGear.weapon = null;
    selected.state.players[0]!.character.equippedGearInstances!.weapon = null;
    expect(normalizeEquipmentSuppressionState(structuredClone(selected.state)).equipmentSuppressions).toHaveLength(1);
    expect(createPhoneProjection(structuredClone(selected.state), "seat-1").equipmentSuppressions).toHaveLength(1);
    selected.state.players[0]!.character.heldGear = selected.state.players[0]!.character.heldGear.filter((item) => item.instanceId !== "ashlock:first");
    expect(normalizeEquipmentSuppressionState(selected.state).equipmentSuppressions).toEqual([]);
    const recalled = structuredClone(selected.state);
    recalled.players[0]!.character.status = "recalled";
    expect(normalizeEquipmentSuppressionState(recalled).equipmentSuppressions).toEqual([]);
    const ended = structuredClone(selected.state);
    ended.status = "ended";
    expect(normalizeEquipmentSuppressionState(ended).equipmentSuppressions).toEqual([]);
  });
});
