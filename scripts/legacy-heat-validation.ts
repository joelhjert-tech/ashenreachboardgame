export type LegacyHeatConstruct =
  | "gain_heat"
  | "gain_heat_all"
  | "lose_heat"
  | "heatCost"
  | "heatDelta"
  | "cost.heat"
  | "player-facing Heat text"
  | "player-facing Risk resource text"
  | "other Heat-shaped field";

export type LegacyHeatContentRecord = {
  file: string;
  record: unknown;
};

export type LegacyHeatEffectApproval = {
  id: string;
  constructs: readonly LegacyHeatConstruct[];
};

export type OtherLegacyHeatCompatibilityApproval = {
  id: string;
  purpose: string;
};

// Phase 1A compatibility effects. Approval is construct-specific: it does not
// authorize character defaults, costs, thresholds, deltas, or arbitrary text.
export const LEGACY_HEAT_EFFECT_APPROVALS: readonly LegacyHeatEffectApproval[] = [
  { id: "anomaly-cinder-mirage-lane", constructs: ["player-facing Heat text", "player-facing Risk resource text"] },
  { id: "artifact-cinder-suture-kit", constructs: ["player-facing Heat text"] },
  { id: "crownless-advocate", constructs: ["lose_heat"] },
  { id: "escalation-blackstar-hunger", constructs: ["gain_heat_all"] },
  { id: "escalation-choir-feedback", constructs: ["gain_heat_all"] },
  { id: "escalation-marrow-surgery-debt", constructs: ["gain_heat"] },
  { id: "escalation-saltwind-lockdown", constructs: ["gain_heat_all"] },
  { id: "memory-tax-gate", constructs: ["gain_heat"] },
  { id: "saltflat-bone-reader", constructs: ["lose_heat"] }
];

// Compatibility IDs that remain tracked separately from effect/default
// authorization. Their presence grants no permission to author a Heat field.
export const OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS: readonly OtherLegacyHeatCompatibilityApproval[] = [
  { id: "artifact-fandiablos", purpose: "stable Artifact/follower compatibility pair" },
  { id: "artifact-heat-sink-prayer", purpose: "stable serialized Scar-Sink Prayer card ID" },
  { id: "black-lantern-broker", purpose: "legacy follower loss-condition value" },
  { id: "choir-defector", purpose: "legacy follower loss-condition value" },
  { id: "fandiablos", purpose: "stable Artifact/follower compatibility pair" },
  { id: "gate-saint-acolyte", purpose: "legacy follower loss-condition value" },
  { id: "grave-lattice-reclaimer", purpose: "stable Heat-shaped threat effect key" },
  { id: "heat-sink-prayer", purpose: "stable serialized Scar-Sink Prayer gear ID" },
  { id: "iron-lung-grenadier", purpose: "stable Heat-shaped threat effect key" },
  { id: "lucy-hell-puppy", purpose: "legacy follower resource tag" },
  { id: "mirror-lord-envoy", purpose: "stable Heat-shaped threat effect key" },
  { id: "pale-marshal", purpose: "stable Heat-shaped threat effect key" },
  { id: "reliquary-judge", purpose: "stable Heat-shaped threat effect key" },
  { id: "yard-rivet-brute", purpose: "transitional explicit compatibility ID retained from Phase 1A" }
];

const effectApprovalsById = new Map(LEGACY_HEAT_EFFECT_APPROVALS.map((approval) => [approval.id, new Set(approval.constructs)]));
// Compatibility export retained for existing count/inclusion tests. Validation
// uses the separated manifests above and never treats this union as authority.
export const APPROVED_LEGACY_HEAT_CONTENT_IDS = new Set([
  ...LEGACY_HEAT_EFFECT_APPROVALS.map((approval) => approval.id),
  ...OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS.map((approval) => approval.id)
]);

export const APPROVED_AUTOMATIC_SALVAGE_LOSS_IDS = new Set([
  "escalation-crownfall-writ", "ash-rat-skitter", "bridge-toll-runt", "crown-bell-baron", "glass-tick-cloud", "gutter-bell-mite", "locked-vault", "marrow-tax-auditors", "pale-contract-collector", "pale-toll-enforcer", "rust-mote-drone", "soot-stained-cutpurse", "toll-scrip-urchins"
]);

const visibleTextKeys = new Set(["text", "activeText", "passiveText", "penalty", "trigger", "summary", "description"]);

export function validateLegacyHeatContentRecord(file: string, record: unknown): string[] {
  if (!isRecord(record)) return [];
  const id = typeof record.id === "string" ? record.id : "<missing-id>";
  const normalizedFile = normalizeFile(file);
  const contentType = isCharacterFile(normalizedFile) ? "character" : typeof record.type === "string" ? record.type : "content";
  const errors: string[] = [];

  if (JSON.stringify(record).includes('"type":"lose_salvage"') && !APPROVED_AUTOMATIC_SALVAGE_LOSS_IDS.has(id)) {
    errors.push(`${file} (${id}, ${contentType}) uses lose_salvage outside the approved automatic floor-zero consequence set. Payments, tolls, fees, purchases, and choices require authoritative affordability or choice handling.`);
  }

  const constructs = findLegacyHeatConstructs(record);
  const approvedEffects = effectApprovalsById.get(id) ?? new Set<LegacyHeatConstruct>();

  if (Object.prototype.hasOwnProperty.call(record, "heat")) {
    const actual = record.heat;
    errors.push(`${file} (${id}, ${contentType}) authors forbidden compatibility field character.heat with value ${formatValue(actual)}. Canonical authored characters must omit Heat; runtime character.heat is supplied only by createLegacyCharacterCompatibilityState().`);
  }

  for (const construct of constructs) {
    if (!approvedEffects.has(construct)) {
      errors.push(`${file} (${id}, ${contentType}) introduces blocked legacy Heat construct ${construct}. This requires a construct-specific legacy Heat-effect approval; character-default, stable-ID, and threshold approvals do not authorize it.`);
    }
  }

  return errors;
}

export function validateLegacyHeatApprovalManifest(
  records: readonly LegacyHeatContentRecord[],
  manifests: {
    effects?: readonly LegacyHeatEffectApproval[];
    other?: readonly OtherLegacyHeatCompatibilityApproval[];
  } = {}
): string[] {
  const effects = manifests.effects ?? LEGACY_HEAT_EFFECT_APPROVALS;
  const other = manifests.other ?? OTHER_LEGACY_HEAT_COMPATIBILITY_APPROVALS;
  const errors: string[] = [];
  const byId = new Map<string, LegacyHeatContentRecord[]>();

  for (const entry of records) {
    if (!isRecord(entry.record) || typeof entry.record.id !== "string") continue;
    byId.set(entry.record.id, [...(byId.get(entry.record.id) ?? []), entry]);
  }

  errors.push(...duplicateApprovalErrors("Heat-effect", effects.map((entry) => entry.id)));
  errors.push(...duplicateApprovalErrors("other compatibility", other.map((entry) => entry.id)));

  const classMembership = new Map<string, string[]>();
  for (const [label, ids] of [["Heat-effect", effects.map((entry) => entry.id)], ["other compatibility", other.map((entry) => entry.id)]] as const) {
    for (const id of ids) classMembership.set(id, [...(classMembership.get(id) ?? []), label]);
  }
  for (const [id, classes] of classMembership) {
    if (classes.length > 1) errors.push(`Legacy Heat approval ${id} appears in multiple approval classes (${classes.join(", ")}). Effect, default, and stable compatibility approvals must remain isolated.`);
  }

  for (const approval of effects) {
    const matches = byId.get(approval.id) ?? [];
    if (matches.length !== 1) {
      errors.push(`Heat-effect approval ${approval.id} expected exactly one content record; found ${matches.length}. Remove stale or duplicate approval data.`);
      continue;
    }
    const found = new Set(findLegacyHeatConstructs(matches[0]!.record));
    for (const construct of approval.constructs) if (!found.has(construct)) errors.push(`Heat-effect approval ${approval.id} is stale: approved construct ${construct} is absent from ${matches[0]!.file}.`);
    if (isCharacterFile(normalizeFile(matches[0]!.file))) errors.push(`Heat-effect approval ${approval.id} points to a character record. Character defaults require the separate field-level manifest.`);
  }

  for (const approval of other) {
    const matches = byId.get(approval.id) ?? [];
    if (matches.length !== 1) errors.push(`Other compatibility approval ${approval.id} expected exactly one content record; found ${matches.length}. Purpose: ${approval.purpose}.`);
    else if (isCharacterFile(normalizeFile(matches[0]!.file))) errors.push(`Other compatibility approval ${approval.id} points to a character record and cannot authorize character.heat.`);
  }

  return errors;
}

function findLegacyHeatConstructs(value: unknown): LegacyHeatConstruct[] {
  const found = new Set<LegacyHeatConstruct>();
  const visit = (current: unknown, parentKey = ""): void => {
    if (Array.isArray(current)) {
      current.forEach((entry) => visit(entry, parentKey));
      return;
    }
    if (!isRecord(current)) return;

    if (current.type === "gain_heat" || current.type === "gain_heat_all" || current.type === "lose_heat") found.add(current.type);
    for (const [key, nested] of Object.entries(current)) {
      if (key === "heatCost") found.add("heatCost");
      else if (key === "heatDelta") found.add("heatDelta");
      else if (key === "heat" && parentKey === "cost") found.add("cost.heat");
      else if (key === "heat") {
        // Canonical character.heat and cost.heat are validated separately.
      }
      else if (/heat/i.test(key)) found.add("other Heat-shaped field");

      if (visibleTextKeys.has(key) && typeof nested === "string" && /\bHeat\b/i.test(nested)) found.add("player-facing Heat text");
      if (visibleTextKeys.has(key) && typeof nested === "string" && /\bRisk(?: cost)?\b/i.test(nested)) found.add("player-facing Risk resource text");
      visit(nested, key);
    }
  };
  visit(value);
  return [...found];
}

function duplicateApprovalErrors(label: string, ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${label} approval ${id} is duplicated. Approval manifests must contain unique IDs.`);
    seen.add(id);
  }
  return errors;
}

function normalizeFile(file: string): string {
  return file.replaceAll("\\", "/").replace(/^.*?content\//, "content/");
}

function isCharacterFile(file: string): boolean {
  return file.startsWith("content/characters/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
