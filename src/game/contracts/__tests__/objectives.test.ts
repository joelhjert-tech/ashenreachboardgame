import { describe, expect, it } from "vitest";
import {
  advanceContractObjectiveProgress,
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
});
