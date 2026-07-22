import { describe, expect, it } from "vitest";
import {
  canNamedPlayerSelectCharacter,
  normalizePlayerRuleName,
  resolveNamedPlayerRules
} from "../namedPlayerRules.js";

describe("named player rules", () => {
  it.each([
    ["CW", "cw"], [" cw ", "cw"], ["Cw", "cw"], ["ＫＥＢＡＢ", "kebab"], [undefined, ""]
  ])("normalizes %s deterministically", (input, expected) => {
    expect(normalizePlayerRuleName(input)).toBe(expected);
  });

  it("uses exact matches instead of substrings", () => {
    for (const displayName of ["cwmaster", "joel2", "annette-test", "kebab king"]) {
      const profile = resolveNamedPlayerRules({ displayName });
      expect(profile.enemyDifficultyModifier).toBe(0);
      expect(profile.forcedCharacterId).toBeNull();
      expect(profile.allowedRestrictedCharacterIds).toEqual([]);
      expect(profile.requiredFollowerIds).toEqual([]);
    }
  });

  it("combines independent name and nickname matches once", () => {
    expect(resolveNamedPlayerRules({ displayName: "Annette", nickname: "CW" })).toMatchObject({
      enemyDifficultyModifier: 1,
      requiredFollowerIds: ["fandiablos"]
    });
    expect(resolveNamedPlayerRules({ displayName: "Nenne", nickname: "nenne" }).requiredFollowerIds).toEqual(["fandiablos"]);
  });

  it("isolates QA and forced-character eligibility", () => {
    expect(canNamedPlayerSelectCharacter({ displayName: "Joel" }, { id: "char_master_alpha", qaOnly: true }).allowed).toBe(true);
    expect(canNamedPlayerSelectCharacter({ displayName: "Joel2" }, { id: "char_master_alpha", qaOnly: true }).allowed).toBe(false);
    expect(canNamedPlayerSelectCharacter({ displayName: "Kebab" }, { id: "char_deepdale" }).reason).toMatch(/Popelord is required/i);
  });
});
