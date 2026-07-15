import { describe, expect, it } from "vitest";
import { loadEscalationCards } from "../../content/escalations.js";
import { loadThreatCards } from "../../content/threats.js";
import { effectSchema, type EncounterEffect } from "../../schema/card.schema.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import {
  APPROVED_AUTOMATIC_SALVAGE_LOSS_IDS,
  APPROVED_LEGACY_HEAT_CONTENT_IDS,
  validateLegacyHeatContentRecord
} from "../../../../scripts/legacy-heat-validation.js";
import { reduceGameState } from "../reducer.js";

const AUTOMATIC_LOSS_IDS = [
  "escalation-crownfall-writ",
  "ash-rat-skitter",
  "bridge-toll-runt",
  "crown-bell-baron",
  "glass-tick-cloud",
  "gutter-bell-mite",
  "locked-vault",
  "marrow-tax-auditors",
  "pale-contract-collector",
  "pale-toll-enforcer",
  "rust-mote-drone",
  "soot-stained-cutpurse",
  "toll-scrip-urchins"
] as const;

function applyLoss(startingSalvage: number, amount: number, effect: EncounterEffect = { type: "lose_salvage", amount }) {
  const state = createInitialSessionState(`phase-1g-${startingSalvage}-${amount}`, "single-player");
  const seatId = state.players[0]!.seatId;
  state.status = "active";
  state.phase = "resolution";
  state.pendingEffect = effect;
  state.players[0]!.character.salvage = startingSalvage;
  state.players[0]!.character.wounds = 1;
  state.players[0]!.character.scars = ["scar-wound-1"];
  state.escalationLevel = 2;
  state.scenarioProgress = { lossPressure: 3 };
  state.activeResolution = {
    id: `resolution-${startingSalvage}-${amount}`,
    playerId: seatId,
    source: "threat",
    stage: "roll_result",
    outcome: { title: "Failure", text: "Pending", effects: ["Pending"] }
  };
  return reduceGameState(state, { type: "RESOLUTION_APPLIED", seatId, effect, sourceCardId: "phase-1g-test", success: false, createdAt: "now" });
}

describe("Phase 1G floor-zero Salvage loss", () => {
  it("accepts only positive integer lose_salvage amounts", () => {
    expect(effectSchema.safeParse({ type: "lose_salvage", amount: 1 }).success).toBe(true);
    for (const invalid of [{ type: "lose_salvage" }, { type: "lose_salvage", amount: 0 }, { type: "lose_salvage", amount: -1 }, { type: "lose_salvage", amount: 1.5 }]) {
      expect(effectSchema.safeParse(invalid).success).toBe(false);
    }
    expect(effectSchema.safeParse({ type: "gain_heat", amount: 1 }).success).toBe(true);
    expect(effectSchema.safeParse({ type: "gain_salvage", amount: 1 }).success).toBe(true);
  });

  it.each([
    [4, 1, 3, "Lost 1 Salvage."],
    [1, 1, 0, "Lost 1 Salvage."],
    [0, 1, 0, "No Salvage was lost."],
    [1, 2, 0, "Lost 1 Salvage."]
  ] as const)("resolves %i minus %i at floor zero", (start, amount, expected, summary) => {
    const result = applyLoss(start, amount);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]!.character.salvage).toBe(expected);
    expect(result.state.activeResolution?.outcome?.effects).toEqual([summary]);
    expect(result.state.players[0]!.character.wounds).toBe(1);
    expect(result.state.players[0]!.character.scars).toEqual(["scar-wound-1"]);
    expect(result.state.escalationLevel).toBe(2);
    expect(result.state.scenarioProgress).toEqual({ lossPressure: 3 });
    expect(result.state.pendingEffect).toBeNull();
    const duplicate = reduceGameState(result.state, { type: "RESOLUTION_APPLIED", seatId: result.state.players[0]!.seatId, effect: { type: "lose_salvage", amount }, sourceCardId: "phase-1g-test", success: false, createdAt: "later" });
    expect(duplicate.ok).toBe(false);
  });

  it("preserves authored sequence order while reporting actual loss", () => {
    const effect: EncounterEffect = { type: "sequence", effects: [{ type: "gain_note", text: "First." }, { type: "lose_salvage", amount: 2 }, { type: "gain_note", text: "Last." }] };
    const result = applyLoss(1, 2, effect);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.state.activeResolution?.outcome?.effects).toEqual(["Failure: note added: First.", "Lost 1 Salvage.", "Failure: note added: Last."]);
  });

  it("retains exactly thirteen approved automatic consequences without treating Rust Choir recovery as automatic loss", () => {
    expect([...APPROVED_AUTOMATIC_SALVAGE_LOSS_IDS].sort()).toEqual([...AUTOMATIC_LOSS_IDS].sort());
    const threats = loadThreatCards();
    const escalations = loadEscalationCards();
    for (const id of AUTOMATIC_LOSS_IDS) {
      const card = threats.get(id) ?? escalations.get(id);
      expect(card).toBeDefined();
      expect(JSON.stringify(card)).toContain('"type":"lose_salvage"');
      expect(JSON.stringify(card)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(id)).toBe(false);
    }
    const peddlers = threats.get("rust-choir-peddlers")!;
    expect(JSON.stringify(peddlers)).toContain('"mode":"optional"');
    expect(JSON.stringify(peddlers)).not.toContain('"type":"gain_heat"');
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(peddlers.id)).toBe(false);
  });

  it("keeps automatic loss behind an explicit authoring boundary", () => {
    expect(validateLegacyHeatContentRecord("approved.json", { id: "ash-rat-skitter", failEffect: { type: "lose_salvage", amount: 1 } })).toEqual([]);
    expect(validateLegacyHeatContentRecord("toll.json", { id: "new-toll", text: "Pay a toll", failEffect: { type: "lose_salvage", amount: 1 } })[0]).toMatch(/Payments, tolls, fees, purchases, and choices/);
    expect(validateLegacyHeatContentRecord("choice.json", { id: "new-choice", text: "Choose to pay", failEffect: { type: "lose_salvage", amount: 1 } })[0]).toMatch(/outside the approved automatic/);
    expect(validateLegacyHeatContentRecord("heat.json", { id: "new-heat", failEffect: { type: "gain_heat", amount: 1 } })[0]).toMatch(/blocked legacy Heat construct/);
  });
});
