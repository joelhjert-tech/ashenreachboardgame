import { describe, expect, it } from "vitest";
import { loadThreatCards } from "../../content/threats.js";
import { BOARD_SPACES } from "../../data/boardSpaces.js";

describe("Mission reward sources", () => {
  it("marks one active enemy in every Threat lane as a Mission reward source", () => {
    const threats = loadThreatCards();
    const sources = [
      ["red-maw-raiders", "red"],
      ["ash-choir-crusader", "blue"],
      ["pale-contract-collector", "yellow"]
    ] as const;

    for (const [cardId, lane] of sources) {
      expect(threats.get(cardId)).toMatchObject({
        id: cardId,
        threatLane: lane,
        cardType: "enemy",
        missionReward: true
      });
    }
  });

  it("keeps the two authored transit tiles as successful Mission reward locations", () => {
    const rewardTiles = ["mirecoil-beacon", "transit-gate"];

    expect(
      rewardTiles.map((sectorId) => {
        const space = BOARD_SPACES.find((entry) => entry.id === sectorId);
        return {
          sectorId,
          name: space?.name,
          effectKey: space?.textBox?.effectKey
        };
      })
    ).toEqual([
      {
        sectorId: "mirecoil-beacon",
        name: "Rusted Transit Gate",
        effectKey: "outer_mirecoilTraffic"
      },
      {
        sectorId: "transit-gate",
        name: "Transit Gate",
        effectKey: "outer_mirecoilTraffic"
      }
    ]);
  });
});
