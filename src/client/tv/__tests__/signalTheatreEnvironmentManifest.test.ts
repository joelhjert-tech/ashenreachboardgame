import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BOARD_SPACES } from "../../../game/data/boardSpaces.js";
import {
  getSignalTheatreEnvironment,
  signalTheatreEnvironments
} from "../signalTheatreEnvironmentManifest.js";

describe("Signal Theatre environment manifest", () => {
  it("maps every canonical board sector to one original environment path", () => {
    expect(signalTheatreEnvironments).toHaveLength(49);
    expect(new Set(signalTheatreEnvironments.map((entry) => entry.sectorId)).size).toBe(49);
    expect(signalTheatreEnvironments.map((entry) => entry.sectorId)).toEqual(
      BOARD_SPACES.map((sector) => sector.id)
    );
    expect(signalTheatreEnvironments.every((entry) =>
      entry.path === `/assets/riftfall/environments/signal-theatre/sectors/${entry.sectorId}.png`
    )).toBe(true);
  });

  it("does not resolve through legacy board tile art", () => {
    expect(signalTheatreEnvironments.every((entry) => !entry.path.includes("/assets/map/tiles/"))).toBe(true);
    expect(getSignalTheatreEnvironment("center_cinder_gate")?.tier).toBe("center");
  });

  it("has a generated runtime file for every registered sector", () => {
    const missing = signalTheatreEnvironments.filter((entry) =>
      !existsSync(resolve("public", entry.path.replace(/^\/assets\//, "assets/")))
    );
    expect(missing.map((entry) => entry.sectorId)).toEqual([]);
  });
});
