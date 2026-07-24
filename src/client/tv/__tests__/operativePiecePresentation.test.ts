import { describe, expect, it } from "vitest";
import type { PublicPlayer, PublicSeat } from "../../shared/types.js";
import {
  buildOperativePieceIdentities,
  getFormationPoints,
  getPlayerInitials,
  getPublicOccupantSummary
} from "../operativePiecePresentation.js";

function makeSeats(count: number): PublicSeat[] {
  return Array.from({ length: count }, (_, index) => ({
    seatId: `seat-${index + 1}`,
    characterId: `operative-${index + 1}`,
    displayName: index === 0 ? "Nera Vale" : `Player ${index + 1}`,
    connected: true,
    ready: true,
    kicked: false
  }));
}

function makePlayers(count: number): PublicPlayer[] {
  return Array.from({ length: count }, (_, index) => ({
    seatId: `seat-${index + 1}`,
    sectorId: "ashen-chapel",
    character: {
      id: `operative-${index + 1}`,
      name: `Operative ${index + 1}`
    }
  })) as PublicPlayer[];
}

describe("operative piece presentation", () => {
  it("assigns stable color, symbol, initials, and topper without exposing internal IDs", () => {
    const identities = buildOperativePieceIdentities(makeSeats(6), makePlayers(6));

    expect(identities).toHaveLength(6);
    expect(new Set(identities.map((entry) => entry.color)).size).toBe(6);
    expect(new Set(identities.map((entry) => entry.heraldry)).size).toBe(6);
    expect(identities[0]).toMatchObject({
      playerName: "Nera Vale",
      operativeName: "Operative 1",
      initials: "NV"
    });
    expect(getPublicOccupantSummary(identities)).not.toContain("seat-");
  });

  it("keeps initials deterministic for short and long names", () => {
    expect(getPlayerInitials("Nera")).toBe("NE");
    expect(getPlayerInitials("Nera Vale")).toBe("NV");
    expect(getPlayerInitials(" Alexandria-of-the-Last-Relay ")).toBe("AL");
  });

  it.each([1, 2, 3, 4, 5, 6])("creates a non-overlapping deterministic %i-piece formation", (count) => {
    const first = getFormationPoints(count, 0);
    const second = getFormationPoints(count, 0);
    expect(first).toEqual(second);
    expect(first).toHaveLength(count);
    expect(new Set(first.map((point) => `${point.x}:${point.y}`)).size).toBe(count);
    if (count > 1) {
      expect(first[0]!.zIndex).toBeGreaterThan(first.at(-1)!.zIndex);
    }
  });
});
