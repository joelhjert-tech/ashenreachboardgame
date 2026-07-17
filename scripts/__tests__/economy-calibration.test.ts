import { describe, expect, it } from "vitest";
import { ECONOMY_CALIBRATION_PROFILES, ECONOMY_CALIBRATION_SEEDS, runEconomyCalibration } from "../economy-calibration-model.js";

describe("canonical economy calibration model", () => {
  const result = runEconomyCalibration();

  it("runs five deterministic seeds across all nine requested profiles", () => {
    expect(result.evidenceKind).toBe("automated-calibration-not-human-playtest");
    expect(result.runs).toHaveLength(ECONOMY_CALIBRATION_PROFILES.length * ECONOMY_CALIBRATION_SEEDS.length);
    expect(new Set(result.runs.map((run) => run.profileId))).toEqual(new Set(ECONOMY_CALIBRATION_PROFILES.map((profile) => profile.id)));
  });

  it("preserves the three-resource boundary and never produces a negative balance", () => {
    for (const run of result.runs) {
      for (const operative of run.operatives) {
        expect(operative.final.salvage).toBeGreaterThanOrEqual(0);
        expect(operative.final.trophies).toBeGreaterThanOrEqual(0);
        expect(operative.final.completedContracts).toBeGreaterThanOrEqual(0);
      }
      for (const event of run.ledger) {
        expect(event.amountAfter).toBeGreaterThanOrEqual(0);
        if (event.eventType === "trophy_spend") expect(event.resource).toBe("trophies");
        if (event.eventType === "completed_contract_spend") {
          expect(event.resource).toBe("completedContracts");
          expect(event.delta).toBe(-3);
        }
        if (event.eventType === "artifact_selected") expect(event.resource).toBe("artifacts");
      }
    }
  });

  it("starts solo at four Salvage and multiplayer at three", () => {
    for (const run of result.runs) {
      const starting = run.ledger.filter((event) => event.sourceStableId === "session-start");
      expect(starting).toHaveLength(run.operatives.length);
      expect(starting.every((event) => event.amountAfter === (run.mode === "solo" ? 4 : 3))).toBe(true);
    }
  });

  it("is repeatable for the same canonical content and seed matrix", () => {
    expect(runEconomyCalibration()).toEqual(result);
  }, 15_000);
});
