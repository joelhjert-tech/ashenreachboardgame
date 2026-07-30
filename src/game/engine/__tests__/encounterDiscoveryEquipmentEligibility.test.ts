import { describe, expect, it } from "vitest";
import { loadGear } from "../../content/gear.js";
import { loadThreatCards } from "../../content/threats.js";
import { getThreatPresentationCategory } from "../../cards/cardCategories.js";
import type { EncounterEffect, ThreatCard } from "../../schema/card.schema.js";
import { sessionSnapshotSchema } from "../../schema/session.schema.js";
import { getChallengeItemEligibility } from "../../rules/challengeItemEligibility.js";
import { GameRoomServer, createPhoneProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { reduceGameState } from "../reducer.js";

function encounter(stat: "command" | "grit"): ThreatCard {
  return {
    id: `test-${stat}`,
    type: "threat",
    cardType: "enemy",
    title: `${stat} enemy`,
    enemyName: `${stat} enemy`,
    text: "test",
    flavor: "test",
    severity: 1,
    stat,
    difficulty: 6,
    trophyValue: 1,
    defeatReward: { type: "gain_trophy", amount: 1 },
    woundOnLoss: { type: "take_wound", amount: 1 }
  };
}

function resolveGearReward(slotOccupied: boolean) {
  const state = createInitialSessionState(`discovery-${slotOccupied}`, "single-player");
  const player = state.players[0]!;
  const bridgeSpike = loadGear().get("bridge-spike")!;
  player.character.heldGear = slotOccupied
    ? [{ ...loadGear().get("field-lens")!, instanceId: "field-lens:owned" }]
    : [];
  player.character.equippedGear = { weapon: null, armor: null, utility: slotOccupied ? "field-lens" : null };
  player.character.equippedGearInstances = { weapon: null, armor: null, utility: slotOccupied ? "field-lens:owned" : null };
  state.status = "active";
  state.phase = "resolution";
  state.activeResolution = {
    id: "discovery-resolution",
    playerId: player.seatId,
    source: "threat",
    stage: "roll_result"
  };
  const server = new GameRoomServer(state);
  const effect = (server as unknown as {
    resolveEffect(effect: { type: "gain_gear"; gearId: string }, seatId: string): EncounterEffect;
  }).resolveEffect({ type: "gain_gear", gearId: bridgeSpike.id }, player.seatId);
  state.pendingEffect = effect;
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: player.seatId,
    effect,
    sourceCardId: "breach-halberd",
    success: true,
    createdAt: "2026-07-18T00:00:00.000Z"
  });
}

describe("discovery encounters and authoritative Equipment eligibility", () => {
  it("keeps 204 cards while exposing seven Equipment and five Follower discoveries", () => {
    const cards = [...loadThreatCards().values()];
    const discoveries = cards.filter((card) => getThreatPresentationCategory(card) === "asset");
    expect(cards).toHaveLength(204);
    expect(discoveries).toHaveLength(12);
    expect(discoveries.filter((card) => card.resourceTags?.includes("gear"))).toHaveLength(7);
    expect(discoveries.filter((card) => card.resourceTags?.includes("follower"))).toHaveLength(5);
    expect(new Set(discoveries.map((card) => card.threatLane))).toEqual(new Set(["red", "blue", "yellow"]));
  });

  it("auto-equips an exact normal Equipment instance into an empty legal slot", () => {
    const result = resolveGearReward(false);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const player = result.state.players[0]!;
    const gained = player.character.heldGear.find((item) => item.id === "bridge-spike")!;
    expect(player.character.equippedGear.utility).toBe("bridge-spike");
    expect(player.character.equippedGearInstances?.utility).toBe(gained.instanceId);
    expect(result.state.pendingGearEquipChoice).toBeFalsy();
  });

  it("opens a reconnect-safe owner choice instead of replacing occupied Equipment", () => {
    const result = resolveGearReward(true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]?.character.equippedGear.utility).toBe("field-lens");
    expect(result.state.pendingGearEquipChoice).toMatchObject({
      ownerSeatId: result.state.players[0]?.seatId,
      itemCatalogId: "bridge-spike",
      currentItemCatalogId: "field-lens",
      slot: "utility"
    });
    expect(sessionSnapshotSchema.parse({ saveVersion: 2, sessionId: result.state.sessionId, sequence: result.state.sequence, state: result.state }).state.pendingGearEquipChoice).toEqual(result.state.pendingGearEquipChoice);
  });

  it("rejects stale equip decisions and replaces only the equipped slot when the owner confirms", () => {
    const reward = resolveGearReward(true);
    expect(reward.ok).toBe(true);
    if (!reward.ok) return;
    const pending = reward.state.pendingGearEquipChoice!;
    const wrong = reduceGameState(reward.state, {
      type: "RESOLVE_GEAR_EQUIP_CHOICE",
      seatId: "seat-2",
      choiceId: pending.choiceId,
      itemInstanceId: pending.itemInstanceId,
      decision: "equip",
      createdAt: "2026-07-18T00:00:01.000Z"
    });
    expect(wrong.ok).toBe(false);

    const resolved = reduceGameState(reward.state, {
      type: "RESOLVE_GEAR_EQUIP_CHOICE",
      seatId: pending.ownerSeatId,
      choiceId: pending.choiceId,
      itemInstanceId: pending.itemInstanceId,
      decision: "equip",
      createdAt: "2026-07-18T00:00:02.000Z"
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.pendingGearEquipChoice).toBeNull();
    expect(resolved.state.players[0]?.character.equippedGear.utility).toBe("bridge-spike");
    expect(resolved.state.players[0]?.character.heldGear.map((item) => item.id)).toEqual(expect.arrayContaining(["field-lens", "bridge-spike"]));
  });

  it("rejects a Grit-only active item during a Command battle and projects the reason", () => {
    const state = createInitialSessionState("wrong-skill", "single-player");
    const player = state.players[0]!;
    const fuse = { ...loadGear().get("black-route-fuse")!, instanceId: "fuse:one" };
    player.character.heldGear = [fuse];
    state.status = "active";
    state.phase = "action";
    state.currentEncounter = encounter("command");
    state.activeResolution = {
      id: "command-battle",
      playerId: player.seatId,
      source: "threat",
      stage: "battle_setup",
      battle: { enemyName: "Command enemy", stat: "command", difficulty: 6, modifiers: [] }
    };

    expect(getChallengeItemEligibility(state, player.seatId, fuse)).toMatchObject({
      eligible: false,
      testedSkill: "command",
      disabledReason: "Requires a Grit test. Current test: Command."
    });
    const phone = createPhoneProjection(state, player.seatId, true) as { objectUseStates?: Array<{ id: string; disabledReason?: string }> };
    expect(phone.objectUseStates?.find((entry) => entry.id === fuse.id)?.disabledReason).toBe("Requires a Grit test. Current test: Command.");
    expect(() => (new GameRoomServer(state) as unknown as { assertGearUseAllowed(seatId: string, item: typeof fuse): void }).assertGearUseAllowed(player.seatId, fuse)).toThrow(/Requires a Grit test/);
  });

  it("allows that same active item only when the authoritative tested skill is Grit", () => {
    const state = createInitialSessionState("right-skill", "single-player");
    const player = state.players[0]!;
    const fuse = { ...loadGear().get("black-route-fuse")!, instanceId: "fuse:one" };
    player.character.heldGear = [fuse];
    state.status = "active";
    state.phase = "action";
    state.currentEncounter = encounter("grit");
    state.activeResolution = {
      id: "grit-battle",
      playerId: player.seatId,
      source: "threat",
      stage: "battle_setup",
      battle: { enemyName: "Grit enemy", stat: "grit", difficulty: 6, modifiers: [] }
    };
    expect(getChallengeItemEligibility(state, player.seatId, fuse)).toMatchObject({ eligible: true, testedSkill: "grit", disabledReason: null });
  });
});
