import { describe, expect, it } from "vitest";
import type { PublicPatchPayload } from "../../shared/types.js";
import { getMovementArrivalModel } from "../hostMovementPresentation.js";

function payload(sectorId: string, planner = false): PublicPatchPayload {
  return {
    seats: [{
      seatId: "seat-1",
      characterId: "char_bjornis",
      displayName: "Nera",
      connected: true,
      ready: true,
      kicked: false
    }],
    players: [{
      seatId: "seat-1",
      sectorId,
      character: { id: "char_bjornis", name: "Bjornis" }
    }],
    movementPlanner: planner ? {
      active: true,
      movementValue: 2,
      currentSectorId: "ashwake-crossing",
      currentSectorName: "Ashwake Crossing",
      selectedDestinationId: "ashen-chapel",
      destinations: [{
        sectorId: "ashen-chapel",
        name: "Ashen Chapel",
        ring: "middle",
        distance: 2,
        route: ["ashwake-crossing", "middle_guardian_span", "ashen-chapel"],
        routeNames: ["Ashwake Crossing", "Guardian Span", "Ashen Chapel"],
        tags: [],
        threatIcons: [],
        ruleText: "Resolve the public arrival.",
        faceUpThreats: [],
        occupants: [],
        strategicTags: []
      }]
    } : null
  } as PublicPatchPayload;
}

describe("host movement presentation", () => {
  it("starts only when an authoritative sector change matches a prior planner destination", () => {
    const movement = getMovementArrivalModel(payload("ashen-chapel"), payload("ashwake-crossing", true), 12);
    expect(movement).toMatchObject({
      movingSeatId: "seat-1",
      originName: "Ashwake Crossing",
      operativeName: "Bjornis",
      destination: { sectorId: "ashen-chapel" }
    });
    expect(movement?.destination.route).toEqual(["ashwake-crossing", "middle_guardian_span", "ashen-chapel"]);
  });

  it("does not invent movement without a prior server planner or matching destination", () => {
    expect(getMovementArrivalModel(payload("ashen-chapel"), payload("ashwake-crossing"), 12)).toBeNull();
    expect(getMovementArrivalModel(payload("deadwater-marsh"), payload("ashwake-crossing", true), 12)).toBeNull();
  });
});
