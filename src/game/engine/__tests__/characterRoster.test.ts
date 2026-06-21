import { describe, expect, it } from "vitest";
import { loadCharacters } from "../../content/characters.js";

describe("character roster content", () => {
  it("loads ten playable characters with the expected stat budget", () => {
    const characters = [...loadCharacters().values()];

    expect(characters).toHaveLength(10);

    for (const character of characters) {
      const totalStats = Object.values(character.stats).reduce((total, value) => total + value, 0);

      expect(totalStats).toBe(9);
      expect(character.heat).toBe(0);
      expect(character.wounds).toBe(0);
      expect(character.status).toBe("active");
      expect(character.activeContract).toBeNull();
      expect(character.heldGear).toEqual([]);
      expect(character.equippedGear).toEqual({
        weapon: null,
        armor: null,
        utility: null
      });
    }
  });

  it("preserves Lane and Mira in the roster without duplicates", () => {
    const names = [...loadCharacters().values()].map((character) => character.name);

    expect(names.filter((name) => name === "Lane")).toHaveLength(1);
    expect(names.filter((name) => name === "Mira")).toHaveLength(1);
  });
});
