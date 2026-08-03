import { describe, expect, it } from "vitest";
import {
  getStatUpgradeCost,
  getStatUpgradeDisabledReason,
  NORMAL_STAT_UPGRADE_CAP
} from "../statUpgrades.js";

describe("stat upgrades", () => {
  it("allows a funded permanent upgrade from rank 9 to rank 10", () => {
    expect(NORMAL_STAT_UPGRADE_CAP).toBe(10);
    expect(getStatUpgradeCost(9)).toBe(10);
    expect(getStatUpgradeDisabledReason({
      stat: "command",
      currentValue: 9,
      trophies: 10
    })).toBeNull();
  });

  it("rejects permanent upgrades at rank 10", () => {
    expect(getStatUpgradeDisabledReason({
      stat: "command",
      currentValue: 10,
      trophies: 100
    })).toMatch(/already at the maximum rank/i);
  });
});
