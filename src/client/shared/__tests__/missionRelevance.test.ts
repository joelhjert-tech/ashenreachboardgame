import { describe, expect, it } from "vitest";
import { loadContracts } from "../../../game/content/contracts.js";
import type { ContractCard } from "../types.js";
import {
  getMissionObjectiveCategory,
  getMissionRelevanceForSector,
  getMissionTargetClue
} from "../missionRelevance.js";

describe("mission relevance", () => {
  it("names the exact Pilgrim Lock action required by Cleanse Ember Sanctum", () => {
    const contract = loadContracts().get("cleanse-ember-sanctum")! as unknown as ContractCard;

    expect(getMissionObjectiveCategory(contract)).toBe("Tile action");
    expect(getMissionTargetClue(contract)).toBe(
      "Target: Pilgrim Lock Gate — resolve Pilgrim Rest after arrival threats are cleared."
    );
    expect(getMissionRelevanceForSector(contract, "outer_ember_sanctum")).toEqual({
      label: "Mission",
      missionTitle: "Cleanse Ember Sanctum",
      reason: "This sector can progress Cleanse Ember Sanctum: resolve Pilgrim Rest after arrival threats are cleared."
    });
    expect(getMissionRelevanceForSector(contract, "ashwake-crossing")).toBeNull();
  });

  it("distinguishes authored tile challenges from ordinary tile actions", () => {
    const contract = {
      id: "chapel-rift-duty",
      name: "Chapel Rift Duty",
      factionGiver: "Reach Wardens",
      text: "Quiet the recurring breach.",
      objective: {
        type: "tileChallengeResolved",
        challengeId: "rift-whispers-ashen-chapel",
        sectorId: "ashen-chapel",
        label: "Quiet the Rift Whispers",
        target: 1,
        requireSuccess: true
      },
      reward: { effects: [] }
    } satisfies ContractCard;

    expect(getMissionObjectiveCategory(contract)).toBe("Tile challenge");
    expect(getMissionTargetClue(contract)).toMatch(/challenge at Ashen Chapel: Quiet the Rift Whispers/i);
    expect(getMissionRelevanceForSector(contract, "ashen-chapel")?.reason).toMatch(/resolve Quiet the Rift Whispers/i);
    expect(getMissionRelevanceForSector(contract, "ashen-chapel", { challenges: [] })).toBeNull();
    expect(getMissionRelevanceForSector(contract, "ashen-chapel", { challenges: [{ id: "other-challenge", challengeType: "anomaly", tags: [] }] })).toBeNull();
    expect(getMissionRelevanceForSector(contract, "ashen-chapel", { challenges: [{ id: "rift-whispers-ashen-chapel", challengeType: "anomaly", tags: [] }] })?.reason).toMatch(/Quiet the Rift Whispers/);
  });
});
