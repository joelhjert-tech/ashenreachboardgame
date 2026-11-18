import { afterEach, describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import { GameRoomServer, type ConnectedClient } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

function fixture(status: "lobby" | "active" = "lobby", configured = true) {
  const initial = createInitialSessionState("REACTIONS", "single-player", "scenario_broken_seal", "co-op", "standard", 1,
    { lobbyConfigured: configured, setupHostSeatId: "seat-1" });
  const server = new GameRoomServer({ ...initial, status, seats: initial.seats.map((seat) => ({ ...seat, displayName: "Nera", connected: true })) });
  const phoneSend = vi.fn();
  const tvSend = vi.fn();
  const phone: ConnectedClient = { view: "phone", seatId: "seat-1", socket: { readyState: 1, send: phoneSend } as unknown as WebSocket };
  const tv: ConnectedClient = { view: "tv", socket: { readyState: 1, send: tvSend } as unknown as WebSocket };
  const relay = server as unknown as { clients: Set<ConnectedClient>; handleLobbyReaction: (client: ConnectedClient, message: Record<string, unknown>) => void };
  relay.clients.add(phone);
  relay.clients.add(tv);
  return { server, relay, phone, tv, phoneSend, tvSend };
}

describe("ephemeral lobby reactions", () => {
  afterEach(() => vi.restoreAllMocks());

  it("broadcasts a player's reaction only to TV without touching game state", () => {
    const { server, relay, phone, phoneSend, tvSend } = fixture();
    const before = server.getState();
    relay.handleLobbyReaction(phone, { reaction: "fire", displayName: "Forged name", seatId: "someone-else" });
    expect(JSON.parse(tvSend.mock.calls[0]![0])).toMatchObject({ type: "LOBBY_REACTION", reaction: "fire", displayName: "Nera", sessionId: "REACTIONS" });
    expect(phoneSend).not.toHaveBeenCalled();
    expect(server.getState()).toBe(before);
  });

  it("rejects spectators, superseded phones, unregistered clients, and unknown emoji", () => {
    const { relay, phone, tv, tvSend } = fixture();
    relay.handleLobbyReaction(tv, { reaction: "party" });
    relay.handleLobbyReaction({ ...phone }, { reaction: "party" });
    relay.handleLobbyReaction(phone, { reaction: "arbitrary payload" });
    phone.superseded = true;
    relay.handleLobbyReaction(phone, { reaction: "party" });
    expect(tvSend).not.toHaveBeenCalled();
  });

  it.each([["active", true], ["lobby", false]] as const)("ignores reactions in %s with configured=%s", (status, configured) => {
    const { relay, phone, tvSend } = fixture(status, configured);
    relay.handleLobbyReaction(phone, { reaction: "heart" });
    expect(tvSend).not.toHaveBeenCalled();
  });

  it("caps repeated taps while allowing fresh bursts and refusing host TV sends", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
    const { relay, phone, tv, tvSend } = fixture();
    for (let index = 0; index < 20; index++) relay.handleLobbyReaction(phone, { reaction: "laugh" });
    expect(tvSend).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(1200);
    relay.handleLobbyReaction(phone, { reaction: "skull" });
    tv.isHost = true;
    relay.handleLobbyReaction(tv, { reaction: "party" });
    expect(tvSend).toHaveBeenCalledTimes(2);
  });
});
