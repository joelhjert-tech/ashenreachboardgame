export const RIFT_ANCHOR_SPIKE_ELIGIBLE_SOURCE_IDS = new Set([
  "breach-halberd",
  "mudglass-sinkhole",
  "suture-storm",
  "route-splice"
]);

export function canRiftAnchorSpikeSuppress(sourceType: string, sourceId: string): boolean {
  return sourceType === "threat" && RIFT_ANCHOR_SPIKE_ELIGIBLE_SOURCE_IDS.has(sourceId);
}
