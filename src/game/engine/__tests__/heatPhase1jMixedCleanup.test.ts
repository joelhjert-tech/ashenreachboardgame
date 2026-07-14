import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APPROVED_LEGACY_HEAT_CONTENT_IDS, validateLegacyHeatContentRecord } from "../../../../scripts/legacy-heat-validation.js";

type Entry = {
  id: string;
  file: string;
  branch: string;
  survivingEffects: unknown[];
  retainedCompatibility?: string;
};

const TARGETS: Entry[] = [
  { id: "anomaly-cinder-gate-echo", file: "cards/anomalies/anomaly-cinder-gate-echo.json", branch: "resolveEffect.effects", survivingEffects: [{ type: "advance_scenario", progressKey: "gateEchoesPinned", amount: 1, summary: "A Cinder Gate echo was pinned for the final confrontation." }] },
  { id: "anomaly-red-suture-field", file: "cards/anomalies/anomaly-red-suture-field.json", branch: "resolveEffect.effects", survivingEffects: [{ type: "gain_note", text: "Red Suture Field opened: route crews can pass once." }] },
  { id: "anomaly-saint-static-aperture", file: "cards/anomalies/anomaly-saint-static-aperture.json", branch: "resolveEffect.effects", survivingEffects: [{ type: "advance_scenario", progressKey: "sealRestorationMarks", amount: 1, summary: "The aperture stains the Broken Seal with usable signal." }] },
  { id: "anomaly-saltglass-fata-morgana", file: "cards/anomalies/anomaly-saltglass-fata-morgana.json", branch: "resolveEffect.effects", survivingEffects: [{ type: "gain_gear", gearId: "blackstar-ampoule" }] },
  { id: "anomaly-scar-tide-lattice", file: "cards/anomalies/anomaly-scar-tide-lattice.json", branch: "resolveEffect.effects", survivingEffects: [{ type: "heal_wound", amount: 1 }, { type: "gain_note", text: "Scar-tide lattice translated into a living route mark." }] },
  { id: "anomaly-throne-shadow-jury", file: "cards/anomalies/anomaly-throne-shadow-jury.json", branch: "resolveEffect.effects", survivingEffects: [{ type: "advance_scenario", progressKey: "throneVerdicts", amount: 1, summary: "A throne-shadow verdict was banked for the endgame." }] },
  { id: "anomaly-webglass-stutter", file: "cards/anomalies/anomaly-webglass-stutter.json", branch: "resolveEffect.effects", survivingEffects: [{ type: "gain_follower", followerId: "red-march-guide" }] },
  { id: "artifact-ember-burden-idol", file: "cards/artifacts/artifact-ember-burden-idol.json", branch: "resolveEffect.effects", survivingEffects: [{ type: "gain_trophy", amount: 1 }, { type: "gain_note", text: "Ember Burden Idol: valuable, heavy, and politically loud." }] },
  { id: "artifact-red-march-warbell", file: "cards/artifacts/artifact-red-march-warbell.json", branch: "resolveEffect.effects", survivingEffects: [{ type: "gain_gear", gearId: "red-march-warbell" }] },
  { id: "artifact-throne-crown-fragment", file: "cards/artifacts/artifact-throne-crown-fragment.json", branch: "resolveEffect.effects", survivingEffects: [{ type: "advance_scenario", progressKey: "sealRestorationMarks", amount: 1, summary: "A Crownfall artifact advances the Broken Seal." }, { type: "gain_note", text: "Throne-Crown burden: valuable, visible, and hard to move quietly." }] },
  { id: "cartel-ledger-skim", file: "cards/contracts/cartel-ledger-skim.json", branch: "reward.effects", survivingEffects: [{ type: "gain_trophy", amount: 1 }] },
  { id: "bellwire-snare", file: "cards/threats/bellwire-snare.json", branch: "failEffect.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "breach-lens-overload", file: "cards/threats/breach-lens-overload.json", branch: "failEffect.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "cinder-veil-stalker", file: "cards/threats/cinder-veil-stalker.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "emberwatch-sparkfall", file: "cards/threats/emberwatch-sparkfall.json", branch: "failEffect.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "gate-choir-executioner", file: "cards/threats/gate-choir-executioner.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 2 }] },
  { id: "glass-mire-stalker", file: "cards/threats/glass-mire-stalker.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "hymn-scarred-zealot", file: "cards/threats/hymn-scarred-zealot.json", branch: "defeatReward.effects", survivingEffects: [{ type: "gain_note", text: "You silenced the zealot before the full formation answered." }], retainedCompatibility: "separate Heat-only loss branch" },
  { id: "iron-lung-grenadier", file: "cards/threats/iron-lung-grenadier.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 1 }], retainedCompatibility: "stable Heat-shaped reveal effect key" },
  { id: "iron-synod-chirurgeon", file: "cards/threats/iron-synod-chirurgeon.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 2 }] },
  { id: "lalla-bubu-crownling", file: "cards/threats/lalla-bubu-crownling.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "mirror-lord-envoy", file: "cards/threats/mirror-lord-envoy.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 1 }], retainedCompatibility: "stable Heat-shaped combat effect key" },
  { id: "mirror-rot-interference", file: "cards/threats/mirror-rot-interference.json", branch: "failEffect.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "pale-cartel-shakedown", file: "cards/threats/pale-cartel-shakedown.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "reliquary-judge", file: "cards/threats/reliquary-judge.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 1 }], retainedCompatibility: "stable Heat-shaped reveal effect key" },
  { id: "saint-of-ashes-echo", file: "cards/threats/saint-of-ashes-echo.json", branch: "failEffect.effects", survivingEffects: [{ type: "gain_scar", scarId: "scar-wound-1" }] },
  { id: "shardvine-ambushers", file: "cards/threats/shardvine-ambushers.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "shardwind-front", file: "cards/threats/shardwind-front.json", branch: "failEffect.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "starless-taxation", file: "cards/threats/starless-taxation.json", branch: "failEffect.effects", survivingEffects: [{ type: "gain_scar", scarId: "scar-wound-3" }] },
  { id: "static-censer-acolyte", file: "cards/threats/static-censer-acolyte.json", branch: "woundOnLoss.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "suture-storm", file: "cards/threats/suture-storm.json", branch: "failEffect.effects", survivingEffects: [{ type: "take_wound", amount: 1 }, { type: "forcedDisplacement", direction: "counterclockwise", distance: 1, sameRing: true, fallbackEffect: { type: "take_wound", amount: 1 }, failureStillCounts: true }] },
  { id: "webglass-echo-trap", file: "cards/threats/webglass-echo-trap.json", branch: "failEffect.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "webglass-snarefield", file: "cards/threats/webglass-snarefield.json", branch: "failEffect.effects", survivingEffects: [{ type: "take_wound", amount: 1 }] },
  { id: "cinder-surgeon", file: "followers/cinder-surgeon.json", branch: "activeEffect.effects", survivingEffects: [{ type: "heal_wound", amount: 1 }] }
];

function read(entry: Entry): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), "content", entry.file), "utf8")) as Record<string, unknown>;
}

function branch(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], record);
}

describe("Phase 1J mixed Heat clause cleanup", () => {
  it("contains exactly the 34 branch-level safe targets", () => {
    expect(TARGETS).toHaveLength(34);
    expect(new Set(TARGETS.map((entry) => entry.id)).size).toBe(34);
  });

  it.each(TARGETS)("preserves $id sibling values and order", (entry) => {
    const record = read(entry);
    expect(record.id).toBe(entry.id);
    expect(branch(record, entry.branch)).toEqual(entry.survivingEffects);
    expect(JSON.stringify(branch(record, entry.branch))).not.toMatch(/gain_heat|gain_heat_all|lose_heat/);
    expect(entry.survivingEffects.length).toBeGreaterThan(0);
  });

  it("removes only IDs with no remaining Heat construct from the allowlist", () => {
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(36);
    for (const entry of TARGETS) {
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(entry.id)).toBe(Boolean(entry.retainedCompatibility));
      expect(validateLegacyHeatContentRecord(entry.file, read(entry))).toEqual([]);
    }
  });

  it("preserves the deferred and compatibility boundaries", () => {
    const peddlers = JSON.parse(readFileSync(join(process.cwd(), "content/cards/threats/rust-choir-peddlers.json"), "utf8"));
    expect(JSON.stringify(peddlers)).toContain('"mode":"optional"');
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has("rust-choir-peddlers")).toBe(false);
    expect(validateLegacyHeatContentRecord("new.json", { id: "new-heat", failEffect: { type: "gain_heat", amount: 1 } })[0]).toMatch(/blocked legacy Heat construct/);
  });
});
