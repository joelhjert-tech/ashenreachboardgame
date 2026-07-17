import { describe, expect, it } from "vitest";
import { loadArtifactCards } from "../../content/artifacts.js";
import { loadFollowers } from "../../content/followers.js";
import { BOARD_TEXT_EFFECTS } from "../../data/boardTextEffects.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
import { FOLLOWER_ACQUISITION_SOURCES, QA_FOLLOWER_IDS } from "../../data/followerAcquisition.js";
import { createSequenceRandomSource } from "../dice.js";
import { reduceGameState } from "../reducer.js";
import { GameRoomServer, createPhoneProjection, createTvProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import type { EncounterEffect } from "../../schema/card.schema.js";

function grants(effect: EncounterEffect | null | undefined, followerId: string): boolean {
  if (!effect) return false;
  if (effect.type === "gain_follower") return effect.followerId === followerId;
  return effect.type === "sequence" && effect.effects.some((entry) => grants(entry, followerId));
}

describe("completed follower acquisition boundary", () => {
  it("classifies the 24 definitions as 21 normal followers and three QA-only fixtures", () => {
    const followers = loadFollowers();
    expect(followers.size).toBe(24);
    expect([...followers.values()].filter((follower) => !follower.qaOnly)).toHaveLength(21);
    expect([...followers.values()].filter((follower) => follower.qaOnly).map((follower) => follower.id).sort()).toEqual([...QA_FOLLOWER_IDS].sort());
  });

  it("gives every normal follower an explicit ability and a normal-game source", () => {
    for (const follower of loadFollowers().values()) {
      if (follower.qaOnly) continue;
      expect(FOLLOWER_ACQUISITION_SOURCES.some((source) => source.followerId === follower.id), follower.id).toBe(true);
      expect(Boolean(follower.activeEffect || follower.passiveEffect), follower.id).toBe(true);
    }
  });

  it("keeps every fixed board source wired to its stable follower ID", () => {
    for (const source of FOLLOWER_ACQUISITION_SOURCES.filter((entry) => entry.sourceType === "board")) {
      const [effectKey, choiceId] = source.sourceId.split(":");
      const definition = BOARD_TEXT_EFFECTS[effectKey!];
      const effects = choiceId ? [definition?.choices?.find((choice) => choice.id === choiceId)?.effect] : [definition?.effect, ...(definition?.choices ?? []).map((choice) => choice.effect)];
      expect(effects.some((effect) => grants(effect, source.followerId)), source.sourceId).toBe(true);
    }
  });

  it("places all six companion artifacts in reachable canonical decks", () => {
    const sectors = createCanonicalSectorGraph();
    const artifacts = loadArtifactCards();
    for (const source of FOLLOWER_ACQUISITION_SOURCES.filter((entry) => entry.mode === "random-artifact")) {
      expect(artifacts.has(source.sourceId), source.sourceId).toBe(true);
      expect(sectors.some((sector) => sector.encounterDecks.artifact.includes(source.sourceId)), source.sourceId).toBe(true);
    }
  });

  it("uses the server random source and records the exact random companion once", () => {
    const state = createInitialSessionState("follower-random", "single-player");
    const player = state.players[0]!;
    state.status = "active";
    state.phase = "resolution";
    state.sectors = state.sectors.map((sector) => sector.id === player.sectorId ? {
      ...sector,
      encounterDecks: { ...sector.encounterDecks, artifact: ["artifact-yard", "artifact-lucy-hell-puppy"] }
    } : sector);
    const server = new GameRoomServer(state, [], createSequenceRandomSource([1]));
    const effect = (server as unknown as { resolveEffect(effect: { type: "draw_artifact" }, seatId: string): EncounterEffect }).resolveEffect({ type: "draw_artifact" }, player.seatId);
    const result = reduceGameState({ ...state, pendingEffect: effect }, {
      type: "RESOLUTION_APPLIED", seatId: player.seatId, effect, sourceCardId: "follower-random-source", success: true, createdAt: "2026-07-17T00:00:00.000Z"
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[0]?.character.followers?.map((follower) => follower.id)).toContain("lucy-hell-puppy");
    expect(result.state.sectors.find((sector) => sector.id === player.sectorId)?.encounterDecks.artifact).not.toContain("artifact-lucy-hell-puppy");
  });

  it("normalizes an unavailable unique reward to an inert note rather than duplicating it", () => {
    const state = createInitialSessionState("follower-duplicate", "single-player");
    const player = state.players[0]!;
    const lucy = loadFollowers().get("lucy-hell-puppy")!;
    player.character.followers = [{ ...lucy, instanceId: "lucy:existing" }];
    const server = new GameRoomServer(state);
    const effect = (server as unknown as { resolveEffect(effect: { type: "gain_follower"; followerId: string }, seatId: string): EncounterEffect }).resolveEffect({ type: "gain_follower", followerId: lucy.id }, player.seatId);
    expect(effect).toEqual({ type: "gain_note", text: "Lucy, Hell Puppy is already committed and no additional follower is gained." });
  });

  it("keeps full follower rules owner-private while projecting public follower identity to TV", () => {
    const state = createInitialSessionState("follower-projection", "single-player");
    state.status = "active";
    state.seats[0]!.displayName = "Player One";
    const player = state.players[0]!;
    const broker = loadFollowers().get("black-lantern-broker")!;
    player.character.followers = [{ ...broker, instanceId: "broker:one" }];
    const phone = createPhoneProjection(state, player.seatId, true) as { self?: { character?: { followers?: Array<{ text?: string }> } } };
    const tv = createTvProjection(state);
    expect(phone.self?.character?.followers?.[0]?.text).toContain("contract lead");
    expect(JSON.stringify(tv)).toContain("Black Lantern Broker");
    expect(JSON.stringify(tv)).not.toContain("contract lead or rivalry bargain is banked");
  });
});
