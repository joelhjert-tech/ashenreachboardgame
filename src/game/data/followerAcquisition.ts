export type FollowerAcquisitionTier = "common" | "standard" | "rare" | "qa-only";
export type FollowerAcquisitionMode = "fixed" | "random-artifact" | "existing-content" | "qa-loadout";

export interface FollowerAcquisitionSource {
  followerId: string;
  sourceType: "board" | "anomaly" | "contract" | "artifact" | "gear" | "starting" | "qa";
  sourceId: string;
  mode: FollowerAcquisitionMode;
  tier: FollowerAcquisitionTier;
  label: string;
}

/**
 * Canonical, normal-game follower discovery manifest. This is descriptive and
 * validation-facing; the referenced content effect remains authoritative.
 */
export const FOLLOWER_ACQUISITION_SOURCES: readonly FollowerAcquisitionSource[] = [
  { followerId: "ash-porter", sourceType: "board", sourceId: "outer_brokenCausewayShortcut", mode: "fixed", tier: "common", label: "Dock Nine Wreckage" },
  { followerId: "black-lantern-broker", sourceType: "board", sourceId: "outer_waymarketExchange", mode: "fixed", tier: "standard", label: "Anchor Market" },
  { followerId: "burnt-road-quartermaster", sourceType: "board", sourceId: "outer_emberwatchBrace", mode: "fixed", tier: "common", label: "Ember Stair" },
  { followerId: "choir-defector", sourceType: "board", sourceId: "middle_anomalyWell", mode: "existing-content", tier: "standard", label: "Anomaly Well" },
  { followerId: "cinder-surgeon", sourceType: "board", sourceId: "outer_surgeryTreatment", mode: "existing-content", tier: "standard", label: "Old Mercy Bay" },
  { followerId: "crownless-advocate", sourceType: "board", sourceId: "middle_shardSprawlBargain:gossip", mode: "fixed", tier: "standard", label: "Shard Sprawl Bargain" },
  { followerId: "fandiablos", sourceType: "artifact", sourceId: "artifact-fandiablos", mode: "random-artifact", tier: "rare", label: "Blackstar Shortcut artifact cache" },
  { followerId: "gate-saint-acolyte", sourceType: "board", sourceId: "outer_oathpostWrit", mode: "fixed", tier: "standard", label: "Broken Census Hall" },
  { followerId: "glassmere-mapper", sourceType: "board", sourceId: "outer_glassmereChorus", mode: "fixed", tier: "common", label: "Glass Signal Pier" },
  { followerId: "grave-scribe", sourceType: "board", sourceId: "outer_relayCrew", mode: "existing-content", tier: "common", label: "Lantern Post 47" },
  { followerId: "lucy-hell-puppy", sourceType: "artifact", sourceId: "artifact-lucy-hell-puppy", mode: "random-artifact", tier: "rare", label: "Old Mercy Bay artifact cache" },
  { followerId: "mira-rift-twin", sourceType: "artifact", sourceId: "artifact-mira-rift-twin", mode: "random-artifact", tier: "rare", label: "Red March artifact cache" },
  { followerId: "mirecoil-saboteur", sourceType: "board", sourceId: "outer_mirecoilTraffic", mode: "fixed", tier: "standard", label: "Rusted Transit Gate" },
  { followerId: "murkclaw-gravecrow", sourceType: "artifact", sourceId: "artifact-murkclaw-gravecrow", mode: "random-artifact", tier: "rare", label: "Fallen Hab-Stack artifact cache" },
  { followerId: "pale-cartel-fixer", sourceType: "board", sourceId: "middle_rivalryClaim", mode: "existing-content", tier: "standard", label: "Rivalry Pit" },
  { followerId: "red-march-guide", sourceType: "anomaly", sourceId: "anomaly-webglass-stutter", mode: "existing-content", tier: "common", label: "Webglass Stutter" },
  { followerId: "rune-eye-raven", sourceType: "artifact", sourceId: "artifact-rune-eye-raven", mode: "random-artifact", tier: "rare", label: "Choir Shrine artifact cache" },
  { followerId: "saltflat-bone-reader", sourceType: "board", sourceId: "outer_saltCrossing", mode: "fixed", tier: "standard", label: "Mire Vent Colony" },
  { followerId: "votive-gunner", sourceType: "board", sourceId: "middle_redMarchBargain", mode: "existing-content", tier: "standard", label: "Red March Outpost" },
  { followerId: "webglass-runner", sourceType: "board", sourceId: "middle_webglassFracture", mode: "fixed", tier: "common", label: "Webglass Fracture" },
  { followerId: "zoey-thorn-violet", sourceType: "artifact", sourceId: "artifact-zoey-thorn-violet", mode: "random-artifact", tier: "rare", label: "Red March artifact cache" }
] as const;

export const QA_FOLLOWER_IDS = new Set([
  "qa_alpha_follower_01",
  "qa_alpha_follower_02",
  "qa_alpha_follower_03"
]);

export function getFollowerAcquisitionSources(followerId: string): readonly FollowerAcquisitionSource[] {
  return FOLLOWER_ACQUISITION_SOURCES.filter((source) => source.followerId === followerId);
}
