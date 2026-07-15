export const APPROVED_FORCED_DISPLACEMENT_SOURCE_IDS = new Set([
  "breach-halberd",
  "mudglass-sinkhole",
  "suture-storm",
  "route-splice",
  "false-route-procession"
]);

export function validateForcedDisplacementContentRecord(file: string, record: unknown): string[] {
  if (!record || typeof record !== "object") return [];
  const id = "id" in record && typeof record.id === "string" ? record.id : "unknown";
  const serialized = JSON.stringify(record);
  if (!serialized.includes('"type":"forcedDisplacement"') && !serialized.includes('"type":"ownerSelectedForcedDisplacement"')) return [];
  if (!APPROVED_FORCED_DISPLACEMENT_SOURCE_IDS.has(id)) {
    return [`${file} (${id}) introduces an unapproved forced-displacement source. Only explicitly approved typed sources may open the authoritative displacement lifecycle.`];
  }
  return [];
}
