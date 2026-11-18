import { describe, expect, it } from "vitest";
import { parseAndMigrateSessionSnapshot, serializeSessionSnapshotV2 } from "../../persistence/sessionSnapshot.js";
import { createInitialSessionState } from "../../../server/sessionState.js";
import {
  FORCED_POPELORD_CHARACTER_ID,
  getSubmittedDisplayNameError,
  MAX_PLAYER_DISPLAY_NAME_LENGTH,
  normalizeSubmittedDisplayName,
  requiresPopelordForDisplayName
} from "../playerIdentity.js";

describe("player display-name boundary", () => {
  it("accepts one through eight visible characters and rejects empty or longer submissions", () => {
    expect(MAX_PLAYER_DISPLAY_NAME_LENGTH).toBe(8);
    expect(getSubmittedDisplayNameError("A")).toBeNull();
    expect(getSubmittedDisplayNameError("12345678")).toBeNull();
    expect(getSubmittedDisplayNameError("Åke12345")).toBeNull();
    expect(getSubmittedDisplayNameError("123456789")).toBe("Name must be 1-8 characters.");
    expect(getSubmittedDisplayNameError("   ")).toBe("Name must be 1-8 characters.");
    expect(normalizeSubmittedDisplayName("  Lane  ")).toBe("Lane");
  });

  it("preserves a legacy imported long name without weakening new-name validation", () => {
    const state = createInitialSessionState("legacy-long-player-name", "single-player");
    state.seats[0] = { ...state.seats[0]!, displayName: "Legacy Player Name" };
    const restored = parseAndMigrateSessionSnapshot(serializeSessionSnapshotV2(state));

    expect(restored.saveVersion).toBe(2);
    expect(restored.state.seats[0]?.displayName).toBe("Legacy Player Name");
    expect(getSubmittedDisplayNameError(restored.state.seats[0]?.displayName ?? "")).toBe(
      "Name must be 1-8 characters."
    );
  });

  it("binds only an exact normalized Kebab name to Poopydiperlord", () => {
    expect(FORCED_POPELORD_CHARACTER_ID).toBe("char_popelord");
    expect(requiresPopelordForDisplayName("Kebab")).toBe(true);
    expect(requiresPopelordForDisplayName(" KEBAB ")).toBe(true);
    expect(requiresPopelordForDisplayName("xxKEBAB")).toBe(false);
    expect(requiresPopelordForDisplayName("  kebab1 ")).toBe(false);
    expect(requiresPopelordForDisplayName("Joel")).toBe(false);
  });
});
