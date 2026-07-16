import { describe, expect, it } from "vitest";
import { formatResultDelta, publicResultDeltas } from "../resultDeltas.js";
import type { ResultDelta } from "../types.js";

function delta(overrides: Partial<ResultDelta>): ResultDelta {
  return {
    id: "delta-1",
    type: "salvage",
    label: "Salvage",
    value: 2,
    sign: "gain",
    targetScope: "personal",
    targetSeatId: "seat-1",
    visibility: "public",
    publicText: "Sable gained 2 Salvage.",
    severity: "reward",
    ...overrides
  };
}

describe("result delta formatting", () => {
  it("formats gain deltas as compact positive chips", () => {
    expect(formatResultDelta(delta({ value: 2, sign: "gain", label: "Salvage" }))).toMatchObject({
      label: "+2 Salvage",
      tone: "reward",
      sign: "gain"
    });
  });

  it("formats loss deltas as compact negative chips", () => {
    expect(formatResultDelta(delta({ value: 1, sign: "loss", label: "Wound", severity: "danger" }))).toMatchObject({
      label: "-1 Wound",
      tone: "danger",
      sign: "loss"
    });
  });

  it("formats string-valued item deltas with readable labels", () => {
    expect(formatResultDelta(delta({
      type: "itemBought",
      label: "Item bought",
      value: "Ashlock Carbine",
      publicText: "Sable bought Ashlock Carbine."
    }))).toMatchObject({
      label: "Item bought: Ashlock Carbine"
    });
  });

  it("keeps owner-private rivalry details out of the public formatter", () => {
    const privateDelta = delta({
      type: "agendaProgress",
      label: "Agenda",
      value: 1,
      targetScope: "privateAgenda",
      visibility: "ownerPrivate",
      publicText: "A Rivalry Agenda advanced.",
      privateText: "Private trigger: steal the relic.",
      severity: "private"
    });

    expect(formatResultDelta(privateDelta, { publicOnly: true }).detail).toBe("A Rivalry Agenda advanced.");
    expect(formatResultDelta(privateDelta).detail).toBe("Private trigger: steal the relic.");
    expect(publicResultDeltas([privateDelta])).toEqual([]);
  });

});
