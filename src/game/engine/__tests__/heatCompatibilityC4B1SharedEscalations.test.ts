import { describe, expect, it } from "vitest";
import {
  LEGACY_HEAT_EFFECT_APPROVALS,
  validateLegacyHeatContentRecord
} from "../../../../scripts/legacy-heat-validation.js";
import { loadEscalationCards } from "../../content/escalations.js";
import { createSequenceRandomSource } from "../dice.js";
import type { ClientIntent, GameAction } from "../actions.js";
import type { GameState, SessionMode } from "../../schema/session.schema.js";
import {
  GameRoomServer,
  createPhoneProjection,
  createTvProjection,
  type ConnectedClient
} from "../../../server/roomServer.js";
import { createInitialSessionState } from "../../../server/sessionState.js";

const TARGETS = [
  {
    id: "escalation-blackstar-hunger",
    title: "Blackstar Hunger",
    text: "The dark star under the route network pulls metal, courage, and breath into its gravity.",
    flavor: "Every shortcut has a mouth.",
    step: 4,
    resolutionSummary: "The blackstar tugged the board one mark closer to collapse."
  },
  {
    id: "escalation-choir-feedback",
    title: "Choir Feedback",
    text: "The relay choir overcorrects and turns every stable signal into a shriek.",
    flavor: "Silence would be mercy. The Choir prefers documentation.",
    step: 2,
    resolutionSummary: "Feedback rattled the relay lines and raised the signal burden."
  },
  {
    id: "escalation-saltwind-lockdown",
    title: "Saltwind Lockdown",
    text: "Void-salt wind cakes the outer lanes and turns every easy crossing abrasive.",
    flavor: "The road is still open. It just hates you now.",
    step: 2,
    resolutionSummary: "Saltwind closed the comfortable routes and tightened pressure around the party."
  }
] as const;

const REMAINING_AUTHORED_IDS = [
  "crownless-advocate",
  "escalation-marrow-surgery-debt",
  "saltflat-bone-reader"
] as const;

function client(seatId: string): ConnectedClient {
  return {
    seatId,
    view: "phone",
    socket: { send() {}, close() {} } as unknown as ConnectedClient["socket"]
  };
}

function runIntent(server: GameRoomServer, intent: ClientIntent): void {
  server.handleIntent(client(intent.seatId), intent);
  for (let index = 0; index < 4; index += 1) {
    const resolution = server.getState().activeResolution;
    if (!resolution || !["roll_result", "outcome_summary", "awaiting_continue"].includes(resolution.stage)) return;
    const seatId = server.getState().turnOrder[server.getState().activeSeatIndex] ?? intent.seatId;
    server.handleIntent(client(seatId), { type: "CONTINUE_RESOLUTION", seatId });
  }
}

function setup(
  id: typeof TARGETS[number]["id"],
  sessionMode: SessionMode,
  playerCount: number,
  escalationLevel = 0
): GameState {
  const state = createInitialSessionState(`c4b1-${id}-${sessionMode}-${playerCount}-${escalationLevel}`, sessionMode, undefined, undefined, "standard", playerCount);
  const players = state.players.map((player) => player.seatId === "seat-1"
    ? {
        ...player,
        sectorId: "emberwatch-step",
        character: { ...player.character, currentSpaceId: "emberwatch-step" }
      }
    : player);
  const sectors = state.sectors.map((sector) => sector.id === "emberwatch-step"
    ? {
        ...sector,
        encounterDecks: { ...sector.encounterDecks, threat: [], escalation: [id] }
      }
    : sector);
  return {
    ...state,
    status: "active",
    phase: "action",
    currentEncounter: null,
    escalationLevel,
    players,
    sectors
  };
}

function resolve(id: typeof TARGETS[number]["id"], sessionMode: SessionMode, playerCount: number, escalationLevel = 0): GameRoomServer {
  const server = new GameRoomServer(setup(id, sessionMode, playerCount, escalationLevel), [], createSequenceRandomSource([5, 5, 0]));
  runIntent(server, { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
  return server;
}

function escalationEvents(state: GameState): Array<GameAction & { amount: number; newLevel: number; modifier: number }> {
  return (state.eventLog as GameAction[]).filter((event): event is GameAction & { amount: number; newLevel: number; modifier: number } => event.type === "ESCALATION_ADVANCED");
}

function eventType(event: unknown): string | null {
  return event && typeof event === "object" && typeof (event as Record<string, unknown>).type === "string"
    ? String((event as Record<string, unknown>).type)
    : null;
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
    if (key === "type" && ["gain_heat", "gain_heat_all", "lose_heat"].includes(String(nested))) output.push(`${nestedPath}=${String(nested)}`);
    heatProjectionPaths(nested, nestedPath, output);
  }
  return output;
}

describe("Heat Compatibility C4B1 shared escalation retirement", () => {
  it("removes only the three approved Heat leaves and preserves every surrounding card field", () => {
    const cards = loadEscalationCards();
    expect(cards).toHaveLength(16);
    for (const expected of TARGETS) {
      expect(cards.get(expected.id)).toEqual({
        id: expected.id,
        type: "escalation",
        title: expected.title,
        text: expected.text,
        flavor: expected.flavor,
        step: expected.step,
        resolutionSummary: expected.resolutionSummary,
        escalationDelta: 1
      });
      expect(cards.get(expected.id)?.resolveEffect).toBeUndefined();
      expect(JSON.stringify(cards.get(expected.id))).not.toMatch(/gain_heat|gain_heat_all|lose_heat|take_wound|gain_scar|lose_salvage|advance_escalation|forced_displacement|temporary_modifier|equipment_suppression/i);
    }
  });

  it("narrows the authored compatibility manifest to the exact three remaining IDs", () => {
    expect(LEGACY_HEAT_EFFECT_APPROVALS.map(({ id }) => id)).toEqual(expect.arrayContaining([...REMAINING_AUTHORED_IDS]));
    for (const { id } of TARGETS) {
      expect(LEGACY_HEAT_EFFECT_APPROVALS.some((approval) => approval.id === id)).toBe(false);
      expect(validateLegacyHeatContentRecord(`${id}.json`, loadEscalationCards().get(id))).toEqual([]);
    }
  });

  it.each(TARGETS.flatMap(({ id }) => [
    { id, mode: "single-player" as const, players: 1 },
    { id, mode: "multiplayer" as const, players: 2 },
    { id, mode: "multiplayer" as const, players: 3 },
    { id, mode: "multiplayer" as const, players: 4 }
  ]))("$id advances the shared track once in $mode with $players player(s)", ({ id, mode, players }) => {
    const server = resolve(id, mode, players);
    const state = server.getState();
    expect(state.escalationLevel).toBe(1);
    expect(escalationEvents(state)).toHaveLength(1);
    expect(escalationEvents(state)[0]).toMatchObject({ amount: 1, newLevel: 1, modifier: 0, reason: "sector stabilization" });
    expect(state.sectors.find((sector) => sector.id === "emberwatch-step")?.encounterDecks.escalation).toEqual([]);
    expect(state.eventLog.some((event) => /HEAT/.test(eventType(event) ?? ""))).toBe(false);
  });

  it.each(TARGETS)("$id preserves ordinary threshold and collapse handling", ({ id }) => {
    const threshold = resolve(id, "multiplayer", 4, 3).getState();
    expect(escalationEvents(threshold)).toHaveLength(1);
    expect(escalationEvents(threshold)[0]).toMatchObject({ amount: 1, newLevel: 4, modifier: 2 });
    expect(threshold.eventLog.filter((event) => eventType(event) === "SECTOR_COLLAPSED")).toHaveLength(0);

    const multiplayerCollapse = resolve(id, "multiplayer", 4, 5).getState();
    expect(escalationEvents(multiplayerCollapse)).toHaveLength(1);
    expect(escalationEvents(multiplayerCollapse)[0]).toMatchObject({ amount: 1, newLevel: 6, modifier: 3 });
    expect(multiplayerCollapse.eventLog.filter((event) => eventType(event) === "SECTOR_COLLAPSED")).toHaveLength(1);

    const soloCollapse = resolve(id, "single-player", 1, 7).getState();
    expect(escalationEvents(soloCollapse)).toHaveLength(1);
    expect(escalationEvents(soloCollapse)[0]).toMatchObject({ amount: 1, newLevel: 8, modifier: 4 });
    expect(soloCollapse.eventLog.filter((event) => eventType(event) === "SECTOR_COLLAPSED")).toHaveLength(1);
  });

  it.each(TARGETS)("$id remains replay-safe and projects one public shared result without Heat", ({ id }) => {
    const pending = setup(id, "multiplayer", 2);
    const reconnected = new GameRoomServer(JSON.parse(JSON.stringify(pending)) as GameState, [], createSequenceRandomSource([5, 5, 0]));
    runIntent(reconnected, { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
    const completed = reconnected.getState();
    expect(escalationEvents(completed)).toHaveLength(1);

    runIntent(reconnected, { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
    expect(escalationEvents(reconnected.getState())).toHaveLength(1);
    expect(reconnected.getState().sectors.find((sector) => sector.id === "emberwatch-step")?.encounterDecks.escalation).toEqual([]);

    const afterReconnect = new GameRoomServer(JSON.parse(JSON.stringify(reconnected.getState())) as GameState);
    runIntent(afterReconnect, { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
    expect(escalationEvents(afterReconnect.getState())).toHaveLength(1);
    expect(heatProjectionPaths(createPhoneProjection(afterReconnect.getState(), "seat-1"))).toEqual([]);
    expect(heatProjectionPaths(createPhoneProjection(afterReconnect.getState(), "seat-2"))).toEqual([]);
    expect(heatProjectionPaths(createTvProjection(afterReconnect.getState()))).toEqual([]);
  });
});
