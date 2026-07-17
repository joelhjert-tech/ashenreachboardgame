import { describe, expect, it } from "vitest";
import { loadGear } from "../../game/content/gear.js";
import { getEquippedGearModifierSources } from "../../game/engine/gear.js";
import { createPhoneProjection, createTvProjection } from "../roomServer.js";
import { createInitialSessionState } from "../sessionState.js";

describe("Phase 1 item effect reconnect projection", () => {
  it("preserves equipped permanent effects in the private snapshot", () => {
    const state = createInitialSessionState("item-effect-reconnect", "single-player", undefined, "co-op", "standard", 1);
    const vest = loadGear().get("rivetplate-vest");
    if (!vest) throw new Error("Missing Rivetplate Vest fixture");
    state.seats[0] = { ...state.seats[0]!, displayName: "Reconnect", characterSelected: true, connected: true };
    state.players[0] = {
      ...state.players[0]!,
      character: {
        ...state.players[0]!.character,
        heldGear: [vest],
        equippedGear: { weapon: null, armor: vest.id, utility: null }
      }
    };

    const projection = createPhoneProjection(state, "seat-1", true) as {
      self: { character: typeof state.players[0]["character"] };
    };
    expect(projection.self.character.equippedGear.armor).toBe(vest.id);
    expect(projection.self.character.heldGear[0]).toMatchObject({ id: vest.id, effectModel: "permanent", requiresEquipped: true });
    expect(getEquippedGearModifierSources(projection.self.character, "grit")).toEqual([{ label: "Rivetplate Vest", value: 1 }]);
  });

  it("projects exact equipped passive and charge state to the host without exposing held inventory", () => {
    const state = createInitialSessionState("item-effect-tv", "single-player", undefined, "co-op", "standard", 1);
    const lantern = loadGear().get("choir-lantern");
    if (!lantern) throw new Error("Missing Choir Lantern fixture");
    const owned = { ...lantern, instanceId: "choir-tv-1", currentCharges: 1, maxCharges: 2 };
    state.seats[0] = { ...state.seats[0]!, displayName: "Host", characterSelected: true, connected: true };
    state.players[0] = {
      ...state.players[0]!,
      character: {
        ...state.players[0]!.character,
        heldGear: [owned],
        equippedGear: { weapon: null, armor: null, utility: owned.id },
        equippedGearInstances: { weapon: null, armor: null, utility: owned.instanceId }
      }
    };

    const projection = createTvProjection(state) as {
      players: Array<{ character: { equippedGearDetails?: Array<Record<string, unknown>> } }>;
    };
    expect(projection.players[0]?.character.equippedGearDetails).toEqual([expect.objectContaining({
      slot: "utility",
      id: owned.id,
      instanceId: owned.instanceId,
      name: owned.name,
      statBonus: owned.statBonus,
      currentCharges: 1,
      maxCharges: 2
    })]);
    expect(projection.players[0]?.character).not.toHaveProperty("heldGear");
  });
});
