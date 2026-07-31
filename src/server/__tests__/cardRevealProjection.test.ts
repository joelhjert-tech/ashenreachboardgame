import { describe, expect, it } from "vitest";
import type { PhonePatchPayload, PublicPatchPayload } from "../../client/shared/types.js";
import { loadAfflictionCards } from "../../game/content/afflictions.js";
import { loadGear } from "../../game/content/gear.js";
import { loadFollowers } from "../../game/content/followers.js";
import { loadScarCards } from "../../game/content/scars.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function activeState() {
  const state = createInitialSessionState("card-reveal-projection", "single-player");
  state.status = "active";
  state.phase = "resolution";
  return state;
}

describe("card reveal projection privacy", () => {
  it("projects Anomaly, Artifact, and Escalation draws to the public TV", () => {
    for (const category of ["anomaly", "artifact", "escalation"] as const) {
      const state = activeState();
      const seatId = state.turnOrder[0]!;
      state.activeResolution = {
        id: `resolution:${category}`,
        playerId: seatId,
        source: category,
        stage: "outcome_summary",
        card: { id: `${category}-fixture`, title: `${category} fixture`, type: category, flavor: "Public fixture text." },
        origin: {
          sourceDeck: category,
          sourceSectorId: state.players[0]!.character.currentSpaceId,
          sourceEventId: `event:${category}`,
          queuePosition: 0,
          privacy: "public"
        },
        outcome: { title: "Resolved", text: "Public resolution.", effects: [] }
      };

      const tv = createTvProjection(state) as unknown as PublicPatchPayload;
      expect(tv.publicCardReveal).toMatchObject({ category, visibility: "public", title: `${category} fixture` });
    }
  });

  it("keeps a Contract identity off the TV and reveals it only to its owner", () => {
    const state = activeState();
    const seatId = state.turnOrder[0]!;
    state.activeResolution = {
      id: "resolution:private-contract",
      playerId: seatId,
      source: "contract",
      stage: "outcome_summary",
      card: { id: "quiet-relay", title: "The Quiet Relay", type: "contract", flavor: "Owner-only route text." },
      origin: {
        sourceDeck: "contract",
        sourceSectorId: state.players[0]!.character.currentSpaceId,
        sourceEventId: "event:private-contract",
        queuePosition: 0,
        privacy: "owner"
      },
      outcome: { title: "Private lead", text: "Reach the silent mast.", effects: [] }
    };

    const tv = createTvProjection(state) as unknown as PublicPatchPayload;
    const owner = createPhoneProjection(state, seatId) as unknown as PhonePatchPayload;
    const observer = createPhoneProjection(state, "seat-observer") as unknown as PhonePatchPayload;
    expect(tv.publicCardReveal).toBeNull();
    expect(JSON.stringify(tv)).not.toContain("The Quiet Relay");
    expect(owner.privateCardReveal).toMatchObject({ category: "contract", title: "The Quiet Relay", visibility: "owner" });
    expect(observer.privateCardReveal).toBeNull();
  });

  it("projects an Affliction card and its server die only to the affected phone", () => {
    const state = activeState();
    const seatId = state.turnOrder[0]!;
    state.activeResolution = null;
    state.phase = "action";
    const affliction = [...loadAfflictionCards().values()][0]!;
    state.eventLog.push({
      type: "AFFLICTION_DRAWN",
      seatId,
      afflictionId: affliction.id,
      affliction,
      die: 4,
      publicSummary: "An operative received an Affliction.",
      privateSummary: `${affliction.name} was drawn.`,
      createdAt: "2026-07-31T10:00:00.000Z"
    });

    const tv = createTvProjection(state) as unknown as PublicPatchPayload;
    const owner = createPhoneProjection(state, seatId) as unknown as PhonePatchPayload;
    expect(tv.publicCardReveal).toBeNull();
    expect(JSON.stringify(tv)).not.toContain(affliction.name);
    expect(owner.privateCardReveal).toMatchObject({ category: "affliction", title: affliction.name, die: 4 });
    expect(owner.playerResultDeltas?.some((delta) => delta.type === "afflictionDrawn" && delta.visibility === "ownerPrivate")).toBe(true);
  });

  it("keeps the selected Scar card on the affected phone", () => {
    const state = activeState();
    const seatId = state.turnOrder[0]!;
    state.activeResolution = null;
    state.phase = "action";
    const scar = [...loadScarCards().values()][0]!;
    state.eventLog.push({
      type: "SCAR_SELECTED",
      seatId,
      selectionId: "scar-choice:fixture",
      sourceEventId: "scar-source:fixture",
      scarId: scar.id,
      rejectedScarId: "scar-rejected-fixture",
      createdAt: "2026-07-31T10:00:30.000Z"
    });

    const tv = createTvProjection(state) as unknown as PublicPatchPayload;
    const owner = createPhoneProjection(state, seatId) as unknown as PhonePatchPayload;
    expect(tv.publicCardReveal).toBeNull();
    expect(JSON.stringify(tv)).not.toContain(scar.title);
    expect(owner.privateCardReveal).toMatchObject({ category: "scar", title: scar.title, visibility: "owner" });
  });

  it("reveals acquired Equipment publicly and on the receiving phone", () => {
    const state = activeState();
    const seatId = state.turnOrder[0]!;
    state.activeResolution = null;
    state.phase = "action";
    const gearCatalog = [...loadGear().values()];
    const gear = gearCatalog.find((item) => item.tier !== "starter") ?? gearCatalog[0]!;
    state.eventLog.push({
      type: "SHOP_PURCHASE_RESOLVED",
      seatId,
      serviceId: "fixture-service",
      shopName: "Fixture Forge",
      sectorId: state.players[0]!.character.currentSpaceId,
      cardId: gear.id,
      cost: { salvage: 1 },
      gainedGear: gear,
      discardedStockIds: [],
      summary: `${gear.name} acquired.`,
      createdAt: "2026-07-31T10:01:00.000Z"
    });

    const tv = createTvProjection(state) as unknown as PublicPatchPayload;
    const owner = createPhoneProjection(state, seatId) as unknown as PhonePatchPayload;
    expect(tv.publicCardReveal).toMatchObject({ kind: "reward", category: "equipment", title: gear.name, visibility: "public" });
    expect(owner.privateCardReveal).toMatchObject({ kind: "reward", category: "equipment", title: gear.name, visibility: "owner" });
  });

  it("reveals a recruited Follower publicly and on the receiving phone", () => {
    const state = activeState();
    const seatId = state.turnOrder[0]!;
    state.activeResolution = null;
    state.phase = "action";
    const follower = [...loadFollowers().values()][0]!;
    state.eventLog.push({
      type: "SHOP_FOLLOWER_PURCHASE_RESOLVED",
      seatId,
      serviceId: "buy-route-aids",
      shopName: "Fixture Relay",
      sectorId: state.players[0]!.character.currentSpaceId,
      cardId: follower.id,
      cost: { salvage: 1 },
      gainedFollower: follower,
      discardedStockIds: [],
      summary: `${follower.name} recruited.`,
      createdAt: "2026-07-31T10:02:00.000Z"
    });

    const tv = createTvProjection(state) as unknown as PublicPatchPayload;
    const owner = createPhoneProjection(state, seatId) as unknown as PhonePatchPayload;
    expect(tv.publicCardReveal).toMatchObject({ kind: "reward", category: "follower", title: follower.name, visibility: "public" });
    expect(owner.privateCardReveal).toMatchObject({ kind: "reward", category: "follower", title: follower.name, visibility: "owner" });
  });
});
