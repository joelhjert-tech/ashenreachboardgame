import { describe, expect, it } from "vitest";
import { loadGear } from "../../game/content/gear.js";
import { getEquippedGearModifierSources } from "../../game/engine/gear.js";
import { createPhoneProjection } from "../roomServer.js";
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
});
