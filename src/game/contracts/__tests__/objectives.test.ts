import { describe, expect, it } from "vitest";
import {
  advanceContractObjectiveProgress,
  advanceContractObjectiveState,
  describeContractObjective,
  formatContractProgress,
  isContractObjectiveComplete,
  setContractProgressFloor
} from "../objectives.js";

const contract = {
  objective: {
    type: "defeatCount" as const,
    target: 2
  }
};

const routeContract = {
  objective: {
    type: "spaceTextResolved" as const,
    effectKey: "outer_ashwakeClearLane",
    label: "Clear the Ashwake convoy lane",
    target: 1
  }
};

describe("contract objectives", () => {
  it("advances defeat-count objectives from enemy defeats and clamps at target", () => {
    expect(
      advanceContractObjectiveProgress(contract, 0, {
        type: "enemy-defeated"
      })
    ).toBe(1);

    expect(
      advanceContractObjectiveProgress(contract, 1, {
        type: "enemy-defeated",
        amount: 3
      })
    ).toBe(2);
  });

  it("can set a minimum progress floor without exceeding the authored target", () => {
    expect(setContractProgressFloor(contract, 0, 1)).toBe(1);
    expect(setContractProgressFloor(contract, 1, 4)).toBe(2);
  });

  it("tracks unordered route stops once", () => {
    const mission = { objective: { type: "multiStopRoute" as const, ordered: false, targets: [
      { id: "market", type: "tag" as const, value: "shop", label: "Market" },
      { id: "bridge", type: "spaceId" as const, value: "ashwake-crossing", label: "Bridge" }
    ] } };
    const first = advanceContractObjectiveState(mission, { progress: 0 }, { type: "sector-visited", sectorId: "outer_waymarket", sectorTags: ["shop"] });
    const duplicate = advanceContractObjectiveState(mission, first, { type: "sector-visited", sectorId: "outer_waymarket", sectorTags: ["shop"] });
    const complete = advanceContractObjectiveState(mission, duplicate, { type: "sector-visited", sectorId: "ashwake-crossing", sectorTags: ["hazard"] });
    expect(first).toMatchObject({ progress: 1, completedTargetIds: ["market"] });
    expect(duplicate).toEqual(first);
    expect(isContractObjectiveComplete(mission, complete)).toBe(true);
  });

  it("requires ordered stops to arrive in sequence", () => {
    const mission = { objective: { type: "multiStopRoute" as const, ordered: true, targets: [
      { id: "first", type: "spaceId" as const, value: "ashwake-crossing", label: "Bridge" },
      { id: "second", type: "spaceId" as const, value: "outer_waymarket", label: "Market" }
    ] } };
    const skipped = advanceContractObjectiveState(mission, { progress: 0 }, { type: "sector-visited", sectorId: "outer_waymarket", sectorTags: ["shop"] });
    const first = advanceContractObjectiveState(mission, skipped, { type: "sector-visited", sectorId: "ashwake-crossing", sectorTags: ["hazard"] });
    expect(skipped.progress).toBe(0);
    expect(first).toMatchObject({ progress: 1, completedTargetIds: ["first"] });
  });

  it("counts only matching successful shop transaction events", () => {
    const mission = { objective: { type: "shopTransaction" as const, action: "repairGear" as const, requiredShopType: "shop", requiredCount: 2, label: "Repair twice" } };
    const wrong = advanceContractObjectiveState(mission, { progress: 0 }, { type: "shop-transaction", action: "sellGear", sectorId: "outer_waymarket", shopTypes: ["shop"] });
    const first = advanceContractObjectiveState(mission, wrong, { type: "shop-transaction", action: "repairGear", sectorId: "outer_waymarket", shopTypes: ["shop"] });
    const second = advanceContractObjectiveState(mission, first, { type: "shop-transaction", action: "repairGear", sectorId: "kettleward-foundry", shopTypes: ["shop", "salvage"] });
    expect(wrong.progress).toBe(0);
    expect(first.progress).toBe(1);
    expect(isContractObjectiveComplete(mission, second)).toBe(true);
  });

  it("formats and evaluates completion from the authored objective", () => {
    expect(describeContractObjective(contract)).toBe("Defeat 2 enemies");
    expect(formatContractProgress(contract, 1)).toBe("1/2 defeats");
    expect(isContractObjectiveComplete(contract, 1)).toBe(false);
    expect(isContractObjectiveComplete(contract, 2)).toBe(true);
  });

  it("supports board-text-driven contract objectives from authored effect keys", () => {
    expect(
      advanceContractObjectiveProgress(routeContract, 0, {
        type: "space-text-resolved",
        effectKey: "outer_ashwakeClearLane"
      })
    ).toBe(1);

    expect(
      advanceContractObjectiveProgress(routeContract, 0, {
        type: "space-text-resolved",
        effectKey: "outer_glassmereChorus"
      })
    ).toBe(0);

    expect(describeContractObjective(routeContract)).toBe("Clear the Ashwake convoy lane");
    expect(formatContractProgress(routeContract, 1)).toBe("1/1 clears");
    expect(isContractObjectiveComplete(routeContract, 1)).toBe(true);
  });

  it("matches tile challenge objectives only against their authored challenge facts", () => {
    const mission = { objective: { type: "tileChallengeResolved" as const, challengeId: "rift-whispers-ashen-chapel", sectorId: "ashen-chapel", challengeType: "anomaly" as const, challengeTag: "signal", requireSuccess: true, target: 1, label: "Quiet Rift Whispers" } };
    const matching = { type: "tile-challenge-resolved" as const, challengeId: "rift-whispers-ashen-chapel", sectorId: "ashen-chapel", challengeType: "anomaly" as const, challengeTags: ["signal", "recurring"], testStat: "signal" as const, success: true };
    expect(advanceContractObjectiveProgress(mission, 0, { ...matching, success: false })).toBe(0);
    expect(advanceContractObjectiveProgress(mission, 0, { ...matching, challengeId: "other-rift" })).toBe(0);
    expect(advanceContractObjectiveProgress(mission, 0, { ...matching, sectorId: "reavers-den" })).toBe(0);
    expect(advanceContractObjectiveProgress(mission, 0, { ...matching, challengeType: "hazard" })).toBe(0);
    expect(advanceContractObjectiveProgress(mission, 0, { ...matching, challengeTags: ["recurring"] })).toBe(0);
    expect(advanceContractObjectiveProgress(mission, 0, matching)).toBe(1);
  });

  it("allows resolution-only tile challenge objectives to count success or failure", () => {
    const mission = { objective: { type: "tileChallengeResolved" as const, challengeId: "rift-whispers-ashen-chapel", target: 2, label: "Witness Rift Whispers" } };
    const trigger = { type: "tile-challenge-resolved" as const, challengeId: "rift-whispers-ashen-chapel", sectorId: "ashen-chapel", challengeType: "anomaly" as const, challengeTags: ["signal"], testStat: "signal" as const, success: false };
    expect(advanceContractObjectiveProgress(mission, 0, trigger)).toBe(1);
    expect(advanceContractObjectiveProgress(mission, 1, { ...trigger, success: true })).toBe(2);
  });
});
