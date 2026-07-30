import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../content/threats.js";
import type { GameState } from "../../schema/session.schema.js";
import { getMovementStepBlockReason } from "../movementPlanner.js";
import { getServiceThreatGate } from "../tileFunctions.js";
import {
  getPersistentEnemyDifficultyModifier,
  getPersistentHazardExtraThreatLane,
  getPersistentHazardMovementBlockReason,
  getPersistentHazardServiceLockReason,
  isFirstThreatGearSuppressed,
  KNOTRAIL_ROUTE_BLOCK_REASON,
  LEDGER_MOLD_SERVICE_LOCK_REASON,
  PERSISTENT_HAZARD_IDS
} from "../persistentHazards.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

function stateWithHazard(hazardId: string) {
  const state = createInitialSessionState(`persistent-${hazardId}`, "single-player");
  const sector = state.sectors.find((entry) => entry.neighbors.length >= 2)!;
  sector.persistentThreatIds = [hazardId];
  return { state, sector, player: state.players[0]! };
}

describe("persistent Hazard rules", () => {
  it("gives every authored Hazard the standard one-Salvage clear reward", () => {
    const hazards = [...loadThreatCards().values()].filter((card) => card.cardType === "hazard");
    expect(hazards).toHaveLength(54);
    expect(hazards.every((card) =>
      card.clearReward?.type === "gain_salvage" && card.clearReward.amount === 1
    )).toBe(true);
  });

  it("registers all five new cards as fail-persistent hazards", () => {
    const threats = loadThreatCards();
    for (const id of Object.values(PERSISTENT_HAZARD_IDS)) {
      const card = threats.get(id);
      expect(card?.cardType).toBe("hazard");
      if (!card || card.cardType !== "hazard") throw new Error(`Missing Hazard ${id}`);
      expect(card?.persistentRule).toBeDefined();
      expect(JSON.stringify(card?.failEffect)).toContain('"return_threat_to_space"');
    }
  });

  it("raises enemy difficulty in the Vent's sector and its neighbors only", () => {
    const { state, sector } = stateWithHazard(PERSISTENT_HAZARD_IDS.emberlungVent);
    expect(getPersistentEnemyDifficultyModifier(state, sector.id)).toBe(1);
    expect(getPersistentEnemyDifficultyModifier(state, sector.neighbors[0]!)).toBe(1);
    const remote = state.sectors.find((entry) =>
      entry.id !== sector.id && !sector.neighbors.includes(entry.id)
    );
    if (remote) expect(getPersistentEnemyDifficultyModifier(state, remote.id)).toBe(0);
  });

  it("allows entering a Cave-In but blocks a route from crossing through it", () => {
    const { state, sector, player } = stateWithHazard(PERSISTENT_HAZARD_IDS.knotrailCaveIn);
    const originId = sector.neighbors[0]!;
    const exitId = sector.neighbors[1]!;
    player.sectorId = originId;
    player.character.currentSpaceId = originId;

    expect(getPersistentHazardMovementBlockReason(state, player, originId)).toBeNull();
    expect(getPersistentHazardMovementBlockReason(state, player, sector.id)).toBe(
      KNOTRAIL_ROUTE_BLOCK_REASON
    );
    expect(getMovementStepBlockReason(state, player, sector.id, exitId)).toBe(
      KNOTRAIL_ROUTE_BLOCK_REASON
    );
  });

  it("adds one matching lane, locks services, and suppresses first-threat Gear from saved state", () => {
    const deadwire = stateWithHazard(PERSISTENT_HAZARD_IDS.deadwireRepeater);
    expect(getPersistentHazardExtraThreatLane(deadwire.state, deadwire.sector.id, "blue")).toBe("blue");

    const ledger = stateWithHazard(PERSISTENT_HAZARD_IDS.ledgerMoldBloom);
    expect(getPersistentHazardServiceLockReason(ledger.state, ledger.sector.id)).toBe(
      LEDGER_MOLD_SERVICE_LOCK_REASON
    );

    const serviceState = createInitialSessionState("ledger-service-lock", "single-player");
    const servicePlayer = serviceState.players[0]!;
    servicePlayer.sectorId = "ashen-chapel";
    servicePlayer.character.currentSpaceId = "ashen-chapel";
    const serviceSector = serviceState.sectors.find((entry) => entry.id === "ashen-chapel")!;
    serviceSector.persistentThreatIds = [PERSISTENT_HAZARD_IDS.ledgerMoldBloom];
    expect(getServiceThreatGate(serviceState, servicePlayer.seatId, serviceSector.id)).toMatchObject({
      allowed: false,
      failed: true,
      reason: LEDGER_MOLD_SERVICE_LOCK_REASON
    });

    const latchfog = stateWithHazard(PERSISTENT_HAZARD_IDS.latchfogNullfield);
    const progress: NonNullable<GameState["tileArrivalThreatProgress"]> = {
      arrivalId: "arrival-1",
      seatId: latchfog.player.seatId,
      sectorId: latchfog.sector.id,
      threatLanes: ["red"],
      threatRuleIds: ["persistent:latchfog-nullfield:red"],
      nextThreatIconIndex: 1
    };
    expect(isFirstThreatGearSuppressed(progress)).toBe(true);
    expect(isFirstThreatGearSuppressed({ ...progress, nextThreatIconIndex: 2 })).toBe(false);
    expect(isFirstThreatGearSuppressed(structuredClone(progress))).toBe(true);
  });
});
