export const APPROVED_LEGACY_HEAT_CONTENT_IDS = new Set([
  "anomaly-bellrain-inversion", "anomaly-cinder-gate-echo", "anomaly-cinder-mirage-lane",
  "anomaly-red-suture-field", "anomaly-saint-static-aperture", "anomaly-saltglass-fata-morgana", "anomaly-scar-tide-lattice", "anomaly-throne-shadow-jury", "anomaly-webglass-stutter",
  "artifact-cinder-suture-kit", "artifact-ember-burden-idol", "artifact-fandiablos", "artifact-heat-sink-prayer", "artifact-red-march-warbell", "artifact-throne-crown-fragment",
  "ash-cinder-runt", "ashen-doppelganger", "ash-rat-skitter", "bell-mask-pilgrim", "bellwire-snare", "black-lantern-broker", "black-ledger-agent",
  "breach-lens-overload", "bridge-toll-runt", "cartel-ledger-skim", "char_bjornis", "char_deepdale", "char_ker_von_ker", "char_kira_dog", "char_master_alpha", "char_popelord", "char_rumi",
  "choir-defector", "choir-static-burst", "cinder-gate-backlash", "cinder-monk", "cinder-surgeon", "cinder-veil-stalker",
  "compact-equipment-requisition", "cracked-censer-novice", "crown-bell-baron", "crownless-advocate", "emberwatch-sparkfall",
  "escalation-blackstar-hunger", "escalation-choir-feedback", "escalation-crownfall-writ", "escalation-marrow-surgery-debt", "escalation-saltwind-lockdown",
  "false-route-procession", "fandiablos", "fleet-elder", "gateblind-pulse", "gate-choir-executioner", "gate-saint-acolyte", "gate-tax-collectors", "glass-chime-swarm", "glass-mire-stalker", "glasswing-midge-cloud",
  "grave-engineer", "grave-lattice-reclaimer", "grave-silt-press", "gutter-bell-mite", "heat-sink-prayer", "hymn-scarred-zealot", "iron-lung-grenadier", "iron-synod-chirurgeon", "lalla-bubu-crownling", "lantern-moth-swarm", "latchspire-raider", "lucy-hell-puppy",
  "marrow-tax-auditors", "memory-tax-gate", "mirror-lord-envoy", "mirror-mite-bloom", "mirror-rot-interference", "oathbroken-prince", "pale-cartel-shakedown", "pale-contract-collector", "pale-marshal", "pale-toll-enforcer",
  "relay-husk", "relay-pilgrim-riot", "reliquary-judge", "rift-cartographer", "roadside-bone-oracle", "rust-choir-peddlers", "rust-mote-drone", "saint-of-ashes-echo", "saltflat-bone-reader", "salvage-warden", "shardvine-ambushers", "shardwind-front", "siege-medic",
  "signal-rotted-engineer", "signal-witch", "siren-relay-echo", "soot-stained-cutpurse", "spindle-static-squall", "starless-taxation", "static-censer-acolyte", "suture-storm", "toll-scrip-urchins", "void-marshal", "void-salt-sickness", "webglass-echo-trap", "webglass-snarefield", "yard-rivet-brute"
]);

const BLOCKED_CONSTRUCTS = [
  { name: "gain_heat", pattern: /"type"\s*:\s*"gain_heat"/i },
  { name: "gain_heat_all", pattern: /"type"\s*:\s*"gain_heat_all"/i },
  { name: "lose_heat", pattern: /"type"\s*:\s*"lose_heat"/i },
  { name: "heatCost", pattern: /"heatCost"\s*:/i },
  { name: "cost.heat or schema-like Heat field", pattern: /"heat"\s*:/i },
  { name: "player-facing Heat text", pattern: /"(?:text|activeText|passiveText|penalty|trigger|summary|description)"\s*:\s*"[^"]*\bHeat\b/i },
  { name: "player-facing Risk resource text", pattern: /"(?:text|activeText|passiveText|penalty|trigger|summary|description)"\s*:\s*"[^"]*\bRisk(?: cost)?\b/i }
];

export function validateLegacyHeatContentRecord(file: string, record: unknown): string[] {
  if (!record || typeof record !== "object") return [];
  const id = "id" in record && typeof record.id === "string" ? record.id : "<missing-id>";
  const serialized = JSON.stringify(record);
  const constructs = BLOCKED_CONSTRUCTS.filter((entry) => entry.pattern.test(serialized));
  if (constructs.length === 0 || APPROVED_LEGACY_HEAT_CONTENT_IDS.has(id)) return [];
  return constructs.map((entry) => `${file} (${id}) introduces blocked legacy Heat construct ${entry.name}. New mechanics must use an approved current system or receive an explicit design decision.`);
}
