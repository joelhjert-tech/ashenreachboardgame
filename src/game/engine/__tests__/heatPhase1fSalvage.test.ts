import { describe, expect, it } from "vitest";
import { loadContracts } from "../../content/contracts.js";
import type { EncounterEffect } from "../../schema/card.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { APPROVED_LEGACY_HEAT_CONTENT_IDS, validateLegacyHeatContentRecord } from "../../../../scripts/legacy-heat-validation.js";
import { reduceGameState } from "../reducer.js";

const COMPLETED_IDS = [
  "cartel-crossing-thread",
  "choir-echo-triangulation",
  "choir-hush-census",
  "choir-well-canticle",
  "clan-salt-burial",
  "contract-beacon",
  "warden-span-vigil"
] as const;

const BLOCKED_LOW_SEVERITY_IDS = [
  "escalation-crownfall-writ",
  "ash-rat-skitter",
  "bridge-toll-runt",
  "gate-tax-collectors",
  "gutter-bell-mite",
  "pale-toll-enforcer",
  "rust-choir-peddlers",
  "rust-mote-drone",
  "toll-scrip-urchins"
] as const;

describe("Phase 1F low-severity Salvage rewards", () => {
  it("contains exactly the seven implementation-ready Contract rewards", () => {
    expect(COMPLETED_IDS).toHaveLength(7);
    expect(new Set(COMPLETED_IDS).size).toBe(7);
    const contracts = loadContracts();
    for (const id of COMPLETED_IDS) expect(contracts.has(id)).toBe(true);
  });

  it.each(COMPLETED_IDS)("awards exactly one Salvage once for %s without mutating other consequence systems", (id) => {
    const effect = loadContracts().get(id)!.reward as EncounterEffect;
    expect(JSON.stringify(effect)).toContain("gain_salvage");
    expect(JSON.stringify(effect)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);

    const state = createInitialSessionState(`phase-1f-${id}`, "single-player");
    const seatId = state.players[0]!.seatId;
    state.status = "active";
    state.phase = "resolution";
    state.pendingEffect = effect;
    state.players[0]!.character.salvage = 2;
    state.players[0]!.character.heat = 3;
    state.players[0]!.character.wounds = 1;
    state.players[0]!.character.scars = ["scar-wound-1"];
    state.escalationLevel = 2;
    state.scenarioProgress = { lossPressure: 4 };

    const result = reduceGameState(state, { type: "RESOLUTION_APPLIED", seatId, effect, sourceCardId: id, success: true, createdAt: "now" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const player = result.state.players[0]!;
    expect(player.character.salvage).toBe(3);
    expect(player.character.heat).toBe(3);
    expect(player.character.wounds).toBe(1);
    expect(player.character.scars).toEqual(["scar-wound-1"]);
    expect(result.state.escalationLevel).toBe(2);
    expect(result.state.scenarioProgress).toEqual({ lossPressure: 4 });
  });

  it("leaves unsupported low-severity losses and payments unchanged and allowlisted", () => {
    expect(BLOCKED_LOW_SEVERITY_IDS).toHaveLength(9);
    for (const id of BLOCKED_LOW_SEVERITY_IDS) {
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(id)).toBe(true);
    }
  });

  it("shrinks only completed approvals while continuing to reject new Heat constructs", () => {
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(107);
    for (const id of COMPLETED_IDS) expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(id)).toBe(false);
    expect(validateLegacyHeatContentRecord("new.json", { id: "new-heat", reward: { type: "lose_heat", amount: 1 } })[0]).toMatch(/blocked legacy Heat construct/);
    expect(validateLegacyHeatContentRecord("salvage.json", { id: "new-salvage", reward: { type: "gain_salvage", amount: 1 } })).toEqual([]);
  });
});
