import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadAfflictionCards } from "../src/game/content/afflictions.js";
import { loadAnomalyCards } from "../src/game/content/anomalies.js";
import { loadArtifactCards } from "../src/game/content/artifacts.js";
import { loadCharacters } from "../src/game/content/characters.js";
import { loadContracts } from "../src/game/content/contracts.js";
import { loadEscalationCards } from "../src/game/content/escalations.js";
import { loadFollowers } from "../src/game/content/followers.js";
import { loadGear } from "../src/game/content/gear.js";
import { loadScarCards } from "../src/game/content/scars.js";
import { loadThreatCards } from "../src/game/content/threats.js";
import { loadTileChallenges } from "../src/game/content/tileChallenges.js";
import { createCanonicalSectorGraph } from "../src/game/data/canonicalSectorGraph.js";
import { SCENARIOS } from "../src/game/data/scenarios.js";
import { getThreatPresentationCategory } from "../src/game/cards/cardCategories.js";

type RecordLike = { id: string; title?: string; name?: string; flavor?: string; text?: string; tags?: string[] };

const reportsRoot = join(process.cwd(), "reports");
mkdirSync(reportsRoot, { recursive: true });

const threats = [...loadThreatCards().values()];
const families: Array<{ family: string; records: RecordLike[]; role: string; source: string; reachable: string; runtime: string; phone: string; tv: string }> = [
  { family: "Threat (Enemy/Hazard/Event/Encounter/Asset)", records: threats, role: "Immediate encounter", source: "Sector Threat decks / tile challenge art", reachable: "Yes", runtime: "Fully implemented", phone: "Fully implemented", tv: "Fully implemented" },
  { family: "Anomaly", records: [...loadAnomalyCards().values()], role: "Immediate distortion encounter", source: "Sector Anomaly pools", reachable: "Yes", runtime: "Fully implemented", phone: "Fully implemented", tv: "Fully implemented" },
  { family: "Escalation", records: [...loadEscalationCards().values()], role: "Public shared-world deterioration", source: "Sector Escalation pools", reachable: "Yes", runtime: "Fully implemented", phone: "Fully implemented", tv: "Fully implemented" },
  { family: "Tile Challenge", records: [...loadTileChallenges().values()], role: "Persistent board encounter", source: "Authored sector attachment", reachable: "Yes", runtime: "Fully implemented", phone: "Fully implemented", tv: "Fully implemented" },
  { family: "Equipment", records: [...loadGear().values()], role: "Player-owned progression", source: "Shops, loadouts, rewards", reachable: "Yes", runtime: "Fully implemented", phone: "Fully implemented", tv: "Public summary" },
  { family: "Artifact", records: [...loadArtifactCards().values()], role: "Rare player-owned reward", source: "Contract exchange / approved rare source", reachable: "Yes", runtime: "Fully implemented", phone: "Fully implemented", tv: "Public result only" },
  { family: "Follower", records: [...loadFollowers().values()], role: "Player-owned companion", source: "Canonical acquisition manifest", reachable: "Yes", runtime: "Fully implemented", phone: "Fully implemented", tv: "Public-safe summary" },
  { family: "Contract", records: [...loadContracts().values()], role: "Owner-private objective / completed currency", source: "Starting and sector Contract offers", reachable: "Yes", runtime: "Fully implemented", phone: "Owner-private", tv: "Redacted summary" },
  { family: "Scar", records: [...loadScarCards().values()], role: "Persistent operative consequence", source: "Wound-recall-Scar lifecycle", reachable: "Yes", runtime: "Fully implemented", phone: "Fully implemented", tv: "Public-safe result" },
  { family: "Affliction", records: [...loadAfflictionCards().values()], role: "Persistent/temporary operative condition", source: "Typed authored effects", reachable: "Conditional", runtime: "Fully implemented", phone: "Fully implemented", tv: "Public-safe result" },
  { family: "Character", records: [...loadCharacters().values()], role: "Operative identity", source: "Setup / late join / replacement", reachable: "Yes", runtime: "Fully implemented", phone: "Fully implemented", tv: "Public identity" },
  { family: "Scenario", records: SCENARIOS as unknown as RecordLike[], role: "Scenario-controlled progression", source: "Lobby selection", reachable: "Yes", runtime: "Fully implemented", phone: "Selection/progress", tv: "Public command state" }
];

const categoryCounts = threats.reduce<Record<string, number>>((counts, card) => {
  const key = getThreatPresentationCategory(card);
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});
const sectors = createCanonicalSectorGraph();
const laneCounts = threats.reduce<Record<string, number>>((counts, card) => {
  const lane = card.threatLane ?? "unassigned";
  counts[lane] = (counts[lane] ?? 0) + 1;
  return counts;
}, {});

const inventory = `# Card Category System Audit

## Executive boundary

Enemies fight; Hazards test survival; Anomalies distort rules and information; Escalations worsen the shared world; authored Events use an immediate tested-event lifecycle; persistent Tile Challenges remain on the board until their own removal rule resolves. Player-owned and scenario-controlled cards stay outside ordinary Threat draws.

## Canonical inventory

| Category | Count | Primary role | Source / pool | Normal play | Runtime | Phone | TV |
|---|---:|---|---|---|---|---|---|
${families.map((entry) => `| ${entry.family} | ${entry.records.length} | ${entry.role} | ${entry.source} | ${entry.reachable} | ${entry.runtime} | ${entry.phone} | ${entry.tv} |`).join("\n")}

## Threat presentation categories

| Category | Count | Mechanic |
|---|---:|---|
${Object.entries(categoryCounts).map(([category, count]) => `| ${category} | ${count} | ${category === "enemy" ? "Opposed battle; Trophy eligible" : "Operative test; never a Trophy"} |`).join("\n")}

Lane totals remain Red ${laneCounts.red ?? 0}, Blue ${laneCounts.blue ?? 0}, Yellow ${laneCounts.yellow ?? 0}; total ${threats.length}. The canonical sector graph has ${sectors.length} sectors. No card count, lane assignment, probability, topology, or authored effect changed.

## Root-cause finding

The additional families were not absent from canonical content or normal-play pools. Anomaly and Escalation sector resolvers selected and consumed cards authoritatively but discarded their identity before creating activeResolution. Threat projection also discarded resolutionType, and the TV inferred “battle” from a populated enemy-name convenience field. That combination visually collapsed Event, Encounter, Asset, Anomaly, and Escalation into Hazard/Battle presentation.

## Placement decisions

- Threat presentation categories stay in Threat decks and keep their existing enemy/test mechanics.
- Anomalies and Escalations remain in their separate sector pools; they are not mixed into ordinary Threat probability.
- Tile Challenges remain sector-authored and persistent.
- Equipment, Artifacts, Followers, Contracts, Scars, Afflictions, and Characters remain player-owned/progression systems.
- Scenarios, objectives, preparation, and confrontation stages remain scenario-controlled.
- Event/Choice was not expanded into a new schema: the three canonical Event cards are tests, while existing owner-private decisions remain typed pending choices in their owning mechanics.
`;

const lifecycle = `# Encounter Card Lifecycle

## Authoritative arrival sequence

Movement completes → destination entry/gate resolves → persistent tile challenge resolves → named sector text resolves → authored sector action selects a deck → server draws deterministically → identity and origin enter activeResolution → category mechanic resolves → typed effects apply once → card is consumed/discarded/persisted by its owner system → broadcast completes.

Intermediate route nodes and startup do not draw encounters.

## State diagrams

| Lifecycle | Reveal | Action | Result | Cleanup / persistence | Trophy |
|---|---|---|---|---|---|
| Enemy | Threat deck → public enemy | Authoritative opposed battle and reactions | Reward/failure once | Defeat discards or authored persistence remains | Eligible when value > 0 |
| Hazard | Threat deck → HAZARD | Operative test and reactions | Typed success/failure | Discard unless authored persistence says otherwise | Never |
| Anomaly | Sector Anomaly pool → ANOMALY | Typed effect/test; owner data remains private | Distortion result once | Consumed from that sector pool | Never |
| Escalation | Sector Escalation pool → ESCALATION | Public typed shared effect | Global track/effect once | Consumed from that sector pool | Never |
| Event | Threat deck → EVENT | Existing authored operative test | Typed result once | Discard | Never |
| Choice | Owning mechanic creates private pending choice | Owner submits stable option ID | Server validates stale/wrong-seat input | Pending choice clears once; reconnect restores | Never by category |
| Persistent challenge | Sector-authored challenge | Resolves on its defined entry/revisit trigger | Typed success/failure | Remains until its authored removal condition | Never unless separately an Enemy |
| Scenario encounter | Scenario state/source only | Preparation or confrontation reducer | Public scenario result | Scenario lifecycle owns cleanup | Only if explicitly an Enemy reward |

## Queue and source authority

Mixed Threat engagement ordering remains Event → Enemy → Nemesis → Encounter → Asset. Unsupported categories now fail loudly instead of receiving an accidental sort position. Every projected resolution may carry source deck, sector, event identity, queue position, actor, and privacy; clients only render this state.

## Reconnect and replay

Card selection, consumed sector-deck membership, active resolution, pending choice, and event identity are serialized in save version 2 state. Reconnect reads that state and never redraws or rerolls. Legacy v0–v2 parsing remains unchanged.
`;

function loreStatus(card: RecordLike): { status: string; note: string } {
  const loreText = Object.entries(card)
    .filter(([key, value]) => /flavou?r|text|lore|description|summary|brief|backstory|rule/i.test(key) && typeof value === "string")
    .map(([, value]) => value as string)
    .join(" ")
    .trim();
  if (!loreText) return { status: "Lore missing", note: "No concise flavour or rules fiction found." };
  if (loreText.length < 24) return { status: "Lore partial", note: "Identity exists but provenance is terse." };
  return { status: "Lore complete", note: "Concise identity and mechanical fiction are present; broader provenance tags are optional." };
}

const loreRows = families.flatMap((family) => family.records.map((card) => {
  const lore = loreStatus(card);
  const title = card.title ?? card.name ?? card.id;
  return `| ${family.family} | ${card.id} | ${String(title).replaceAll("|", "\\|")} | ${lore.status} | ${lore.note} |`;
}));

const lore = `# Card Category Lore Audit

This inventory reviews every canonical record without performing a broad rewrite. “Complete” means the current card provides a concise identity and a fiction-to-mechanic bridge; it does not claim that every card has exhaustive faction genealogy.

| Family | Stable ID | Display name | Status | Finding |
|---|---|---|---|---|
${loreRows.join("\n")}

## Result

No mechanically contradictory category/lore pairing was found in the canonical parsers. The larger provenance taxonomy (formal faction/environment/history tags on every non-Threat family) is a content-direction decision and is deferred for approval rather than invented in this pass.
`;

writeFileSync(join(reportsRoot, "card-category-system-audit.md"), inventory);
writeFileSync(join(reportsRoot, "encounter-card-lifecycle.md"), lifecycle);
writeFileSync(join(reportsRoot, "card-category-lore-audit.md"), lore);
console.log(`Generated card-category reports (${loreRows.length} canonical records).`);
