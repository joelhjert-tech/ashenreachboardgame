import { describe, expect, it } from "vitest";
import { adminLibraryCards, buildAdminLibraryCards } from "../adminLibraryRegistry.js";

describe("admin library registry", () => {
  it("normalizes every canonical active card-like content record", () => {
    expect(adminLibraryCards).toHaveLength(417);
    expect(new Set(adminLibraryCards.map((card) => card.cardType))).toEqual(new Set([
      "affliction",
      "anomaly",
      "artifact",
      "contract",
      "escalation",
      "follower",
      "gear",
      "nemesis",
      "operative",
      "scar",
      "scenario",
      "threat",
      "tile challenge"
    ]));
    expect(adminLibraryCards.every((card) => /^(?:content|src\/game\/data)\//.test(card.dataSourcePath))).toBe(true);
    expect(adminLibraryCards.filter((card) => card.metadataWarnings.some((warning) => /duplicate card id/i.test(warning))).length).toBeGreaterThan(0);
  });

  it("uses canonical runtime artwork paths and preserves repository-relative source paths", () => {
    const threat = adminLibraryCards.find((card) => card.id === "ash-choir-crusader");
    expect(threat).toMatchObject({
      artworkUrl: "/assets/cards/threats/blue/ash-choir-crusader.png",
      artworkPath: "public/assets/cards/threats/blue/ash-choir-crusader.png",
      dataSourcePath: "content/cards/threats/ash-choir-crusader.json"
    });
  });

  it("reports missing artwork and duplicate IDs without crashing normalization", () => {
    const cards = buildAdminLibraryCards([
      { sourcePath: "content/followers/one.json", value: { id: "duplicate", name: "One", text: "Rule one" } },
      { sourcePath: "content/followers/two.json", value: { id: "duplicate", name: "Two", text: "Rule two" } }
    ], []);
    expect(cards).toHaveLength(2);
    expect(cards[0]?.metadataWarnings).toEqual(expect.arrayContaining([
      expect.stringMatching(/missing artwork/i),
      expect.stringMatching(/duplicate card id/i)
    ]));
  });
});
