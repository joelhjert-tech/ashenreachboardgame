import { describe, expect, it } from "vitest";
import {
  LEGACY_HEAT_EFFECT_APPROVALS,
  validateLegacyHeatContentRecord
} from "../../../../scripts/legacy-heat-validation.js";
import { loadEscalationCards } from "../../content/escalations.js";
import { createCanonicalSectorGraph } from "../../data/canonicalSectorGraph.js";
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

const TARGET_ID = "escalation-marrow-surgery-debt" as const;
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

function setup(sessionMode: SessionMode, playerCount: number, escalationLevel = 0): GameState {
  const state = createInitialSessionState(
    `c4b2-marrow-${sessionMode}-${playerCount}-${escalationLevel}`,
    sessionMode,
    undefined,
    undefined,
    "standard",
    playerCount
  );
  const players = state.players.map((player) => player.seatId === "seat-1"
    ? {
        ...player,
        sectorId: "emberwatch-step",
        character: { ...player.character, currentSpaceId: "emberwatch-step", salvage: 3 }
      }
    : player);
  const sectors = state.sectors.map((sector) => sector.id === "emberwatch-step"
    ? {
        ...sector,
        encounterDecks: { ...sector.encounterDecks, threat: [], escalation: [TARGET_ID] }
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

function resolve(sessionMode: SessionMode, playerCount: number, escalationLevel = 0): { before: GameState; server: GameRoomServer } {
  const before = setup(sessionMode, playerCount, escalationLevel);
  const server = new GameRoomServer(before, [], createSequenceRandomSource([5, 5, 0]));
  runIntent(server, { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
  return { before, server };
}

function escalationEvents(state: GameState): Array<GameAction & { amount: number; newLevel: number; modifier: number }> {
  return (state.eventLog as GameAction[]).filter(
    (event): event is GameAction & { amount: number; newLevel: number; modifier: number } => event.type === "ESCALATION_ADVANCED"
  );
}

function eventType(event: unknown): string | null {
  return event && typeof event === "object" && typeof (event as Record<string, unknown>).type === "string"
    ? String((event as Record<string, unknown>).type)
    : null;
}

function personalConsequences(state: GameState): unknown {
  return state.players.map((player) => ({
    seatId: player.seatId,
    salvage: player.character.salvage,
    wounds: player.character.wounds,
    scars: player.character.scars,
    heldGear: player.character.heldGear,
    equippedGear: player.character.equippedGear
  }));
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

describe("Heat Compatibility C4B2 Marrow escalation retirement", () => {
  it("removes only gain_heat 1 and preserves the complete escalation definition", () => {
    const card = loadEscalationCards().get(TARGET_ID);
    expect(card).toEqual({
      id: TARGET_ID,
      type: "escalation",
      title: "Marrow Surgery Debt",
      text: "Field surgeons call in favors, and every healed wound starts billing the future.",
      flavor: "You can leave the table alive and still owe it blood.",
      step: 3,
      resolutionSummary: "Surgery debt followed the party as a new lasting mark.",
      escalationDelta: 1
    });
    expect(card?.resolveEffect).toBeUndefined();
    expect(createCanonicalSectorGraph().filter((sector) => sector.encounterDecks.escalation.includes(TARGET_ID))).toHaveLength(1);
    expect(JSON.stringify(card)).not.toMatch(
      /gain_heat|gain_heat_all|lose_heat|lose_salvage|pay_salvage|spend_salvage|gain_wound|gain_scar|forced_displacement|temporary_modifier|equipment_suppression/i
    );
  });

  it("keeps the escalation and final follower IDs outside the Heat-effect approval manifest", () => {
    expect(LEGACY_HEAT_EFFECT_APPROVALS.some(({ id }) => id === TARGET_ID)).toBe(false);
    for (const id of ["crownless-advocate", "saltflat-bone-reader"]) {
      expect(LEGACY_HEAT_EFFECT_APPROVALS.some((approval) => approval.id === id)).toBe(false);
    }
    expect(validateLegacyHeatContentRecord(`${TARGET_ID}.json`, loadEscalationCards().get(TARGET_ID))).toEqual([]);
    expect(validateLegacyHeatContentRecord(`${TARGET_ID}.json`, {
      ...loadEscalationCards().get(TARGET_ID),
      resolveEffect: { type: "gain_heat", amount: 1 }
    })[0]).toMatch(/blocked legacy Heat construct/);
    expect(validateLegacyHeatContentRecord(`${TARGET_ID}.json`, {
      ...loadEscalationCards().get(TARGET_ID),
      resolveEffect: { type: "lose_salvage", amount: 1 }
    })[0]).toMatch(/uses lose_salvage outside the approved automatic floor-zero consequence set/);
  });

  it.each([
    { mode: "single-player" as const, players: 1 },
    { mode: "multiplayer" as const, players: 2 },
    { mode: "multiplayer" as const, players: 3 },
    { mode: "multiplayer" as const, players: 4 }
  ])("advances the shared track once with no personal consequence in $mode with $players player(s)", ({ mode, players }) => {
    const { before, server } = resolve(mode, players);
    const state = server.getState();
    expect(state.escalationLevel).toBe(1);
    expect(escalationEvents(state)).toHaveLength(1);
    expect(escalationEvents(state)[0]).toMatchObject({ amount: 1, newLevel: 1, modifier: 0, reason: "sector stabilization" });
    expect(personalConsequences(state)).toEqual(personalConsequences(before));
    expect(state.pendingMemoryTaxChoice).toBeNull();
    expect(state.pendingScarConsequence).toBeNull();
    expect(state.pendingEffect).toBeNull();
    expect(state.eventLog.some((event) => /HEAT|SALVAGE|WOUND|SCAR/.test(eventType(event) ?? ""))).toBe(false);
  });

  it("preserves ordinary difficulty-threshold and solo/multiplayer collapse behavior", () => {
    const threshold = resolve("multiplayer", 4, 3).server.getState();
    expect(escalationEvents(threshold)).toHaveLength(1);
    expect(escalationEvents(threshold)[0]).toMatchObject({ amount: 1, newLevel: 4, modifier: 2 });
    expect(threshold.eventLog.filter((event) => eventType(event) === "SECTOR_COLLAPSED")).toHaveLength(0);

    const multiplayerCollapse = resolve("multiplayer", 4, 5).server.getState();
    expect(escalationEvents(multiplayerCollapse)).toHaveLength(1);
    expect(escalationEvents(multiplayerCollapse)[0]).toMatchObject({ amount: 1, newLevel: 6, modifier: 3 });
    expect(multiplayerCollapse.eventLog.filter((event) => eventType(event) === "SECTOR_COLLAPSED")).toHaveLength(1);

    const soloCollapse = resolve("single-player", 1, 7).server.getState();
    expect(escalationEvents(soloCollapse)).toHaveLength(1);
    expect(escalationEvents(soloCollapse)[0]).toMatchObject({ amount: 1, newLevel: 8, modifier: 4 });
    expect(soloCollapse.eventLog.filter((event) => eventType(event) === "SECTOR_COLLAPSED")).toHaveLength(1);
  });

  it("remains replay-safe and projects one shared result without Heat or a Salvage consequence", () => {
    const pending = setup("multiplayer", 2);
    const reconnected = new GameRoomServer(JSON.parse(JSON.stringify(pending)) as GameState, [], createSequenceRandomSource([5, 5, 0]));
    runIntent(reconnected, { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
    expect(escalationEvents(reconnected.getState())).toHaveLength(1);

    runIntent(reconnected, { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
    expect(escalationEvents(reconnected.getState())).toHaveLength(1);
    expect(reconnected.getState().sectors.find((sector) => sector.id === "emberwatch-step")?.encounterDecks.escalation).toEqual([]);

    const afterReconnect = new GameRoomServer(JSON.parse(JSON.stringify(reconnected.getState())) as GameState);
    runIntent(afterReconnect, { type: "RESOLVE_SPACE_TEXT", seatId: "seat-1" });
    expect(escalationEvents(afterReconnect.getState())).toHaveLength(1);

    const owner = createPhoneProjection(afterReconnect.getState(), "seat-1");
    const other = createPhoneProjection(afterReconnect.getState(), "seat-2");
    const tv = createTvProjection(afterReconnect.getState());
    expect(heatProjectionPaths(owner)).toEqual([]);
    expect(heatProjectionPaths(other)).toEqual([]);
    expect(heatProjectionPaths(tv)).toEqual([]);
    for (const projection of [owner, other, tv]) {
      expect(JSON.stringify(projection)).not.toMatch(/salvageLoss|Lost 1 Salvage|No Salvage to lose|pay 1 Salvage/i);
    }
  });
});
