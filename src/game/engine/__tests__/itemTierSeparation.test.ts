import { describe, expect, it } from "vitest";
import { getGearCardArtPath, getGearCardArtType } from "../../../client/shared/assetPaths.js";
import { loadArtifactCards } from "../../content/artifacts.js";
import { loadCharacters } from "../../content/characters.js";
import { loadGear } from "../../content/gear.js";
import { getAvailableShopStockForCategory } from "../../rules/shopAvailability.js";

const NORMAL_EQUIPMENT_IDS = [
  "rustknife-carbine", "nailspike-maul", "emberlock-pistol", "chainhook-blade", "ashen-bayonet", "stormcut-axe",
  "rivetplate-vest", "sootmantle-cloak", "ironhide-bracers", "salvage-guard-mask", "chapel-guard-harness", "wardens-kneeplate",
  "route-compass", "field-lens", "lockjaw-kit", "bridge-spike", "static-probe", "surveyor-chalk",
  "cinder-suture-kit", "saintwire-splint", "salt-gauze-wrap", "last-breath-rivet", "ember-poultice", "wound-clamp",
  "black-route-fuse", "salvage-ledger", "mirror-token", "oath-chain", "red-march-bell", "signal-lantern"
] as const;

const CONVERTED_ARTIFACT_GEAR_IDS = [
  "ashen-route-compass", "blackstar-ampoule", "coffin-rig", "grave-lens", "marshal-seal",
  "mirror-reroll-token", "oath-chain-ledger", "red-march-warbell", "tuning-spines", "veil-hook"
] as const;

describe("equipment and artifact tier separation", () => {
  it("defines the canonical 30 normal equipment items as common, starting-eligible equipment", () => {
    const gear = loadGear();

    expect(NORMAL_EQUIPMENT_IDS).toHaveLength(30);
    for (const id of NORMAL_EQUIPMENT_IDS) {
      const item = gear.get(id);
      expect(item, id).toBeDefined();
      expect(item?.tier, id).not.toBe("artifact");
      expect(item?.startingEligible, id).toBe(true);
      expect(item?.normalShopCommon, id).toBe(true);
      expect(item?.subtype, id).toBeDefined();
      expect(getGearCardArtType(item!), id).toBe("equipment");
      expect(getGearCardArtPath(item!), id).not.toContain("/artifacts/");
      expect(item?.allowedFallbackArt, id).toBe(true);
    }
  });

  it("gives every playable character only normal starting equipment", () => {
    const gear = loadGear();
    const characters = [...loadCharacters().values()].filter((character) => !character.qaOnly);

    expect(characters).toHaveLength(16);
    for (const character of characters) {
      expect(character.startingGear?.length, character.id).toBeGreaterThanOrEqual(1);
      for (const gearId of character.startingGear ?? []) {
        const item = gear.get(gearId);
        expect(item, `${character.id}:${gearId}`).toBeDefined();
        expect(item?.tier, `${character.id}:${gearId}`).not.toBe("artifact");
        expect(item?.startingEligible, `${character.id}:${gearId}`).toBe(true);
        expect(getGearCardArtType(item!), `${character.id}:${gearId}`).toBe("equipment");
      }
    }
  });

  it("keeps artifacts out of common shops and marks true artifact cards as rare rewards", () => {
    const gear = loadGear();
    const commonStock = getAvailableShopStockForCategory(gear.values(), "market");
    const rareStock = getAvailableShopStockForCategory(gear.values(), "relic-dealer", { includeArtifacts: true });

    expect(commonStock.length).toBeGreaterThan(0);
    expect(commonStock.every((item) => item.tier !== "artifact" && item.normalShopCommon === true)).toBe(true);
    expect(rareStock.some((item) => item.tier === "artifact")).toBe(true);

    for (const id of CONVERTED_ARTIFACT_GEAR_IDS) {
      const item = gear.get(id);
      expect(item?.tier, id).toBe("artifact");
      expect(item?.startingEligible, id).toBe(false);
      expect(item?.normalShopCommon, id).toBe(false);
      expect(getGearCardArtType(item!), id).toBe("artifact");
      expect(getGearCardArtPath(item!), id).toContain("/artifacts/");
    }

    const artifacts = [...loadArtifactCards().values()];
    expect(artifacts.length).toBeGreaterThan(0);
    for (const artifact of artifacts) {
      expect(artifact.startingEligible, artifact.id).toBe(false);
      expect(artifact.normalShopCommon, artifact.id).toBe(false);
      expect([
        artifact.missionRewardEligible,
        artifact.eliteThreatRewardEligible,
        artifact.rareShopEligible,
        artifact.scenarioRewardEligible
      ].some(Boolean), artifact.id).toBe(true);
    }
  });
});
