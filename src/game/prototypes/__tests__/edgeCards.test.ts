import { describe, expect, it } from "vitest";
import {
  EDGE_CARD_PROTOTYPE,
  EDGE_PROTOTYPE_RULES,
  EDGE_VALUES,
  getEdgeHandLimit,
  isEdgePlayLegal,
  planEdgeDraw,
  spendEdgeCard,
  validateEdgePrototypeDeck
} from "../edgeCards.js";

describe("WIP Edge Card prototype", () => {
  it("keeps a balanced two-card distribution across values 1 through 6", () => {
    expect(EDGE_CARD_PROTOTYPE).toHaveLength(12);
    expect(validateEdgePrototypeDeck()).toEqual([]);
    expect(new Set(EDGE_CARD_PROTOTYPE.map((card) => card.id)).size).toBe(12);

    for (const value of EDGE_VALUES) {
      expect(EDGE_CARD_PROTOTYPE.filter((card) => card.edgeValue === value)).toHaveLength(2);
    }
  });

  it("balances stronger abilities against weaker committed values", () => {
    expect(
      EDGE_CARD_PROTOTYPE.filter((card) => card.edgeValue <= 2).every(
        (card) => card.abilityBand === "major"
      )
    ).toBe(true);
    expect(
      EDGE_CARD_PROTOTYPE.filter((card) => card.edgeValue >= 5).every(
        (card) => card.abilityBand === "narrow"
      )
    ).toBe(true);
  });

  it("allows value commitment only before an own battle or challenge roll", () => {
    const card = EDGE_CARD_PROTOTYPE[0]!;

    expect(
      isEdgePlayLegal(card, {
        mode: "commit-value",
        timing: "before-own-roll",
        resolutionKind: "battle",
        edgeAlreadyUsed: false
      })
    ).toBe(true);
    expect(
      isEdgePlayLegal(card, {
        mode: "commit-value",
        timing: "before-own-roll",
        resolutionKind: "challenge",
        edgeAlreadyUsed: false
      })
    ).toBe(true);
    expect(
      isEdgePlayLegal(card, {
        mode: "commit-value",
        timing: "after-own-roll",
        resolutionKind: "battle",
        edgeAlreadyUsed: false
      })
    ).toBe(false);
    expect(
      isEdgePlayLegal(card, {
        mode: "commit-value",
        timing: "action",
        resolutionKind: "shop",
        edgeAlreadyUsed: false
      })
    ).toBe(false);
  });

  it("uses exact authored timing for abilities and rejects a second Edge card", () => {
    const cinderlineBreak = EDGE_CARD_PROTOTYPE.find(
      (card) => card.id === "edge-cinderline-break"
    )!;

    expect(
      isEdgePlayLegal(cinderlineBreak, {
        mode: "ability",
        timing: "pending-consequence",
        resolutionKind: "battle",
        edgeAlreadyUsed: false
      })
    ).toBe(true);
    expect(
      isEdgePlayLegal(cinderlineBreak, {
        mode: "ability",
        timing: "before-own-roll",
        resolutionKind: "battle",
        edgeAlreadyUsed: false
      })
    ).toBe(false);
    expect(
      isEdgePlayLegal(cinderlineBreak, {
        mode: "ability",
        timing: "pending-consequence",
        resolutionKind: "battle",
        edgeAlreadyUsed: true
      })
    ).toBe(false);
  });

  it("grows hand capacity through authored progression and caps it at four", () => {
    expect(getEdgeHandLimit({ completedContracts: 0, ownedArtifacts: 0 })).toBe(2);
    expect(getEdgeHandLimit({ completedContracts: 2, ownedArtifacts: 0 })).toBe(3);
    expect(getEdgeHandLimit({ completedContracts: 0, ownedArtifacts: 1 })).toBe(3);
    expect(getEdgeHandLimit({ completedContracts: 2, ownedArtifacts: 1 })).toBe(4);
    expect(getEdgeHandLimit({ completedContracts: 20, ownedArtifacts: 20 })).toBe(
      EDGE_PROTOTYPE_RULES.maximumHandLimit
    );
  });

  it("skips random awards at the hand limit without opening a card choice", () => {
    expect(planEdgeDraw(["edge-a"], "edge-b", 2)).toEqual({
      nextHand: ["edge-a", "edge-b"],
      awarded: true
    });
    expect(planEdgeDraw(["edge-a", "edge-b"], "edge-c", 2)).toEqual({
      nextHand: ["edge-a", "edge-b"],
      awarded: false
    });
  });

  it("moves exactly one owned card to discard and rejects an unowned card", () => {
    expect(spendEdgeCard(["edge-a", "edge-b"], ["edge-used"], "edge-b")).toEqual({
      nextHand: ["edge-a"],
      nextDiscard: ["edge-used", "edge-b"]
    });
    expect(spendEdgeCard(["edge-a"], [], "edge-missing")).toBeNull();
  });
});
