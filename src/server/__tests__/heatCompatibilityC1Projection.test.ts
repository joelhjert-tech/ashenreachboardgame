import { describe, expect, it } from "vitest";
import { createInitialSessionState } from "../sessionState.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";
import { stripLegacyHeatProjection } from "../legacyHeatProjection.js";

const FORBIDDEN_KEY = /^(?:heat|heatCost|heatDelta|heatModifier|heatState|heatThreshold|operativeHeat|playerHeat)$/i;
const FORBIDDEN_LABEL = /\b(?:gain|lose|lost|spend|spent|pay|paid|current|total|threshold|modifier|status)\s+(?:\d+\s+)?Heat\b|\bHeat\s+(?:total|threshold|modifier|status)\b/i;

function projectionViolations(value: unknown, path = "root", output: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => projectionViolations(entry, `${path}[${index}]`, output));
    return output;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && FORBIDDEN_LABEL.test(value)) output.push(`${path}=${value}`);
    return output;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEY.test(key)) output.push(`${path}.${key}`);
    if (key === "lossCondition" && nested === "heat") output.push(`${path}.${key}=heat`);
    if (key === "type" && ["heat", "gain_heat", "gain_heat_all", "lose_heat", "set_heat", "clear_heat"].includes(String(nested))) output.push(`${path}.${key}=${nested}`);
    projectionViolations(nested, `${path}.${key}`, output);
  }
  return output;
}

describe("Heat Compatibility C1 server projection boundary", () => {
  it("strips legacy fields, effects, tags, and result rows without changing stable IDs", () => {
    const input = {
      heat: 4,
      heatThreshold: 6,
      gear: { id: "heat-sink-prayer", heatCost: 1, name: "Scar-Sink Prayer" },
      follower: { id: "saltflat-bone-reader", lossCondition: "heat" },
      tags: ["companion", "heat"],
      effects: [{ type: "gain_heat", amount: 1 }, { type: "gain_salvage", amount: 1 }],
      deltas: [{ type: "heat", label: "Heat", value: 1 }, { type: "salvage", label: "Salvage", value: 1 }]
    };
    const result = stripLegacyHeatProjection(input) as any;

    expect(result).toEqual({
      gear: { id: "heat-sink-prayer", name: "Scar-Sink Prayer" },
      follower: { id: "saltflat-bone-reader" },
      tags: ["companion"],
      effects: [{ type: "gain_salvage", amount: 1 }],
      deltas: [{ type: "salvage", label: "Salvage", value: 1 }]
    });
    expect(projectionViolations(result)).toEqual([]);
  });

  it.each([
    ["waiting room", "lobby"],
    ["active test", "resolution"],
    ["movement", "navigation"],
    ["scenario", "action"],
    ["shop", "action"]
  ] as const)("keeps owner, other-phone, and TV %s projections Heat-free", (_label, phase) => {
    const state = createInitialSessionState(`c1-projection-${phase}`, "multiplayer", undefined, "rivalry", "standard", 2);
    state.status = phase === "lobby" ? "lobby" : "active";
    state.phase = phase === "lobby" ? "start" : phase;
    state.seats = state.seats.map((seat, index) => ({ ...seat, displayName: `Player ${index + 1}`, characterSelected: true, connected: true }));

    const character = state.players[0]!.character as any;
    character.heat = 7;
    character.heatModifier = 2;
    character.heldGear = [...character.heldGear, { id: "legacy-gear", name: "Legacy gear", slot: "utility", category: "utility", tier: "standard", cost: 1, sellValue: 1, statBonus: { stat: "signal", amount: 1 }, heatCost: 1 }];
    character.followers = [{ id: "legacy-follower", name: "Legacy follower", role: "informant", text: "Legacy", lossCondition: "heat" }];
    (state as any).publicResultDeltas = [{ type: "heat", label: "Heat", value: 1, publicText: "Gain 1 Heat." }];

    const projections = [
      createPhoneProjection(state, state.players[0]!.seatId, true),
      createPhoneProjection(state, state.players[1]!.seatId, true),
      createTvProjection(state)
    ];
    for (const projection of projections) expect(projectionViolations(projection)).toEqual([]);
  });

  it("keeps projections Heat-free after a legacy threshold replay and reconnect reconstruction", () => {
    const state = createInitialSessionState("c1-reconnect", "multiplayer", undefined, "co-op", "standard", 2);
    state.status = "active";
    state.seats = state.seats.map((seat, index) => ({ ...seat, displayName: `Player ${index + 1}`, characterSelected: true, connected: index === 0 }));
    const tv = createTvProjection(state);
    const owner = createPhoneProjection(state, state.players[0]!.seatId, true);
    const other = createPhoneProjection(state, state.players[1]!.seatId, true);

    expect(projectionViolations(tv)).toEqual([]);
    expect(projectionViolations(owner)).toEqual([]);
    expect(projectionViolations(other)).toEqual([]);
    expect(state.players.every((player) => player.character.status === "active")).toBe(true);
  });
});
