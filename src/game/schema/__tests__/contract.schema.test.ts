import { describe, expect, it } from "vitest";
import { loadContracts } from "../../content/contracts.js";
import { loadGear } from "../../content/gear.js";
import { BOARD_SPACES } from "../../data/boardSpaces.js";
import { BOARD_TEXT_EFFECTS } from "../../data/boardTextEffects.js";
import { formatContractObjectiveStatus } from "../../contracts/objectives.js";
import type { EncounterEffect } from "../card.schema.js";
import { contractCardSchema } from "../contract.schema.js";

const base = { id: "schema-test", name: "Schema Test", factionGiver: "Meridian Compact", text: "Original Ashen Reach test copy.", reward: { type: "gain_note", text: "Test reward." } };

function collectEffects(effect: EncounterEffect): EncounterEffect[] {
  return effect.type === "sequence" ? effect.effects.flatMap(collectEffects) : [effect];
}

describe("contract schema and completability", () => {
  it("accepts two-to-four route targets and rejects invalid target counts", () => {
    const target = { id: "a", type: "spaceId" as const, value: "ashwake-crossing", label: "Bridge" };
    expect(contractCardSchema.safeParse({ ...base, objective: { type: "multiStopRoute", ordered: true, targets: [target, { ...target, id: "b" }] } }).success).toBe(true);
    expect(contractCardSchema.safeParse({ ...base, objective: { type: "multiStopRoute", ordered: true, targets: [target] } }).success).toBe(false);
    expect(contractCardSchema.safeParse({ ...base, objective: { type: "multiStopRoute", ordered: false, targets: [target, target, target, target, target] } }).success).toBe(false);
  });

  it("accepts supported shop actions and rejects invalid actions or counts", () => {
    expect(contractCardSchema.safeParse({ ...base, objective: { type: "shopTransaction", action: "buyEquipment", requiredCount: 1, label: "Buy equipment" } }).success).toBe(true);
    expect(contractCardSchema.safeParse({ ...base, objective: { type: "shopTransaction", action: "steal", requiredCount: 1, label: "Invalid" } }).success).toBe(false);
    expect(contractCardSchema.safeParse({ ...base, objective: { type: "shopTransaction", action: "sellGear", requiredCount: 0, label: "Invalid" } }).success).toBe(false);
  });

  it("continues accepting both legacy objective schemas", () => {
    expect(contractCardSchema.safeParse({ ...base, objective: { type: "defeatCount", target: 2 } }).success).toBe(true);
    expect(contractCardSchema.safeParse({ ...base, objective: { type: "spaceTextResolved", effectKey: "outer_test", label: "Resolve test", target: 1 } }).success).toBe(true);
  });

  it("audits every authored contract for a valid, reachable, displayable lifecycle", () => {
    const contracts = [...loadContracts().values()];
    const gear = loadGear();
    const spaceIds = new Set(BOARD_SPACES.map((space) => space.id));
    const tags = new Set<string>(BOARD_SPACES.flatMap((space) => space.tags));
    const effectKeys = new Set(Object.keys(BOARD_TEXT_EFFECTS));
    const reachableShopActions = new Set(["buyEquipment", "sellGear", "repairGear", "trade"]);

    expect(contracts).toHaveLength(36);
    for (const contract of contracts) {
      expect(contractCardSchema.safeParse(contract).success, contract.id).toBe(true);
      expect(formatContractObjectiveStatus(contract, 0), contract.id).toContain("(");

      switch (contract.objective.type) {
        case "defeatCount":
          expect(contract.objective.target, contract.id).toBeGreaterThan(0);
          break;
        case "spaceTextResolved":
          expect(effectKeys.has(contract.objective.effectKey), contract.id).toBe(true);
          break;
        case "multiStopRoute":
          for (const target of contract.objective.targets) {
            expect(target.type === "spaceId" ? spaceIds.has(target.value) : tags.has(target.value), `${contract.id}:${target.id}`).toBe(true);
          }
          break;
        case "shopTransaction":
          expect(reachableShopActions.has(contract.objective.action), contract.id).toBe(true);
          if (contract.objective.requiredSectorId) expect(spaceIds.has(contract.objective.requiredSectorId), contract.id).toBe(true);
          if (contract.objective.requiredShopType) expect(tags.has(contract.objective.requiredShopType), contract.id).toBe(true);
          break;
      }

      for (const effect of collectEffects(contract.reward)) {
        if (effect.type === "gain_gear") {
          const item = gear.get(effect.gearId);
          expect(item, `${contract.id}:${effect.gearId}`).toBeDefined();
          expect(["starter", "standard", "advanced", "artifact", undefined], `${contract.id}:${effect.gearId}`).toContain(item?.tier);
        }
      }
    }
  });
});
