import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APPROVED_LEGACY_HEAT_CONTENT_IDS,
  LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS,
  LEGACY_HEAT_EFFECT_APPROVALS,
  OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS,
  validateLegacyHeatApprovalManifest,
  validateLegacyHeatContentRecord,
  type LegacyCharacterHeatDefaultApproval
} from "../legacy-heat-validation.js";

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

describe("legacy Heat authoring guard", () => {
  it("separates the 71-ID compatibility boundary into disjoint approval classes", () => {
    expect(LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS).toHaveLength(17);
    expect(LEGACY_HEAT_EFFECT_APPROVALS).toHaveLength(40);
    expect(OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS).toHaveLength(14);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(71);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has("black-route-fuse")).toBe(false);

    const allIds = [
      ...LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS.map((entry) => entry.id),
      ...LEGACY_HEAT_EFFECT_APPROVALS.map((entry) => entry.id),
      ...OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS.map((entry) => entry.id)
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("accepts all 17 canonical character defaults unchanged at exactly zero", () => {
    for (const approval of LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS) {
      const record = readJson(approval.file) as { id: string; heat: number };
      expect(record.id).toBe(approval.id);
      expect(record.heat).toBe(0);
      expect(Number.isInteger(record.heat)).toBe(true);
      expect(validateLegacyHeatContentRecord(approval.file, record)).toEqual([]);
    }
  });

  it.each([
    ["content/characters/new-operative.json", { id: "new-operative", heat: 0 }],
    ["content/characters/copied-operative.json", { id: "copied-operative", heat: 0 }],
    ["content/characters/qa-new-operative.json", { id: "qa-new-operative", qaOnly: true, heat: 0 }]
  ])("rejects an unapproved character default with a field-specific error", (file, record) => {
    const message = validateLegacyHeatContentRecord(file, record).join(" ");
    expect(message).toContain(file);
    expect(message).toContain(record.id);
    expect(message).toContain("character.heat");
    expect(message).toContain("LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS");
    expect(message).toContain("New characters must not introduce Heat defaults");
  });

  it.each([1, 7, -1, 1.5])("rejects approved character Heat value %s", (heat) => {
    const approval = LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS[0]!;
    const record = { ...(readJson(approval.file) as Record<string, unknown>), heat };
    const message = validateLegacyHeatContentRecord(approval.file, record).join(" ");
    expect(message).toContain(approval.id);
    expect(message).toContain("integer 0");
    expect(message).toContain(JSON.stringify(heat));
  });

  it("keeps effect and default approvals isolated", () => {
    const approvedCharacter = LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS[0]!;
    const character = readJson(approvedCharacter.file) as Record<string, unknown>;
    for (const mutation of [
      { effect: { type: "gain_heat", amount: 1 } },
      { effect: { type: "lose_heat", amount: 1 } },
      { heatCost: 1 },
      { heatDelta: 1 },
      { heatThreshold: 3 },
      { text: "Gain 1 Heat." },
      { hiddenHeatReserve: 0 }
    ]) {
      expect(validateLegacyHeatContentRecord(approvedCharacter.file, { ...character, ...mutation }).length).toBeGreaterThan(0);
    }

    const effectApprovedCharacter = { id: "ash-cinder-runt", heat: 0, effect: { type: "gain_heat", amount: 1 } };
    expect(validateLegacyHeatContentRecord("content/characters/ash-cinder-runt.json", effectApprovedCharacter).join(" ")).toContain("not approved in LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS");

    const stableIdCharacter = { id: "heat-sink-prayer", heat: 0 };
    expect(validateLegacyHeatContentRecord("content/characters/heat-sink-prayer.json", stableIdCharacter).join(" ")).toContain("not approved in LEGACY_CHARACTER_HEAT_DEFAULT_APPROVALS");
  });

  it("accepts only the constructs explicitly approved for legacy effect IDs", () => {
    expect(validateLegacyHeatContentRecord("content/cards/threats/ash-cinder-runt.json", { id: "ash-cinder-runt", effect: { type: "gain_heat", amount: 1 } })).toEqual([]);
    expect(validateLegacyHeatContentRecord("content/cards/threats/ash-cinder-runt.json", { id: "ash-cinder-runt", effect: { type: "lose_heat", amount: 1 } })[0]).toContain("lose_heat");
    expect(validateLegacyHeatContentRecord("content/gear/black-route-fuse.json", { id: "black-route-fuse", text: "Discard after use." })).toEqual([]);
  });

  it.each([
    [{ id: "new-card", effect: { type: "gain_heat", amount: 1 } }, "gain_heat"],
    [{ id: "new-card", heatCost: 1 }, "heatCost"],
    [{ id: "new-card", heatDelta: 1 }, "heatDelta"],
    [{ id: "new-card", heatThreshold: 3 }, "heatThreshold"],
    [{ id: "new-card", cost: { heat: 1 } }, "cost.heat"],
    [{ id: "new-card", text: "Gain 1 Heat." }, "player-facing Heat text"],
    [{ id: "new-card", text: "Pay 1 Risk." }, "player-facing Risk resource text"]
  ])("rejects new legacy authoring with a useful error", (record, construct) => {
    const errors = validateLegacyHeatContentRecord("content/new-card.json", record);
    expect(errors.join(" ")).toContain("new-card");
    expect(errors.join(" ")).toContain(construct);
    expect(errors.join(" ")).toContain("construct-specific");
  });

  it("detects stale, malformed, duplicate, and wrong-type default approvals", () => {
    const approval: LegacyCharacterHeatDefaultApproval = { id: "approved", file: "content/characters/approved.json", field: "heat", value: 0 };
    const manifests = { effects: [], other: [] } as const;

    expect(validateLegacyHeatApprovalManifest([], { ...manifests, defaults: [approval] }).join(" ")).toContain("found 0");
    expect(validateLegacyHeatApprovalManifest([{ file: approval.file, record: { id: "approved" } }], { ...manifests, defaults: [approval] }).join(" ")).toContain("field heat is missing");
    expect(validateLegacyHeatApprovalManifest([{ file: approval.file, record: { id: "approved", heat: 1 } }], { ...manifests, defaults: [approval] }).join(" ")).toContain("found 1");
    expect(validateLegacyHeatApprovalManifest([{ file: approval.file, record: { id: "approved", heat: 0 } }], { ...manifests, defaults: [approval, approval] }).join(" ")).toContain("duplicated");
    expect(validateLegacyHeatApprovalManifest([{ file: "content/cards/threats/approved.json", record: { id: "approved", heat: 0 } }], { ...manifests, defaults: [approval] }).join(" ")).toContain("not canonical character path");
  });

  it("detects stale effect approvals and approval-class overlap", () => {
    const records = [{ file: "content/cards/threats/approved.json", record: { id: "approved", effect: { type: "gain_heat", amount: 1 } } }];
    expect(validateLegacyHeatApprovalManifest(records, { effects: [{ id: "approved", constructs: ["lose_heat"] }], defaults: [], other: [] }).join(" ")).toContain("approved construct lose_heat is absent");
    expect(validateLegacyHeatApprovalManifest(records, { effects: [{ id: "approved", constructs: ["gain_heat"] }], defaults: [], other: [{ id: "approved", purpose: "test" }] }).join(" ")).toContain("multiple approval classes");
  });

  it("allows current consequence systems", () => {
    expect(validateLegacyHeatContentRecord("content/current.json", { id: "current", effect: { type: "take_wound", amount: 1 }, scars: [], lossPressure: 1, globalEscalation: 1 })).toEqual([]);
  });
});
