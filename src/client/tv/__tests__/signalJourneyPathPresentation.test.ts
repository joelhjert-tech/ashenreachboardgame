import { describe, expect, it } from "vitest";
import {
  getSignalJourneyPathModel,
  getSignalJourneyPoint
} from "../signalJourneyPathPresentation.js";

describe("Signal Theatre journey paths", () => {
  const route = [
    "ashwake-crossing",
    "outer_waymarket",
    "outer_oathpost",
    "middle_guardian_span",
    "inner_cinder_lattice",
    "center_cinder_gate"
  ];

  it("builds a deterministic non-straight path for every authoritative sector", () => {
    for (const sectorId of route) {
      const first = getSignalJourneyPathModel(route, sectorId, false);
      const second = getSignalJourneyPathModel(route, sectorId, false);
      expect(first).toEqual(second);
      expect(first.path).toContain("L");
      expect(first.sampledPoints.length).toBeGreaterThan(first.points.length);
      expect(new Set(first.points.map((point) => point.y)).size).toBeGreaterThan(2);
    }
  });

  it("keeps one path geometry while ring-crossing styling changes", () => {
    const stable = getSignalJourneyPathModel(route, "ashwake-crossing", false);
    const crossing = getSignalJourneyPathModel(route, "middle_guardian-span", true);
    expect(crossing).toEqual(stable);
    expect(route).toEqual([
      "ashwake-crossing",
      "outer_waymarket",
      "outer_oathpost",
      "middle_guardian_span",
      "inner_cinder_lattice",
      "center_cinder_gate"
    ]);
  });

  it("keeps marker points bounded and ends at the final node", () => {
    const model = getSignalJourneyPathModel(route, route[0]!, false);
    for (let step = 0; step <= 20; step += 1) {
      const point = getSignalJourneyPoint(model, step / 20);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1000);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(220);
    }
    expect(getSignalJourneyPoint(model, 1)).toEqual(model.points.at(-1));
  });

  it("places every stop and interpolated marker on the rendered sampled path", () => {
    const model = getSignalJourneyPathModel(route, route[0]!, false);
    for (let step = 0; step <= 6; step += 1) {
      const point = getSignalJourneyPoint(model, step / 6);
      const liesOnSampleSegment = model.sampledPoints.slice(1).some((to, index) => {
        const from = model.sampledPoints[index]!;
        const segmentLength = Math.hypot(to.x - from.x, to.y - from.y);
        const splitLength = Math.hypot(point.x - from.x, point.y - from.y)
          + Math.hypot(to.x - point.x, to.y - point.y);
        return Math.abs(splitLength - segmentLength) < 0.001;
      });
      expect(liesOnSampleSegment).toBe(true);
    }
  });
});
