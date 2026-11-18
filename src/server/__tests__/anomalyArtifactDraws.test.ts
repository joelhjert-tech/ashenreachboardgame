import { describe, expect, it } from "vitest";
import { loadAnomalyCards } from "../../game/content/anomalies.js";
import { loadFollowers } from "../../game/content/followers.js";
import { BOARD_SPACES } from "../../game/data/boardSpaces.js";
import { BOARD_TEXT_EFFECTS } from "../../game/data/boardTextEffects.js";
import { createCanonicalSectorGraph } from "../../game/data/canonicalSectorGraph.js";
import { createSequenceRandomSource } from "../../game/engine/dice.js";
import { GameRoomServer } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function searchCache(die: number, artifactIds: string[], lucyOwned = false, scenarioId?: string) {
  const state = createInitialSessionState("artifact-search", "single-player", scenarioId);
  state.status = "active";
  state.phase = "action";
  const player = state.players[0]!;
  const sector = state.sectors.find((sector) => sector.id === "hollow-veil-yard")!;
  player.sectorId = sector.id;
  player.character.currentSpaceId = sector.id;
  player.character.stats.forge = 1;
  player.character.heldGear = [];
  player.character.equippedGear = { weapon: null, armor: null, utility: null };
  player.character.followers = lucyOwned ? [loadFollowers().get("lucy-hell-puppy")!] : [];
  sector.encounterDecks.artifact = [...artifactIds];
  sector.encounterDecks.threat = [];
  const server = new GameRoomServer(state, [], createSequenceRandomSource([0, die, die]));
  server.resolveSpaceTextIntent({ type: "RESOLVE_SPACE_TEXT", seatId: player.seatId });
  const after = server.getState();
  return {
    character: after.players[0]!.character,
    progress: after.scenarioProgress,
    remaining: after.sectors.find((entry) => entry.id === sector.id)!.encounterDecks.artifact,
    outcome: after.eventLog.find((e) => (e as { type: string }).type === "SPACE_TEXT_RESOLVED")
  };
}

describe("sector anomalies and artifacts", () => {
  it("feeds the Mirror for each artifact-tier item recovered, including the yard's fixed Coffin Rig", () => {
    const ordinaryKit = searchCache(5, ["artifact-cinder-suture-kit"], false, "scenario_mirror_of_false_heroes");
    const artifactCore = searchCache(5, ["artifact-yard"], false, "scenario_mirror_of_false_heroes");
    expect(ordinaryKit.progress.mirrorPressure).toBe(1);
    expect(artifactCore.progress.mirrorPressure).toBe(2);
  });

  it("makes every authored anomaly drawable at a sector that resolves anomaly cards", () => {
    const sectors = createCanonicalSectorGraph();
    const available = new Set(BOARD_SPACES.filter((space) =>
      BOARD_TEXT_EFFECTS[space.textBox.effectKey]?.sectorDeck?.kind === "anomaly"
    ).flatMap((space) => sectors.find((sector) => sector.id === space.id)!.encounterDecks.anomaly));
    expect([...available].sort()).toEqual([...loadAnomalyCards().keys()].sort());
  });

  it("applies a failed search and leaves the artifact in the cache", () => {
    const result = searchCache(0, ["artifact-yard"]);
    expect(result.outcome).toMatchObject({ success: false });
    expect(result.character.wounds).toBeGreaterThan(0);
    expect(result.character.heldGear.map((gear) => gear.id)).not.toContain("artifact-yard");
    expect(result.remaining).toEqual(["artifact-yard"]);
  });

  it.each([
    ["black-relay-spire", "anomaly-cinder-gate-echo", "salvage", "gateEchoesPinned"],
    ["ashen-chapel", "anomaly-throne-shadow-jury", "trophies", "throneVerdicts"]
  ] as const)("resolves the anomaly at %s and grants its reward once", (spaceId, cardId, resource, counter) => {
    const state = createInitialSessionState(cardId, "single-player");
    state.status = "active";
    state.phase = "action";
    const player = state.players[0]!;
    player.sectorId = player.character.currentSpaceId = spaceId;
    const before = player.character[resource] ?? 0;
    const sector = state.sectors.find((entry) => entry.id === spaceId)!;
    expect(sector.encounterDecks.anomaly).toContain(cardId);
    sector.encounterDecks.anomaly = [cardId];
    sector.encounterDecks.threat = [];
    const server = new GameRoomServer(state, [], createSequenceRandomSource([0, 5, 5]));
    server.resolveSpaceTextIntent({ type: "RESOLVE_SPACE_TEXT", seatId: player.seatId });
    const after = server.getState();
    expect(after.players[0]!.character[resource]).toBe(before + 1);
    expect(after.scenarioProgress[counter]).toBe(1);
    expect(after.sectors.find((entry) => entry.id === spaceId)!.encounterDecks.anomaly).toEqual([]);
  });

  it("draws an eligible relic and preserves an unavailable unique companion", () => {
    const result = searchCache(5, ["artifact-lucy-hell-puppy", "artifact-yard"], true);
    expect(result.outcome).toMatchObject({ success: true, revealedCard: { id: "artifact-yard" } });
    expect(result.character.heldGear.map((gear) => gear.id)).toContain("artifact-yard");
    expect(result.remaining).toEqual(["artifact-lucy-hell-puppy"]);
  });
});
