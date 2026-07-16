import { describe, expect, it } from "vitest";
import {
  LEGACY_HEAT_EFFECT_APPROVALS,
  validateLegacyHeatContentRecord
} from "../../../../scripts/legacy-heat-validation.js";
import { loadFollowers } from "../../content/followers.js";
import type { Follower } from "../../schema/follower.schema.js";
import type { GameState } from "../../schema/session.schema.js";
import {
  GameRoomServer,
  createPhoneProjection,
  createTvProjection,
  type ConnectedClient
} from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

const TARGETS = [
  {
    id: "crownless-advocate",
    text: "Once per round, record that the Crownless Advocate softened one faction demand or stabilized one rivalry bargain.",
    note: "Crownless Advocate: one faction demand or rivalry bargain was softened.",
    role: "informant",
    loyalty: 3,
    lossCondition: "choice"
  },
  {
    id: "saltflat-bone-reader",
    text: "Once per round, record a safer route note from one scar, omen, or void-salt bargain.",
    note: "Saltflat Bone-Reader: one scar, omen, or void-salt bargain became a safer route note.",
    role: "ritualist",
    loyalty: 2,
    lossCondition: "heat"
  }
] as const;

function client(seatId: string, sent: Array<Record<string, unknown>> = []): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: {
      send(data: string) {
        sent.push(JSON.parse(data) as Record<string, unknown>);
      },
      close() {}
    } as unknown as ConnectedClient["socket"]
  };
}

function stateWithFollowers(followers: Follower[], playerCount = 2): GameState {
  const state = createInitialSessionState("c5b-followers", "multiplayer", undefined, undefined, "standard", playerCount);
  return {
    ...state,
    status: "active",
    phase: "action",
    activeSeatIndex: 0,
    players: state.players.map((player) => player.seatId === "seat-1"
      ? {
          ...player,
          character: {
            ...player.character,
            followers: followers.map((follower, index) => ({
              ...follower,
              instanceId: `${follower.id}:seat-1:${index}`
            }))
          }
        }
      : player)
  };
}

function restoreOwnerAction(state: GameState): GameState {
  return {
    ...state,
    status: "active",
    phase: "action",
    activeSeatIndex: state.turnOrder.indexOf("seat-1"),
    currentEncounter: null,
    activeResolution: null
  };
}

function heatProjectionPaths(value: unknown, path = "root", output: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => heatProjectionPaths(entry, `${path}[${index}]`, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nestedPath = `${path}.${key}`;
    if (/heat/i.test(key)) output.push(nestedPath);
    if (key === "type" && ["gain_heat", "gain_heat_all", "lose_heat"].includes(String(nested))) {
      output.push(`${nestedPath}=${String(nested)}`);
    }
    heatProjectionPaths(nested, nestedPath, output);
  }
  return output;
}

describe("Heat Compatibility C5B final follower retirements", () => {
  it("authors the exact approved owner-private notes while preserving follower identity", () => {
    const followers = loadFollowers();
    expect(followers.size).toBe(24);

    for (const expected of TARGETS) {
      const follower = followers.get(expected.id);
      expect(follower).toEqual({
        id: expected.id,
        name: expected.id === "crownless-advocate" ? "Crownless Advocate" : "Saltflat Bone-Reader",
        role: expected.role,
        text: expected.text,
        activeEffect: { type: "gain_note", text: expected.note },
        useLimit: "oncePerRound",
        loyalty: expected.loyalty,
        lossCondition: expected.lossCondition
      });
      expect(validateLegacyHeatContentRecord(`content/followers/${expected.id}.json`, follower)).toEqual([]);
      expect(JSON.stringify(follower)).not.toMatch(/gain_heat|gain_heat_all|lose_heat/i);
    }
  });

  it("removes both follower IDs from the legacy Heat-effect approval manifest", () => {
    for (const { id } of TARGETS) {
      expect(LEGACY_HEAT_EFFECT_APPROVALS.some((approval) => approval.id === id)).toBe(false);
    }
    expect(LEGACY_HEAT_EFFECT_APPROVALS).toHaveLength(2);
  });

  it.each(TARGETS)("$id records its approved note once and changes no personal resource", (expected) => {
    const follower = loadFollowers().get(expected.id)!;
    const before = stateWithFollowers([follower]);
    const server = new GameRoomServer(before);

    server.handleIntent(client("seat-1"), {
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: expected.id
    });

    const after = server.getState();
    const owner = after.players.find((player) => player.seatId === "seat-1")!;
    const ownerBefore = before.players.find((player) => player.seatId === "seat-1")!;
    expect(owner.private.notes.filter((note) => note === expected.note)).toHaveLength(1);
    expect(owner.character.wounds).toBe(ownerBefore.character.wounds);
    expect(owner.character.scars).toEqual(ownerBefore.character.scars);
    expect(owner.character.salvage).toBe(ownerBefore.character.salvage);
    expect(owner.character.followers).toHaveLength(1);
    expect(after.eventLog.filter((event) =>
      (event as { type?: string; followerId?: string }).type === "USE_FOLLOWER" &&
      (event as { followerId?: string }).followerId === expected.id
    )).toHaveLength(1);
  });

  it("enforces owner authority and the shared stable-ID once-per-round boundary across duplicate instances and reconnect", () => {
    const follower = loadFollowers().get("crownless-advocate")!;
    const before = stateWithFollowers([follower, follower]);
    const wrongSeatMessages: Array<Record<string, unknown>> = [];
    const server = new GameRoomServer(before);

    server.handleIntent(client("seat-2", wrongSeatMessages), {
      type: "USE_FOLLOWER",
      seatId: "seat-2",
      followerId: follower.id
    });
    expect(wrongSeatMessages.some((message) => message.type === "INTENT_REJECTED")).toBe(true);

    server.handleIntent(client("seat-1"), {
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: follower.id
    });

    const reconnected = new GameRoomServer(restoreOwnerAction(JSON.parse(JSON.stringify(server.getState())) as GameState));
    const duplicateMessages: Array<Record<string, unknown>> = [];
    reconnected.handleIntent(client("seat-1", duplicateMessages), {
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: follower.id
    });

    expect(duplicateMessages.some((message) =>
      message.type === "INTENT_REJECTED" && String(message.reason).includes("already been used this round")
    )).toBe(true);
    expect(reconnected.getState().players[0]!.private.notes.filter((note) =>
      note === "Crownless Advocate: one faction demand or rivalry bargain was softened."
    )).toHaveLength(1);
  });

  it("keeps notes owner-private and all phone/TV projections Heat-free after reconnect", () => {
    const follower = loadFollowers().get("saltflat-bone-reader")!;
    const server = new GameRoomServer(stateWithFollowers([follower]));
    server.handleIntent(client("seat-1"), {
      type: "USE_FOLLOWER",
      seatId: "seat-1",
      followerId: follower.id
    });

    const state = JSON.parse(JSON.stringify(server.getState())) as GameState;
    const owner = createPhoneProjection(state, "seat-1");
    const other = createPhoneProjection(state, "seat-2");
    const tv = createTvProjection(state);
    const note = "Saltflat Bone-Reader: one scar, omen, or void-salt bargain became a safer route note.";

    expect(JSON.stringify(owner)).toContain(note);
    expect(JSON.stringify(other)).not.toContain(note);
    expect(JSON.stringify(tv)).not.toContain(note);
    expect(heatProjectionPaths(owner)).toEqual([]);
    expect(heatProjectionPaths(other)).toEqual([]);
    expect(heatProjectionPaths(tv)).toEqual([]);
  });
});
