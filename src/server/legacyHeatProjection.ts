const REMOVED_LEGACY_HEAT_VALUE = Symbol("removed legacy Heat projection value");

const LEGACY_HEAT_KEYS = new Set([
  "heat",
  "heatcost",
  "heatdelta",
  "heatmodifier",
  "heatstate",
  "heatthreshold",
  "operativeheat",
  "playerheat"
]);

const LEGACY_HEAT_EFFECT_TYPES = new Set([
  "clear_heat",
  "gain_heat",
  "gain_heat_all",
  "lose_heat",
  "set_heat"
]);

/**
 * Final server-side compatibility boundary for phone and TV payloads.
 * Stable serialized IDs such as heat-sink-prayer remain valid values; only
 * legacy resource fields, effect records, tags, and result rows are removed.
 */
export function stripLegacyHeatProjection<T>(value: T): T {
  const stripped = stripValue(value);
  return (stripped === REMOVED_LEGACY_HEAT_VALUE ? null : stripped) as T;
}

function stripValue(value: unknown): unknown | typeof REMOVED_LEGACY_HEAT_VALUE {
  if (Array.isArray(value)) {
    return value
      .map(stripValue)
      .filter((entry) => entry !== REMOVED_LEGACY_HEAT_VALUE);
  }

  if (!value || typeof value !== "object") {
    return typeof value === "string" && value.toLowerCase() === "heat"
      ? REMOVED_LEGACY_HEAT_VALUE
      : value;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.type === "string" && (record.type === "heat" || LEGACY_HEAT_EFFECT_TYPES.has(record.type))) {
    return REMOVED_LEGACY_HEAT_VALUE;
  }

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(record)) {
    if (LEGACY_HEAT_KEYS.has(key.toLowerCase())) continue;
    if (key === "lossCondition" && nested === "heat") continue;
    const stripped = stripValue(nested);
    if (stripped !== REMOVED_LEGACY_HEAT_VALUE) output[key] = stripped;
  }
  return output;
}
