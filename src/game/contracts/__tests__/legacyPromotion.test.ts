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
  "cleanse-ember-sanctum",
  "hold-the-ridge",
  "lattice-witness",
  "span-of-the-last-seal"
] as const;

function effectContainsHeat(effect: EncounterEffect): boolean {
  if (effect.type === "sequence") {
    return effect.effects.some(effectContainsHeat);
  }

  const type = effect.type as string;
  return type === "gain_heat" || type === "gain_heat_all" || type === "lose_heat";
}

describe("legacy contract promotion", () => {
  const contracts = loadContracts();

  it("keeps all twelve promoted legacy candidates in the current 39-card contract catalog", () => {
    expect(contracts.size).toBe(39);

    promotedContractIds.forEach((contractId) => {
      expect(contracts.has(contractId)).toBe(true);
    });
  });

  it("keeps promoted contract art active without making card backs active", () => {
    promotedContractIds.forEach((contractId) => {
      const expectedPath = `/assets/cards/contracts/${contractId}.png`;
      expect(getRuntimeCardArtPath("contract", contractId)).toBe(expectedPath);
      expect(existsSync(join(process.cwd(), "public", expectedPath))).toBe(true);
    });

    expect(getRuntimeCardArtPath("contract", "card-back-contract")).toBeUndefined();
  });

  it("does not add Heat rewards to the promoted contracts", () => {
    promotedContractIds.forEach((contractId) => {
      const contract = contracts.get(contractId);
      expect(contract).toBeDefined();
      expect(contract!.reward.effects.some(effectContainsHeat)).toBe(false);
    });
  });

  it("uses existing authoritative objective types for the three final promotions", () => {
    expect(contracts.get("hold-the-ridge")?.objective).toMatchObject({
      type: "spaceTextResolved",
      effectKey: "outer_emberwatchBrace",
      target: 1
    });
    expect(contracts.get("lattice-witness")?.objective).toMatchObject({
      type: "spaceTextResolved",
      effectKey: "inner_cinderLatticeTrial",
      target: 1
    });
    expect(contracts.get("span-of-the-last-seal")?.objective).toMatchObject({
      type: "multiStopRoute",
      ordered: true,
      targets: [
        { type: "spaceId", value: "middle_guardian_span" },
        { type: "spaceId", value: "inner_veil_rift" }
      ]
    });
  });
});
