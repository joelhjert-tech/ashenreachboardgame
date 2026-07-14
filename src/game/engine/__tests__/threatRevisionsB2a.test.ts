import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadGear } from "../../content/gear.js";
import { loadThreatCards } from "../../content/threats.js";
import { sessionSnapshotSchema, type GameState } from "../../schema/session.schema.js";
import { canRiftAnchorSpikeSuppress, RIFT_ANCHOR_SPIKE_ELIGIBLE_SOURCE_IDS } from "../../rules/forcedDisplacement.js";
import { getRingTrackNeighbor } from "../../rules/movementPlanner.js";
import { THREAT_REVISION_SALVAGE_LOSS_SOURCE_IDS } from "../../rules/salvageLoss.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import type { PhonePatchPayload, PublicPatchPayload } from "../../../client/shared/types.js";
import { APPROVED_FORCED_DISPLACEMENT_SOURCE_IDS } from "../../../../scripts/forced-displacement-validation.js";
import { APPROVED_AUTOMATIC_SALVAGE_LOSS_IDS } from "../../../../scripts/legacy-heat-validation.js";
import { reduceGameState } from "../reducer.js";

const threats = loadThreatCards();
const salvageCards = ["glass-tick-cloud", "locked-vault"] as const;
const displacementCards = [
  ["breach-halberd", "clockwise"],
  ["mudglass-sinkhole", "counterclockwise"]
] as const;

const untouchedHeatLinkedHashes = new Map([
  ["glass-chime-swarm", "745affe8619bc5c0cae105c60aff8acd8792e27aac3a26b76588ed3893e876f2"],
  ["spindle-static-squall", "79792aba83a13ca9ac1193ce984919474e02dfca2d05b7c21a40da896032cb33"],
  ["ashen-doppelganger", "cb9b7c7d37419b9d91ee02624659a4828f0624ec507c2f6468c66be1593818c0"],
  ["choir-static-burst", "adc041f646810e467300df1b36313874de7e8c50018710eb5d309e8fdabb1d00"],
  ["crown-bell-baron", "c98e467269599e74371578d25c2b9e257214b463631829284ca19b77df3f96e2"],
  ["false-route-procession", "032bf4e5795ab98fa8e8def052dcf28190c2295f70582530e59f32b3592377ae"],
  ["gateblind-pulse", "d495be86b7b4a37acffa451fde6121293673a83a84f9aba8471336e314662618"],
  ["hymn-scarred-zealot", "a3664813d86849b47a1fbe2fdd8b2b831f91b9f93fe334ce36c21aca58df4256"],
  ["lantern-moth-swarm", "bd7943adf1d10c3ddc94f639516bebe8c0df94b279bd0e6b0b2b06dcc2215304"],
  ["marrow-tax-auditors", "bdf79951c64c0ea1e8322d8ba812db714fcc19cbae7d4dc6e4fca145fbfeeb9b"],
  ["memory-tax-gate", "dbeabc6a8d5b1654fd1f5a3c04ad8100fee6e47763bee51112a2d05ed407783e"],
  ["pale-contract-collector", "ef2f293db6747e0ed24b7b6c00a2df0801e1d8bd3db223c1724b5d3fd80360ae"],
  ["relay-husk", "e3f1f24646c937cd646f862c1314fb8f458145d0e1944dc6afb1e8a977564a91"],
  ["signal-rotted-engineer", "80446cb61e7acfe4e6613b134487e48a959764fc02ff53198f04e2abfb145c01"],
  ["siren-relay-echo", "c206dbd889f7aafaa69d50196f9c76076fafd40dd71015e7f0bcd05c7ef8de3b"],
  ["soot-stained-cutpurse", "c82891af35a78b7c6f9f8a7c41fe681cb6e6b3ffa46213bcab3ca7e1f6d3e179"]
]);

function requireHazard(id: string) {
  const card = threats.get(id);
  if (!card || card.cardType !== "hazard") throw new Error(`Missing hazard ${id}`);
  return card;
}

function resolutionState(card: ReturnType<typeof requireHazard>): GameState {
  const state = createInitialSessionState(`b2a-${card.id}`, "single-player");
  const player = state.players[0]!;
  state.status = "active";
  state.phase = "resolution";
  state.seats[0] = { ...state.seats[0]!, displayName: "B2A Operative", characterSelected: true, connected: true, ready: true };
  state.currentEncounter = card;
  state.pendingEffect = card.failEffect;
  state.activeResolution = {
    id: `${card.id}:failed-check`,
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
    summary: `${card.title} check failed.`
  };
  return state;
}

function applyFailure(state: GameState, card: ReturnType<typeof requireHazard>) {
  return reduceGameState(state, {
    type: "RESOLUTION_APPLIED",
    seatId: state.players[0]!.seatId,
    effect: card.failEffect,
    sourceCardId: card.id,
    success: false,
    createdAt: "b2a-failure"
  });
}

describe("Phase B2A threat revision content", () => {
  it("preserves all four stable IDs, lanes, tests, counts, and exact approved effects", () => {
    expect(THREAT_REVISION_SALVAGE_LOSS_SOURCE_IDS).toEqual(new Set(salvageCards));
    expect(APPROVED_FORCED_DISPLACEMENT_SOURCE_IDS).toEqual(new Set(["breach-halberd", "mudglass-sinkhole", "suture-storm", "route-splice"]));
    expect(RIFT_ANCHOR_SPIKE_ELIGIBLE_SOURCE_IDS).toEqual(APPROVED_FORCED_DISPLACEMENT_SOURCE_IDS);
    for (const id of salvageCards) expect(APPROVED_AUTOMATIC_SALVAGE_LOSS_IDS.has(id)).toBe(true);

    expect(requireHazard("glass-tick-cloud")).toMatchObject({ id: "glass-tick-cloud", cardType: "hazard", threatLane: "yellow", stat: "forge", difficulty: 6, text: "The glass ticks strip useful material from your pack. Lose up to 1 Salvage.", successEffect: { type: "gain_note", text: "You sealed the glass tick vent and marked the casing as a salvage warning." }, failEffect: { type: "lose_salvage", amount: 1 } });
    expect(requireHazard("locked-vault")).toMatchObject({ id: "locked-vault", cardType: "hazard", threatLane: "yellow", stat: "forge", difficulty: 7, text: "The vault ruins part of your stores before sealing. Lose up to 1 Salvage.", successEffect: { type: "gain_note", text: "You opened the vault long enough to copy its route cipher." }, failEffect: { type: "lose_salvage", amount: 1 } });
    expect(requireHazard("breach-halberd")).toMatchObject({ id: "breach-halberd", cardType: "hazard", threatLane: "red", stat: "forge", difficulty: 6, text: "The halberd sweeps you off the breach. Move 1 sector clockwise on this ring. If no legal sector is available, suffer 1 Wound.", successEffect: { type: "gain_note", text: "You stripped a breach-halberd for a brutal route note." }, failEffect: { type: "forcedDisplacement", direction: "clockwise", distance: 1, sameRing: true, fallbackEffect: { type: "take_wound", amount: 1 }, failureStillCounts: true } });
    expect(requireHazard("mudglass-sinkhole")).toMatchObject({ id: "mudglass-sinkhole", cardType: "hazard", threatLane: "red", stat: "grit", difficulty: 6, text: "The mudglass carries you off route. Move 1 sector counterclockwise on this ring. If no legal sector is available, suffer 1 Wound.", successEffect: { type: "gain_note", text: "You mapped the sinkhole lip before it sealed again." }, failEffect: { type: "forcedDisplacement", direction: "counterclockwise", distance: 1, sameRing: true, fallbackEffect: { type: "take_wound", amount: 1 }, failureStillCounts: true } });

    const laneCounts = [...threats.values()].reduce<Record<string, number>>((counts, card) => {
      counts[card.threatLane ?? "missing"] = (counts[card.threatLane ?? "missing"] ?? 0) + 1;
      return counts;
    }, {});
    expect(threats.size).toBe(109);
    expect(laneCounts).toEqual({ red: 26, blue: 35, yellow: 48 });
  });

  it("pins implemented Glass-Chime and Spindle plus the fourteen Heat-linked IDs outside H1", () => {
    for (const [id, expectedHash] of untouchedHeatLinkedHashes) {
      const authoredCard = JSON.parse(readFileSync(join(process.cwd(), "content", "cards", "threats", `${id}.json`), "utf8"));
      expect(createHash("sha256").update(JSON.stringify(authoredCard)).digest("hex"), id).toBe(expectedHash);
    }
  });
});

describe.each(salvageCards)("Phase B2A Salvage loss: %s", (cardId) => {
  const card = requireHazard(cardId);

  it.each([
    [3, 1, 2, "Lost 1 Salvage."],
    [1, 1, 0, "Lost 1 Salvage."],
    [0, 0, 0, "No Salvage to lose."]
  ] as const)("resolves authoritatively from %i Salvage", (startingSalvage, actualLoss, resultingSalvage, text) => {
    const state = resolutionState(card);
    const player = state.players[0]!;
    const ledger = loadGear().get("salvage-ledger")!;
    player.character.salvage = startingSalvage;
    player.character.wounds = 2;
    player.character.scars = ["scar-wound-1"];
    player.character.heldGear = [...player.character.heldGear, ledger];
    player.character.activeContract = { contractId: "compact-equipment-requisition", progress: 0, salvageSpent: 0 };
    player.character.completedContracts = ["sealed-contract"];
    const before = {
      wounds: player.character.wounds,
      scars: [...player.character.scars],
      sectorId: player.sectorId,
      heldGear: structuredClone(player.character.heldGear),
      activeContract: structuredClone(player.character.activeContract),
      completedContracts: [...player.character.completedContracts]
    };

    const result = applyFailure(state, card);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const resolvedPlayer = result.state.players[0]!;
    expect(resolvedPlayer.character.salvage).toBe(resultingSalvage);
    expect(resolvedPlayer.character.wounds).toBe(before.wounds);
    expect(resolvedPlayer.character.scars).toEqual(before.scars);
    expect(resolvedPlayer.sectorId).toBe(before.sectorId);
    expect(resolvedPlayer.character.heldGear).toEqual(before.heldGear);
    expect(resolvedPlayer.character.activeContract).toEqual(before.activeContract);
    expect(resolvedPlayer.character.completedContracts).toEqual(before.completedContracts);
    expect(result.state.activeResolution?.outcome).toMatchObject({
      text,
      effects: [text],
      salvageLoss: { requestedLoss: 1, actualLoss, resultingSalvage, sourceCardId: cardId }
    });
    expect(result.state.eventLog.some((event) => /SHOP|COMPLETE_CONTRACT/.test((event as { type?: string }).type ?? ""))).toBe(false);

    const phone = createPhoneProjection(result.state, player.seatId) as unknown as PhonePatchPayload;
    const tv = createTvProjection(result.state) as unknown as PublicPatchPayload;
    expect(phone.activeResolution?.outcome?.salvageLoss).toEqual(result.state.activeResolution?.outcome?.salvageLoss);
    expect(tv.activeResolution?.outcome?.text).toBe(text);
    expect(phone.pendingEncounterDecisionPrivate).toBeNull();
    expect(JSON.stringify(phone.activeResolution?.outcome)).not.toMatch(/payment|shopTransaction|lose_salvage/);
  });

  it("rejects wrong-seat, stale-source, and duplicate-source applications without another loss", () => {
    const wrongSeatState = resolutionState(card);
    wrongSeatState.players[0]!.character.salvage = 3;
    const wrongSeat = reduceGameState(wrongSeatState, { type: "RESOLUTION_APPLIED", seatId: "seat-2", effect: card.failEffect, sourceCardId: card.id, success: false, createdAt: "wrong-seat" });
    expect(wrongSeat.ok).toBe(false);
    expect(wrongSeat.state.players[0]!.character.salvage).toBe(3);

    const staleState = resolutionState(card);
    staleState.players[0]!.character.salvage = 3;
    const stale = reduceGameState(staleState, { type: "RESOLUTION_APPLIED", seatId: "seat-1", effect: card.failEffect, sourceCardId: "stale-card", success: false, createdAt: "stale" });
    expect(stale.ok).toBe(false);
    expect(stale.state.players[0]!.character.salvage).toBe(3);

    const first = applyFailure(resolutionState(card), card);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const replayState = structuredClone(first.state);
    replayState.pendingEffect = card.failEffect;
    replayState.activeResolution = { ...replayState.activeResolution!, stage: "roll_result" };
    const replay = applyFailure(replayState, card);
    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(replay.rejection.reason).toMatch(/already resolved/);
    expect(replay.state.players[0]!.character.salvage).toBe(first.state.players[0]!.character.salvage);
    expect(sessionSnapshotSchema.safeParse({ saveVersion: 2, sessionId: first.state.sessionId, sequence: first.state.sequence, state: first.state }).success).toBe(true);
  });
});

describe.each(displacementCards)("Phase B2A forced displacement: %s", (cardId, direction) => {
  const card = requireHazard(cardId);
  const step = direction === "clockwise" ? 1 : -1;

  function setup(blockDestination = false) {
    const state = resolutionState(card);
    const player = state.players[0]!;
    const origin = "middle_red_march_outpost";
    const destination = getRingTrackNeighbor(origin, step);
    if (!destination) throw new Error(`Missing ${direction} neighbor`);
    player.sectorId = origin;
    player.character.currentSpaceId = origin;
    player.character.wounds = 0;
    if (blockDestination) {
      state.sectors = state.sectors.map((sector) => sector.id === origin
        ? { ...sector, neighbors: sector.neighbors.filter((neighbor) => neighbor !== destination) }
        : sector);
    }
    return { state, origin, destination };
  }

  it("creates and resolves exactly one authoritative same-ring move without voluntary movement spend", () => {
    const { state, origin, destination } = setup();
    const movementStateBefore = JSON.stringify({ movementRolls: state.movementRolls, movementAdjustments: state.movementAdjustments, routeStarChoices: state.routeStarChoices });
    const opened = applyFailure(state, card);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const pending = opened.state.pendingDisplacement!;
    expect(pending).toMatchObject({ sourceId: cardId, originSectorId: origin, destinationSectorId: destination, direction, distance: 1, sameRing: true, failureStillCounts: true });
    expect(opened.state.players[0]!.sectorId).toBe(origin);
    expect(JSON.stringify({ movementRolls: opened.state.movementRolls, movementAdjustments: opened.state.movementAdjustments, routeStarChoices: opened.state.routeStarChoices })).toBe(movementStateBefore);
    expect(sessionSnapshotSchema.safeParse({ saveVersion: 2, sessionId: opened.state.sessionId, sequence: opened.state.sequence, state: opened.state }).success).toBe(true);

    const phonePending = createPhoneProjection(opened.state, "seat-1") as unknown as PhonePatchPayload;
    const tvPending = createTvProjection(opened.state) as unknown as PublicPatchPayload;
    expect(phonePending.pendingDisplacementPrivate).toMatchObject({ reactionId: pending.reactionId, destinationSectorId: destination });
    expect(tvPending.pendingDisplacement).toMatchObject({ sourceId: cardId, status: "waiting" });

    const accepted = reduceGameState(opened.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: pending.reactionId, createdAt: "accept" });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.state.players[0]!.sectorId).toBe(destination);
    expect(accepted.state.players[0]!.character.currentSpaceId).toBe(destination);
    expect(accepted.state.players[0]!.character.wounds).toBe(0);
    expect(accepted.state.pendingDisplacementArrival).toMatchObject({ seatId: "seat-1", sectorId: destination });
    expect(accepted.state.eventLog.filter((event) => (event as { type?: string }).type === "FORCED_DISPLACEMENT_RESOLVED")).toHaveLength(1);
    expect(accepted.state.eventLog.some((event) => (event as { type?: string }).type === "MOVEMENT_RESOLVED")).toBe(false);
    expect(JSON.stringify({ movementRolls: accepted.state.movementRolls, movementAdjustments: accepted.state.movementAdjustments, routeStarChoices: accepted.state.routeStarChoices })).toBe(movementStateBefore);
    expect((createPhoneProjection(accepted.state, "seat-1") as unknown as PhonePatchPayload).self?.sectorId).toBe(destination);
    expect((createTvProjection(accepted.state) as unknown as PublicPatchPayload).players.find((player) => player.seatId === "seat-1")?.sectorId).toBe(destination);
    expect(reduceGameState(accepted.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: pending.reactionId, createdAt: "duplicate" }).ok).toBe(false);
  });

  it("rejects wrong-seat and stale reactions and uses the normal no-destination Wound fallback safely", () => {
    const opened = applyFailure(setup().state, card);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const pending = opened.state.pendingDisplacement!;
    expect(reduceGameState(opened.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-2", reactionId: pending.reactionId, createdAt: "wrong" }).ok).toBe(false);
    expect(reduceGameState(opened.state, { type: "FORCED_DISPLACEMENT_RESOLVED", seatId: "seat-1", reactionId: "stale", createdAt: "stale" }).ok).toBe(false);

    const blockedSetup = setup(true);
    const blocked = applyFailure(blockedSetup.state, card);
    expect(blocked.ok).toBe(true);
    if (!blocked.ok) return;
    expect(blocked.state.pendingDisplacement).toBeNull();
    expect(blocked.state.players[0]!.sectorId).toBe(blockedSetup.origin);
    expect(blocked.state.players[0]!.character.wounds).toBe(1);
    expect(blocked.state.activeResolution?.outcome?.text).toMatch(/Suffered 1 Wound instead/);
  });

  it("keeps Rift Anchor Spike eligible, atomic, reconnect-safe, and one-use per source event", () => {
    const opened = applyFailure(setup().state, card);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const pending = opened.state.pendingDisplacement!;
    expect(canRiftAnchorSpikeSuppress(pending.sourceType, pending.sourceId)).toBe(true);
    const spike = { ...loadGear().get("rift-anchor-spike")!, instanceId: `${cardId}-spike`, currentCharges: 2 };
    const reconnectState = structuredClone(opened.state);
    reconnectState.players[0]!.character.heldGear.push(spike);
    reconnectState.players[0]!.character.equippedGear.utility = "rift-anchor-spike";
    const reconnectPhone = createPhoneProjection(reconnectState, "seat-1") as unknown as PhonePatchPayload;
    expect(reconnectPhone.pendingDisplacementPrivate?.riftAnchorSpike).toMatchObject({ instanceId: spike.instanceId, enabled: true });

    const prevented = reduceGameState(reconnectState, {
      type: "USE_GEAR",
      seatId: "seat-1",
      gearId: "rift-anchor-spike",
      chargeInstanceId: spike.instanceId,
      forcedDisplacementReactionId: pending.reactionId,
      forcedDisplacementSourceEventId: pending.sourceEventId,
      effect: null,
      discard: false,
      summary: "Rift Anchor Spike deployed.",
      createdAt: "prevent"
    });
    expect(prevented.ok).toBe(true);
    if (!prevented.ok) return;
    expect(prevented.state.pendingDisplacement).toBeNull();
    expect(prevented.state.pendingDisplacementArrival).toBeNull();
    expect(prevented.state.activeResolution?.outcome?.text).toBe("Forced displacement prevented.");
    expect(prevented.state.players[0]!.character.heldGear.find((item) => item.instanceId === spike.instanceId)?.currentCharges).toBe(1);
    expect(prevented.state.resolvedDisplacementSourceEventIds).toContain(pending.sourceEventId);
    expect(reduceGameState(prevented.state, {
      type: "USE_GEAR", seatId: "seat-1", gearId: "rift-anchor-spike", chargeInstanceId: spike.instanceId,
      forcedDisplacementReactionId: pending.reactionId, forcedDisplacementSourceEventId: pending.sourceEventId,
      effect: null, discard: false, summary: "duplicate", createdAt: "duplicate"
    }).ok).toBe(false);
  });
});
