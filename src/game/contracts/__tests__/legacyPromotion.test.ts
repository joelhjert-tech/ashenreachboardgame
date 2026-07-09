import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getRuntimeCardArtPath } from "../../assets/runtime/cardArtRuntimeCatalog.js";
import type { EncounterEffect } from "../../schema/card.schema.js";
import { loadContracts } from "../../content/contracts.js";

const promotedContractIds = [
  "break-the-raider-chain",
  "hunt-breachborn",
  "map-broken-paths",
  "gatefire-vigil",
  "salvage-the-bellframe",
  "restart-void-relay",
  "pilgrim-convoy",
  "choir-quietus",
  "cleanse-ember-sanctum"
] as const;

const deferredContractIds = ["lattice-witness", "hold-the-ridge", "span-of-the-last-seal"] as const;

function effectContainsHeat(effect: EncounterEffect): boolean {
  if (effect.type === "sequence") {
    return effect.effects.some(effectContainsHeat);
  }

  return effect.type === "gain_heat" || effect.type === "gain_heat_all" || effect.type === "lose_heat";
}

describe("legacy contract promotion", () => {
  const contracts = loadContracts();

  it("promotes exactly the selected legacy contract candidates under the current cap", () => {
    expect(contracts.size).toBe(30);

    promotedContractIds.forEach((contractId) => {
      expect(contracts.has(contractId)).toBe(true);
    });

    deferredContractIds.forEach((contractId) => {
      expect(contracts.has(contractId)).toBe(false);
    });
  });

  it("keeps promoted contract art active without making card backs or deferred art active", () => {
    promotedContractIds.forEach((contractId) => {
      const expectedPath = `/assets/cards/contracts/${contractId}.png`;
      expect(getRuntimeCardArtPath("contract", contractId)).toBe(expectedPath);
      expect(existsSync(join(process.cwd(), "public", expectedPath))).toBe(true);
    });

    expect(getRuntimeCardArtPath("contract", "card-back-contract")).toBeUndefined();
    deferredContractIds.forEach((contractId) => {
      expect(getRuntimeCardArtPath("contract", contractId)).toBeUndefined();
      expect(existsSync(join(process.cwd(), "public", "assets", "cards", "contracts", `${contractId}.png`))).toBe(
        false
      );
    });
  });

  it("does not add Heat rewards to the promoted contracts", () => {
    promotedContractIds.forEach((contractId) => {
      const contract = contracts.get(contractId);
      expect(contract).toBeDefined();
      expect(effectContainsHeat(contract!.reward)).toBe(false);
    });
  });
});
