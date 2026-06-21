import { describe, expect, it } from "vitest";
import { createSeededRandomSource, rollDice } from "../dice.js";

describe("rollDice", () => {
  it("exposes two bounded d6 faces whose sum matches the total", () => {
    const random = createSeededRandomSource(42);

    for (let index = 0; index < 20; index += 1) {
      const roll = rollDice(2, 6, random);

      expect(roll.faces).toHaveLength(2);
      expect(roll.faces[0]).toBeGreaterThanOrEqual(1);
      expect(roll.faces[0]).toBeLessThanOrEqual(6);
      expect(roll.faces[1]).toBeGreaterThanOrEqual(1);
      expect(roll.faces[1]).toBeLessThanOrEqual(6);
      expect(roll.faces[0]! + roll.faces[1]!).toBe(roll.total);
    }
  });
});
