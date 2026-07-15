import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APPROVED_LEGACY_HEAT_CONTENT_IDS,
  LEGACY_HEAT_EFFECT_APPROVALS,
  OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS,
  validateLegacyHeatApprovalManifest,
  validateLegacyHeatContentRecord
} from "../legacy-heat-validation.js";

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

describe("legacy Heat authoring guard", () => {
  it("retains only the 26 effect and other compatibility approval IDs", () => {
    expect(LEGACY_HEAT_EFFECT_APPROVALS).toHaveLength(12);
    expect(OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS).toHaveLength(14);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(26);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has("black-route-fuse")).toBe(false);

    const allIds = [
      ...LEGACY_HEAT_EFFECT_APPROVALS.map((entry) => entry.id),
      ...OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS.map((entry) => entry.id)
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("accepts all 17 canonical characters only after authored Heat omission", () => {
    const files = [
      "black-ledger-agent", "char_bjornis", "char_deepdale", "char_ker_von_ker", "char_kira_dog",
      "char_master_alpha", "char_popelord", "char_rumi", "cinder-monk", "fleet-elder", "grave-engineer",
      "oathbroken-prince", "rift-cartographer", "salvage-warden", "siege-medic", "signal-witch", "void-marshal"
    ];
    for (const id of files) {
      const file = `content/characters/${id}.json`;
      const record = readJson(file) as Record<string, unknown>;
      expect(record.id).toBe(id);
      expect(Object.prototype.hasOwnProperty.call(record, "heat")).toBe(false);
      expect(validateLegacyHeatContentRecord(file, record)).toEqual([]);
    }
  });

  it.each([
    ["content/characters/new-operative.json", { id: "new-operative", heat: 0 }],
    ["content/characters/copied-operative.json", { id: "copied-operative", heat: 0 }],
    ["content/characters/qa-new-operative.json", { id: "qa-new-operative", qaOnly: true, heat: 0 }]
  ])("rejects any authored character Heat with a field-specific error", (file, record) => {
    const message = validateLegacyHeatContentRecord(file, record).join(" ");
    expect(message).toContain(file);
    expect(message).toContain(record.id);
    expect(message).toContain("character.heat");
    expect(message).toContain("must omit Heat");
    expect(message).toContain("createLegacyCharacterCompatibilityState");
  });

  it.each([0, 1, 7, -1, 1.5])("rejects canonical authored character Heat value %s", (heat) => {
    const file = "content/characters/black-ledger-agent.json";
    const record = { ...(readJson(file) as Record<string, unknown>), heat };
    const message = validateLegacyHeatContentRecord(file, record).join(" ");
    expect(message).toContain("black-ledger-agent");
    expect(message).toContain("forbidden compatibility field character.heat");
    expect(message).toContain(JSON.stringify(heat));
  });

  it("keeps effect and other compatibility approvals isolated from authored characters", () => {
    const file = "content/characters/black-ledger-agent.json";
    const character = readJson(file) as Record<string, unknown>;
    for (const mutation of [
      { effect: { type: "gain_heat", amount: 1 } },
      { effect: { type: "lose_heat", amount: 1 } },
      { heatCost: 1 },
      { heatDelta: 1 },
      { heatThreshold: 3 },
      { text: "Gain 1 Heat." },
      { hiddenHeatReserve: 0 }
    ]) {
      expect(validateLegacyHeatContentRecord(file, { ...character, ...mutation }).length).toBeGreaterThan(0);
    }

    const effectApprovedCharacter = { id: "crown-bell-baron", heat: 0, effect: { type: "gain_heat", amount: 1 } };
    expect(validateLegacyHeatContentRecord("content/characters/crown-bell-baron.json", effectApprovedCharacter).join(" ")).toContain("must omit Heat");

    const stableIdCharacter = { id: "heat-sink-prayer", heat: 0 };
    expect(validateLegacyHeatContentRecord("content/characters/heat-sink-prayer.json", stableIdCharacter).join(" ")).toContain("must omit Heat");
  });

  it("accepts only the constructs explicitly approved for legacy effect IDs", () => {
    expect(validateLegacyHeatContentRecord("content/cards/threats/false-route-procession.json", { id: "false-route-procession", effect: { type: "gain_heat", amount: 1 } })).toEqual([]);
    expect(validateLegacyHeatContentRecord("content/cards/threats/false-route-procession.json", { id: "false-route-procession", effect: { type: "lose_heat", amount: 1 } })[0]).toContain("lose_heat");
    expect(validateLegacyHeatContentRecord("content/gear/black-route-fuse.json", { id: "black-route-fuse", text: "Discard after use." })).toEqual([]);
  });

  it.each([
    [{ id: "new-card", effect: { type: "gain_heat", amount: 1 } }, "gain_heat"],
    [{ id: "new-card", heatCost: 1 }, "heatCost"],
    [{ id: "new-card", heatDelta: 1 }, "heatDelta"],
    [{ id: "new-card", heatThreshold: 3 }, "other Heat-shaped field"],
    [{ id: "new-card", cost: { heat: 1 } }, "cost.heat"],
    [{ id: "new-card", text: "Gain 1 Heat." }, "player-facing Heat text"],
    [{ id: "new-card", text: "Pay 1 Risk." }, "player-facing Risk resource text"]
  ])("rejects new legacy authoring with a useful error", (record, construct) => {
    const errors = validateLegacyHeatContentRecord("content/new-card.json", record);
    expect(errors.join(" ")).toContain("new-card");
    expect(errors.join(" ")).toContain(construct);
    expect(errors.join(" ")).toContain("construct-specific");
  });

  it("has no character-default manifest or stale default approvals", () => {
    const source = readFileSync("scripts/legacy-heat-validation.ts", "utf8");
    expect(source).not.toContain("LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS");
    expect(source).not.toContain("LegacyCharacterHeatDefaultApproval");
    expect(validateLegacyHeatApprovalManifest([], { effects: [], other: [] })).toEqual([]);
  });

  it("detects stale effect approvals and approval-class overlap", () => {
    const records = [{ file: "content/cards/threats/approved.json", record: { id: "approved", effect: { type: "gain_heat", amount: 1 } } }];
    expect(validateLegacyHeatApprovalManifest(records, { effects: [{ id: "approved", constructs: ["lose_heat"] }], other: [] }).join(" ")).toContain("approved construct lose_heat is absent");
    expect(validateLegacyHeatApprovalManifest(records, { effects: [{ id: "approved", constructs: ["gain_heat"] }], other: [{ id: "approved", purpose: "test" }] }).join(" ")).toContain("multiple approval classes");
  });

  it("allows current consequence systems", () => {
    expect(validateLegacyHeatContentRecord("content/current.json", { id: "current", effect: { type: "take_wound", amount: 1 }, scars: [], lossPressure: 1, globalEscalation: 1 })).toEqual([]);
  });
});
