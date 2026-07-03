import { describe, expect, it } from "vitest";
import { loadCharacters } from "../../content/characters.js";
import { getCharacterPresentation } from "../../data/characterPresentation.js";

describe("character role and complexity presentation", () => {
  it("provides role and complexity metadata for every normal operative", () => {
    const normalCharacters = [...loadCharacters().values()].filter((character) => !character.qaOnly);

    expect(normalCharacters.length).toBeGreaterThan(0);

    for (const character of normalCharacters) {
      const presentation = getCharacterPresentation(character.id);

      expect(presentation, `${character.id} should have presentation metadata`).not.toBeNull();
      expect(presentation?.role).toMatch(/\S/);
      expect(["beginner", "standard", "advanced", "expert"]).toContain(presentation?.complexity);
      expect(presentation?.playstyleSummary).toMatch(/\S/);
      expect(presentation?.strengths.length).toBeGreaterThan(0);
      expect(presentation?.weaknesses.length).toBeGreaterThan(0);
      expect(presentation?.usefulStats.length).toBeGreaterThan(0);
      expect(presentation?.signatureItemSummary).toMatch(/\S/);
      expect(presentation?.startingContractSummary).toMatch(/\S/);
    }
  });

  it("marks at least one normal operative as first-game friendly and keeps MASTER ALPHA out", () => {
    const normalCharacters = [...loadCharacters().values()].filter((character) => !character.qaOnly);
    const recommended = normalCharacters.filter((character) => getCharacterPresentation(character.id)?.recommendedForFirstGame);

    expect(recommended.length).toBeGreaterThan(0);
    expect(getCharacterPresentation("char_master_alpha")).toBeNull();
  });
});
