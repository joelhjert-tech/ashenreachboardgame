import { describe, expect, it } from "vitest";
import { loadCharacters } from "../../content/characters.js";
import { loadContracts } from "../../content/contracts.js";
import { loadFollowers } from "../../content/followers.js";
import { loadGear } from "../../content/gear.js";
import { applyStartingLoadout } from "../../rules/startingLoadout.js";
import { getCompanionStatBonus } from "../gear.js";

describe("character roster content", () => {
  it("loads sixteen playable characters with the expected stat budget", () => {
    const characters = [...loadCharacters().values()].filter((character) => !character.qaOnly);

    expect(characters).toHaveLength(16);

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

  it("includes Popelord as a playable Mire Sovereign", () => {
    const popelord = loadCharacters().get("char_popelord");

    expect(popelord?.name).toBe("Popelord");
    expect(popelord?.archetype).toBe("Mire Sovereign");
    expect(popelord?.currentSpaceId).toBe("mirecoil-beacon");
  });

  it("includes Deepdale as a playable Deep Route Delver", () => {
    const deepdale = loadCharacters().get("char_deepdale");

    expect(deepdale?.name).toBe("Deepdale");
    expect(deepdale?.archetype).toBe("Deep Route Delver");
    expect(deepdale?.currentSpaceId).toBe("mirecoil-beacon");
    expect(deepdale?.stats).toEqual({
      command: 1,
      grit: 2,
      signal: 2,
      guile: 1,
      forge: 3
    });
  });

  it("includes Bjornis as a playable Firebreak Conqueror", () => {
    const bjornis = loadCharacters().get("char_bjornis");

    expect(bjornis?.name).toBe("Bjornis");
    expect(bjornis?.archetype).toBe("Firebreak Conqueror");
    expect(bjornis?.currentSpaceId).toBe("cinder-fields");
    expect(bjornis?.stats).toEqual({
      command: 1,
      grit: 3,
      signal: 1,
      guile: 1,
      forge: 3
    });
  });

  it("includes Rumi as a playable Violet Riftblade", () => {
    const rumi = loadCharacters().get("char_rumi");

    expect(rumi?.name).toBe("Rumi");
    expect(rumi?.archetype).toBe("Violet Riftblade");
    expect(rumi?.currentSpaceId).toBe("glassmere-spindle");
    expect(rumi?.stats).toEqual({
      command: 1,
      grit: 2,
      signal: 3,
      guile: 2,
      forge: 1
    });
  });

  it("grants Rumi Mira and Zoey team-bond companion stats", () => {
    const rumi = loadCharacters().get("char_rumi");
    const deepdale = loadCharacters().get("char_deepdale");
    const mira = loadFollowers().get("mira-rift-twin");
    const zoey = loadFollowers().get("zoey-thorn-violet");

    expect(rumi).toBeDefined();
    expect(deepdale).toBeDefined();
    expect(mira).toBeDefined();
    expect(zoey).toBeDefined();

    const rumiWithMira = {
      ...rumi!,
      followers: [mira!]
    };
    const rumiWithMiraAndZoey = {
      ...rumi!,
      followers: [mira!, zoey!]
    };
    const rumiWithZoeyOnly = {
      ...rumi!,
      followers: [zoey!]
    };
    const deepdaleWithMira = {
      ...deepdale!,
      followers: [mira!]
    };

    expect(getCompanionStatBonus(rumiWithMira, "signal")).toBe(1);
    expect(getCompanionStatBonus(rumiWithMira, "guile")).toBe(1);
    expect(getCompanionStatBonus(rumiWithMira, "grit")).toBe(0);
    expect(getCompanionStatBonus(rumiWithMiraAndZoey, "grit")).toBe(1);
    expect(getCompanionStatBonus(rumiWithMiraAndZoey, "signal")).toBe(2);
    expect(getCompanionStatBonus(rumiWithMiraAndZoey, "guile")).toBe(2);
    expect(getCompanionStatBonus(rumiWithZoeyOnly, "signal")).toBe(0);
    expect(getCompanionStatBonus(deepdaleWithMira, "signal")).toBe(0);
  });

  it("keeps MASTER ALPHA as a QA-only max-loadout operative", () => {
    const masterAlpha = loadCharacters().get("char_master_alpha");

    expect(masterAlpha?.qaOnly).toBe(true);
    expect(masterAlpha?.name).toBe("MASTER ALPHA");
    expect(masterAlpha?.archetype).toContain("QA ONLY");
    expect(masterAlpha?.stats).toEqual({
      command: 9,
      grit: 9,
      signal: 9,
      guile: 9,
      forge: 9
    });
    expect(masterAlpha?.startingSalvage).toBe(99);
    expect(masterAlpha?.trophies).toBe(99);

    const loaded = applyStartingLoadout(masterAlpha!, {
      sessionMode: "single-player",
      seatIndex: 0,
      catalogs: {
        contracts: [...loadContracts().values()],
        gear: loadGear(),
        followers: loadFollowers()
      }
    });

    expect(loaded.salvage).toBe(99);
    expect(loaded.heldGear.map((item) => item.id)).toEqual([
      "qa_alpha_weapon_01",
      "qa_alpha_weapon_02",
      "qa_alpha_armor_01",
      "qa_alpha_relic_01",
      "qa_alpha_relic_02",
      "qa_alpha_tool_01",
      "qa_alpha_consumable_01",
      "qa_alpha_consumable_02"
    ]);
    expect(loaded.followers?.map((follower) => follower.id)).toEqual([
      "qa_alpha_follower_01",
      "qa_alpha_follower_02",
      "qa_alpha_follower_03"
    ]);
    expect(loaded.equippedGear).toEqual({
      weapon: "qa_alpha_weapon_01",
      armor: "qa_alpha_armor_01",
      utility: "qa_alpha_tool_01"
    });
  });
});
