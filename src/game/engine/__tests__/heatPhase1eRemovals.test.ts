import { describe, expect, it } from "vitest";
import { loadAnomalyCards } from "../../content/anomalies.js";
import { loadEscalationCards } from "../../content/escalations.js";
import { APPROVED_LEGACY_HEAT_CONTENT_IDS, validateLegacyHeatContentRecord } from "../../../../scripts/legacy-heat-validation.js";

const REMOVAL_IDS = [
  "anomaly-ashfall-murmur",
  "anomaly-glassmere",
  "escalation-ashfall-curfew",
  "escalation-ridge-suture",
  "escalation-webglass-afterimage"
] as const;

describe("Phase 1E Heat-only clause removals", () => {
  it("keeps the implementation population at exactly the five approved stable IDs", () => {
    expect(REMOVAL_IDS).toHaveLength(5);
    expect(new Set(REMOVAL_IDS).size).toBe(5);
    expect([...loadAnomalyCards().keys(), ...loadEscalationCards().keys()]).toEqual(expect.arrayContaining([...REMOVAL_IDS]));
  });

  it("resolves the two anomaly outcomes as their existing note-only result", () => {
    const anomalies = loadAnomalyCards();
    for (const id of REMOVAL_IDS.slice(0, 2)) {
      const card = anomalies.get(id)!;
      expect(card.id).toBe(id);
      expect(card.resolveEffect).toEqual(expect.objectContaining({ type: "gain_note" }));
      expect(JSON.stringify(card)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);
      expect(card.resolutionSummary).not.toMatch(/cool(?:ed|ing)?|Heat|Risk/i);
    }
  });

  it("preserves escalation reduction while removing only the obsolete Heat member", () => {
    const escalations = loadEscalationCards();
    for (const id of REMOVAL_IDS.slice(2)) {
      const card = escalations.get(id)!;
      expect(card.id).toBe(id);
      expect(card.resolveEffect).toEqual(expect.objectContaining({ type: "gain_note" }));
      expect(card.escalationDelta).toBe(-1);
      expect(JSON.stringify(card)).not.toMatch(/gain_heat|gain_heat_all|lose_heat|\bHeat\b|\bRisk\b/i);
      expect(card.resolutionSummary).not.toMatch(/cool(?:ed|ing)?|Heat|Risk/i);
    }
  });

  it("removes only completed IDs from the explicit compatibility boundary", () => {
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.size).toBe(31);
    for (const id of REMOVAL_IDS) {
      expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has(id)).toBe(false);
    }
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has("anomaly-bellrain-inversion")).toBe(false);
    expect(APPROVED_LEGACY_HEAT_CONTENT_IDS.has("escalation-blackstar-hunger")).toBe(true);
    expect(validateLegacyHeatContentRecord("new.json", { id: "new-heat", type: "gain_heat", amount: 1 })[0]).toMatch(/blocked legacy Heat construct/);
  });
});
