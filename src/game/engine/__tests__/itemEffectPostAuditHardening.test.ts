import { describe, expect, it } from "vitest";
import { GameRoomServer, createPhoneProjection } from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import { loadArtifactCards } from "../../content/artifacts.js";
import { loadFollowers } from "../../content/followers.js";
import { getCompanionStatBonus, getEquippedGearBonus } from "../gear.js";
import { reduceGameState } from "../reducer.js";
import type { EncounterEffect } from "../../schema/card.schema.js";
import type { GameState } from "../../schema/session.schema.js";

const AUDITED_IDS = [
  "artifact-cinder-suture-kit",
  "artifact-ember-burden-idol",
  "artifact-last-breath-rivet",
  "artifact-mira-rift-twin",
  "artifact-oath-chain-ledger",
  "artifact-saintwire-splint",
  "artifact-throne-crown-fragment",
  "artifact-zoey-thorn-violet"
] as const;

function acquireArtifact(
  artifactId: string,
  prepare?: (state: GameState, seatId: string) => void
): GameState {
  const state = createInitialSessionState(`post-audit-${artifactId}`, "single-player");
  const seat = state.players[0]!;
  const sectorId = seat.sectorId;
  state.status = "active";
  state.phase = "resolution";
  prepare?.(state, seat.seatId);
  state.sectors = state.sectors.map((sector) =>
    sector.id === sectorId
      ? { ...sector, encounterDecks: { ...sector.encounterDecks, artifact: [artifactId] } }
      : sector
  );

  const server = new GameRoomServer(state);
  const effect = (server as unknown as {
    resolveEffect(effect: Extract<EncounterEffect, { type: "draw_artifact" }>, seatId: string): EncounterEffect;
  }).resolveEffect({ type: "draw_artifact" }, seat.seatId);
  const result = reduceGameState({ ...state, pendingEffect: effect }, {
    type: "RESOLUTION_APPLIED",
    seatId: seat.seatId,
    effect,
    sourceCardId: artifactId,
    success: true,
    createdAt: "2026-07-13T00:00:00.000Z"
  });

  expect(result.ok, `${artifactId} should resolve through the authoritative artifact path`).toBe(true);
  if (!result.ok) throw new Error(result.rejection.reason);
  expect(result.state.sectors.find((sector) => sector.id === sectorId)?.encounterDecks.artifact).toEqual([]);
  return result.state;
}

describe("post-audit direct item-effect regressions", () => {
  it("keeps the exact eight audited IDs under focused coverage", () => {
    expect(AUDITED_IDS).toHaveLength(8);
    for (const id of AUDITED_IDS) expect(loadArtifactCards().has(id)).toBe(true);
  });

  it("artifact-cinder-suture-kit authoritatively grants the normal kit without auto-equipping it", () => {
    const state = acquireArtifact("artifact-cinder-suture-kit");
    const character = state.players[0]!.character;
    expect(character.heldGear.filter((item) => item.id === "cinder-suture-kit")).toHaveLength(1);
    expect(Object.values(character.equippedGear)).not.toContain("cinder-suture-kit");
    expect(JSON.parse(JSON.stringify(state)).players[0].character.heldGear.some((item: { id: string }) => item.id === "cinder-suture-kit")).toBe(true);
  });

  it("artifact-ember-burden-idol grants exactly one trophy and its authored note", () => {
    const before = createInitialSessionState("ember-before", "single-player").players[0]!.character.trophies;
    const state = acquireArtifact("artifact-ember-burden-idol");
    const player = state.players[0]!;
    expect(player.character.trophies).toBe(before + 1);
    expect(player.private.notes).toContain("Ember Burden Idol: valuable, heavy, and politically loud.");
    expect(player.character.heldGear.some((item) => item.id === "artifact-ember-burden-idol")).toBe(false);
  });

  it("artifact-last-breath-rivet grants its permanent gear and the bonus follows equipped state", () => {
    const state = acquireArtifact("artifact-last-breath-rivet");
    const character = state.players[0]!.character;
    expect(character.heldGear.filter((item) => item.id === "last-breath-rivet")).toHaveLength(1);
    expect(getEquippedGearBonus(character, "grit")).toBe(0);
    expect(getEquippedGearBonus({ ...character, equippedGear: { ...character.equippedGear, utility: "last-breath-rivet" } }, "grit")).toBe(1);
  });

  it("artifact-mira-rift-twin grants Mira and enables only Rumi's authored team bonus", () => {
    const state = acquireArtifact("artifact-mira-rift-twin", (draft) => {
      draft.players[0]!.character.id = "char_rumi";
    });
    const character = state.players[0]!.character;
    expect(character.followers?.filter((follower) => follower.id === "mira-rift-twin")).toHaveLength(1);
    expect(getCompanionStatBonus(character, "signal")).toBe(1);
    expect(getCompanionStatBonus(character, "guile")).toBe(1);
    expect(getCompanionStatBonus({ ...character, id: "void-marshal" }, "signal")).toBe(0);
  });

  it("artifact-oath-chain-ledger grants its contract object without changing mission lifecycle state", () => {
    let activeContract: GameState["players"][number]["character"]["activeContract"];
    let completedContracts: string[];
    const state = acquireArtifact("artifact-oath-chain-ledger", (draft) => {
      activeContract = draft.players[0]!.character.activeContract;
      completedContracts = [...(draft.players[0]!.character.completedContracts ?? [])];
    });
    const character = state.players[0]!.character;
    expect(character.heldGear.filter((item) => item.id === "oath-chain-ledger")).toHaveLength(1);
    expect(character.activeContract).toEqual(activeContract!);
    expect(character.completedContracts ?? []).toEqual(completedContracts!);
  });

  it("artifact-saintwire-splint grants the normal splint without auto-equipping it", () => {
    const state = acquireArtifact("artifact-saintwire-splint");
    const character = state.players[0]!.character;
    expect(character.heldGear.filter((item) => item.id === "saintwire-splint")).toHaveLength(1);
    expect(Object.values(character.equippedGear)).not.toContain("saintwire-splint");
  });

  it("artifact-throne-crown-fragment advances only its authored scenario key and records its note", () => {
    let beforeProgress: Record<string, number> = {};
    const state = acquireArtifact("artifact-throne-crown-fragment", (draft) => {
      beforeProgress = { ...draft.scenarioProgress };
    });
    const player = state.players[0]!;
    expect(state.scenarioProgress.sealRestorationMarks).toBe((beforeProgress.sealRestorationMarks ?? 0) + 1);
    expect({ ...state.scenarioProgress, sealRestorationMarks: beforeProgress.sealRestorationMarks }).toEqual({
      ...beforeProgress,
      sealRestorationMarks: beforeProgress.sealRestorationMarks
    });
    expect(player.private.notes).toContain("Throne-Crown burden: valuable, visible, and hard to move quietly.");
  });

  it("artifact-zoey-thorn-violet grants Zoey and completes only Rumi's Mira-linked triad bonus", () => {
    const mira = { ...loadFollowers().get("mira-rift-twin")!, instanceId: "mira-existing", exhausted: false };
    const state = acquireArtifact("artifact-zoey-thorn-violet", (draft) => {
      draft.players[0]!.character.id = "char_rumi";
      draft.players[0]!.character.followers = [mira];
    });
    const character = state.players[0]!.character;
    expect(character.followers?.filter((follower) => follower.id === "zoey-thorn-violet")).toHaveLength(1);
    expect(getCompanionStatBonus(character, "grit")).toBe(1);
    expect(getCompanionStatBonus(character, "signal")).toBe(2);
    expect(getCompanionStatBonus(character, "guile")).toBe(2);
  });

  it("Ashen Route Compass acquisition and phone projection contain only the approved movement rule", () => {
    const artifact = loadArtifactCards().get("artifact-ashen-route-compass")!;
    const serialized = JSON.stringify(artifact);
    expect(serialized).toContain("adjust the exact movement distance by −1 or +1");
    expect(serialized).not.toMatch(/anomaly failures|soften movement/i);

    const state = acquireArtifact("artifact-ashen-route-compass");
    const player = state.players[0]!;
    expect(player.private.notes).toContain("Ashen Route Compass acquired. Spend 1 charge after rolling movement to adjust the exact movement distance by −1 or +1.");
    const projection = createPhoneProjection(state, player.seatId);
    const phoneText = JSON.stringify(projection);
    expect(phoneText).toContain("After rolling for movement");
    expect(phoneText).toContain("exact required movement distance");
    expect(phoneText).not.toMatch(/anomaly failures|soften movement/i);
  });
});
