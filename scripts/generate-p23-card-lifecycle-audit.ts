import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
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
import { missions } from "../src/game/data/missions.js";
import { SCENARIOS } from "../src/game/data/scenarios.js";
import {
  cardLifecycleAuditSchema,
  type CardLifecycleAuditRecord
} from "./card-lifecycle-audit-schema.js";

type RecordLike = Record<string, unknown> & { id: string; title?: string; name?: string };
type FamilyConfig = {
  family: CardLifecycleAuditRecord["family"];
  scope: CardLifecycleAuditRecord["scope"];
  records: RecordLike[];
  sourceRoot?: string;
};

const root = process.cwd();
const docsRoot = join(root, "docs", "research");
mkdirSync(docsRoot, { recursive: true });

function walkJson(directory: string): string[] {
  if (!statSync(directory, { throwIfNoEntry: false })) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkJson(path) : entry.name.endsWith(".json") ? [path] : [];
  });
}

function indexJsonSources(directory: string): Map<string, string> {
  const index = new Map<string, string>();
  for (const path of walkJson(directory)) {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { id?: unknown };
    if (typeof parsed.id === "string") {
      index.set(parsed.id, relative(root, path).replaceAll("\\", "/"));
    }
  }
  return index;
}

const sectorArtifactIds = new Set(
  createCanonicalSectorGraph().flatMap((sector) => sector.encounterDecks.artifact)
);
const threatIdsInSectorDecks = new Set(
  createCanonicalSectorGraph().flatMap((sector) => sector.encounterDecks.threat)
);

const configs: FamilyConfig[] = [
  { family: "Threat", scope: "gameplay", records: [...loadThreatCards().values()], sourceRoot: "content/cards/threats" },
  { family: "Anomaly", scope: "gameplay", records: [...loadAnomalyCards().values()], sourceRoot: "content/cards/anomalies" },
  { family: "Artifact", scope: "gameplay", records: [...loadArtifactCards().values()], sourceRoot: "content/cards/artifacts" },
  { family: "Escalation", scope: "gameplay", records: [...loadEscalationCards().values()], sourceRoot: "content/cards/escalations" },
  { family: "Scar", scope: "gameplay", records: [...loadScarCards().values()], sourceRoot: "content/cards/scars" },
  { family: "Affliction", scope: "gameplay", records: [...loadAfflictionCards().values()], sourceRoot: "content/cards/afflictions" },
  { family: "Contract", scope: "gameplay", records: [...loadContracts().values()], sourceRoot: "content/cards/contracts" },
  { family: "Equipment", scope: "gameplay", records: [...loadGear().values()], sourceRoot: "content/gear" },
  { family: "Follower", scope: "gameplay", records: [...loadFollowers().values()], sourceRoot: "content/followers" },
  { family: "Tile Challenge", scope: "gameplay", records: [...loadTileChallenges().values()], sourceRoot: "content/tile-challenges" },
  { family: "Character", scope: "appendix", records: [...loadCharacters().values()], sourceRoot: "content/characters" },
  { family: "Scenario", scope: "appendix", records: SCENARIOS as unknown as RecordLike[] },
  { family: "Legacy Mission", scope: "appendix", records: missions as unknown as RecordLike[] }
];

const sourceIndexes = new Map(
  configs
    .filter((config): config is FamilyConfig & { sourceRoot: string } => Boolean(config.sourceRoot))
    .map((config) => [config.family, indexJsonSources(join(root, config.sourceRoot))])
);

function effectSummary(effect: unknown): string {
  if (!effect || typeof effect !== "object") return "No additional typed effect.";
  const candidate = effect as { type?: unknown; amount?: unknown; gearId?: unknown; followerId?: unknown; effects?: unknown[] };
  if (candidate.type === "sequence") {
    return (candidate.effects ?? []).map(effectSummary).join(" Then ");
  }
  if (candidate.type === "gain_gear") return `Gain Equipment ${String(candidate.gearId)}.`;
  if (candidate.type === "gain_follower") return `Gain Follower ${String(candidate.followerId)}.`;
  if (typeof candidate.amount === "number") return `${String(candidate.type)} ${candidate.amount}.`;
  return `${String(candidate.type ?? "typed effect")}.`;
}

function classification(family: CardLifecycleAuditRecord["family"], record: RecordLike): Pick<CardLifecycleAuditRecord, "status" | "notes"> {
  if (family === "Legacy Mission") {
    return {
      status: "compatibility-only",
      notes: "Legacy design record retained for reference; canonical Contract cards own live mission play."
    };
  }
  if (record.qaOnly === true || record.id.startsWith("qa-") || record.id.startsWith("qa_")) {
    return {
      status: "development-only",
      notes: "Explicit QA content; canonical setup, shop, reward, and acquisition gates exclude it from ordinary play."
    };
  }
  if (family === "Threat" && record.id === "rift-whispers") {
    return {
      status: "superseded",
      notes: "Not a second drawable Threat. It supplies the presentation/art identity for the recurring Rift Whispers Tile Challenge."
    };
  }
  return { status: "complete", notes: "" };
}

function lifecycleFor(
  family: CardLifecycleAuditRecord["family"],
  record: RecordLike
): Omit<CardLifecycleAuditRecord, "family" | "scope" | "id" | "name" | "sourcePath" | "status" | "notes"> {
  switch (family) {
    case "Threat": {
      const enemy = record.cardType === "enemy";
      const inDeck = threatIdsInSectorDecks.has(record.id);
      return {
        purpose: enemy ? "Immediate opposed battle and Trophy source." : "Immediate public hazard/event test.",
        acquisitionOrTrigger: record.id === "rift-whispers"
          ? "Presentation source selected by its migrated Tile Challenge; never drawn independently."
          : `${inDeck ? "Drawn from a canonical sector Threat deck" : "Selected by an authored server path"} on encounter resolution.`,
        authoritativeResolver: enemy ? "GameRoomServer.resolveOpposedCombat → COMBAT_RESOLVED." : "GameRoomServer.resolveCheckIntent → CHECK_ROLLED.",
        outcome: enemy
          ? `Victory: ${effectSummary(record.defeatReward)} Loss: ${effectSummary(record.woundOnLoss)}`
          : `Success: ${effectSummary(record.successEffect)} Failure: ${effectSummary(record.failEffect)}`,
        repeatability: "One resolution per drawn encounter event; reward and penalty are event-guarded.",
        cleanup: record.id === "rift-whispers" ? "Tile Challenge owns recurrence and cleanup." : "Encounter clears after resolution; authored persistence effects remain.",
        visibility: "Identity, roll, totals, and public outcome are TV-visible; no private owner data is projected.",
        reconnect: "Current encounter, active resolution, pending effect, and event log restore without redraw or duplicate outcome.",
        tests: ["src/game/engine/__tests__/engine.test.ts", "src/game/cards/__tests__/cardCategories.test.ts"]
      };
    }
    case "Anomaly":
      return {
        purpose: "Sector distortion with a typed immediate outcome.",
        acquisitionOrTrigger: "Server draws it from the current sector's Anomaly pool when sector text requests that deck.",
        authoritativeResolver: "resolveSectorCardResolution → SPACE_TEXT_RESOLVED / RESOLUTION_APPLIED.",
        outcome: effectSummary(record.resolveEffect),
        repeatability: "Once per card membership in that sector pool.",
        cleanup: "The card ID is consumed from the authoritative sector pool after resolution.",
        visibility: "Public reveal and result; any owner-only consequence stays in its private projection.",
        reconnect: "Consumed deck membership and active resolution persist in save version 2.",
        tests: ["src/game/engine/__tests__/engine.test.ts", "src/server/__tests__/sessionState.test.ts"]
      };
    case "Artifact":
      return {
        purpose: "Rare reward presentation that grants a typed owned object, companion, progress, or note.",
        acquisitionOrTrigger: sectorArtifactIds.has(record.id)
          ? "Drawn from one or more canonical sector Artifact pools."
          : "Offered through the relic-dealer Contract exchange; not present in a sector pool.",
        authoritativeResolver: "Server-selected Artifact effect → resolveEffect → RESOLUTION_APPLIED or SHOP_PURCHASE_RESOLVED.",
        outcome: effectSummary(record.resolveEffect),
        repeatability: "Sector copies consume once; dealer stock enforces ownership and authoritative availability.",
        cleanup: "Sector card is consumed or shop reveal is cleared; granted owned state persists.",
        visibility: "Public acquisition summary; owned inventory details remain on the owner's phone.",
        reconnect: "Consumed pool/shop state and owned item sourceArtifactCardId persist without reacquisition.",
        tests: ["src/game/engine/__tests__/itemEffectPostAuditHardening.test.ts", "src/game/engine/__tests__/p23CardLifecycle.test.ts"]
      };
    case "Escalation":
      return {
        purpose: "Public shared-world pressure event.",
        acquisitionOrTrigger: "Server draws it from a sector Escalation pool through authored sector text.",
        authoritativeResolver: "resolveSectorCardResolution → ESCALATION_ADVANCED / RESOLUTION_APPLIED.",
        outcome: effectSummary(record.resolveEffect),
        repeatability: "Once per card membership in its sector pool.",
        cleanup: "Consumed from the sector pool; global escalation state remains.",
        visibility: "Fully public shared result.",
        reconnect: "Global level, consumed membership, and event guards persist.",
        tests: ["src/game/engine/__tests__/engine.test.ts", "src/server/__tests__/progressionEndgameProjection.test.ts"]
      };
    case "Scar":
      return {
        purpose: "Persistent operative burden with a paired adaptation.",
        acquisitionOrTrigger: `Gained through the wound/recall Scar lifecycle from ${String(record.source ?? "authored")} sources.`,
        authoritativeResolver: "Scar threshold/choice reducers plus scarPersistentRules and scarAdaptationControls.",
        outcome: `${String(record.burdenText ?? "Persistent burden")} / ${String(record.adaptationText ?? "Owned adaptation")}`,
        repeatability: "Persistent while owned; timing limits are event-, turn-, battle-, round-, visit-, or game-scoped.",
        cleanup: "Only an authoritative purge/removal service removes the owned instance.",
        visibility: "Ownership and public-safe results are public; choices and hidden consequence details are owner-private.",
        reconnect: "Owned instances, pending choices, usages, and source-event guards persist.",
        tests: ["src/game/rules/__tests__/scarPersistentRules.test.ts", "src/game/engine/__tests__/scarSystem.test.ts"]
      };
    case "Affliction":
      return {
        purpose: "Persistent or immediate operative condition drawn from the server-owned Affliction cycle.",
        acquisitionOrTrigger: "Typed draw_affliction effect or a chained Affliction draw; only the four approved Threat failures introduce new draws.",
        authoritativeResolver: "Persisted pendingAfflictionResolution queue → AFFLICTION_DRAWN → affliction rule helpers.",
        outcome: `${String(record.rulesText)} (${String(record.duration)}; ${String(record.effectKind)}).`,
        repeatability: "Without replacement within each per-operative 30-card cycle; card timing controls later uses.",
        cleanup: record.isFaceupOngoing === true ? "Remains faceup until an authored future removal; usage resets at its timing boundary." : "Resolves immediately and flips facedown.",
        visibility: "Owner receives full rules and choices; TV receives a concise public draw/result only.",
        reconnect: "History, face state, usage, pending queue, prepared choice, and pending reaction persist without replay.",
        tests: ["src/game/rules/__tests__/afflictions.test.ts", "src/game/engine/__tests__/p23CardLifecycle.test.ts"]
      };
    case "Contract":
      return {
        purpose: "Owner-private mission objective and completed-Contract currency.",
        acquisitionOrTrigger: "Starting offer, sector Contract offer, or authoritative replacement selection.",
        authoritativeResolver: `Objective ${String((record.objective as { type?: unknown } | undefined)?.type ?? "typed objective")} advances through contract objective events; completion applies missionReward.`,
        outcome: effectSummary((record.missionReward as { effects?: unknown[] } | undefined)?.effects ? { type: "sequence", effects: (record.missionReward as { effects: unknown[] }).effects } : undefined),
        repeatability: "One active owner copy; completion reward applies once and replacement is selected once.",
        cleanup: "Moves from active to completed; replacement queue then clears after a legal owner choice.",
        visibility: "Objective and progress are owner-private; TV sees only redacted public status/completion.",
        reconnect: "Active progress, completed IDs, offer, and pending replacement selection persist.",
        tests: ["src/game/contracts/__tests__/objectives.test.ts", "src/server/__tests__/privacyProjection.test.ts"]
      };
    case "Equipment":
      return {
        purpose: "Owned stat modifier or typed active/consumable/charged capability.",
        acquisitionOrTrigger: record.qaOnly === true || record.id.startsWith("qa-")
          ? "Development fixture only; normal shop and reward gates reject it."
          : "Starting loadout, shop, Artifact effect, or authored reward.",
        authoritativeResolver: "Exact owned instance plus equipped/timing checks in gear, shop, and item-effect reducers.",
        outcome: `${String((record.statBonus as { amount?: unknown; stat?: unknown } | undefined)?.amount ?? 0)} ${String((record.statBonus as { stat?: unknown } | undefined)?.stat ?? "stat")} bonus; ${String(record.effectModel ?? "legacy typed category")} lifecycle.`,
        repeatability: "Permanent while equipped, conditional in its typed context, or bounded by discard/exhaust/charge rules.",
        cleanup: "Selling/discarding removes ownership; unequip/suppression disables bonuses; round reset restores exhaust items.",
        visibility: "Owner sees inventory detail; TV receives only public acquisition/use summaries.",
        reconnect: "Owned instance, exact equipment slot, charges, exhaustion, suppression, and Artifact source link persist.",
        tests: ["src/game/engine/__tests__/p23CardLifecycle.test.ts", "scripts/__tests__/passive-equipment-validation.test.ts"]
      };
    case "Follower":
      return {
        purpose: "Unique or standard companion with passive or typed exhaust support.",
        acquisitionOrTrigger: Array.isArray(record.acquisition) ? record.acquisition.join("; ") : "Authored follower reward/acquisition path.",
        authoritativeResolver: "gain_follower uniqueness check and USE_FOLLOWER validation.",
        outcome: String(record.text),
        repeatability: `Bound by ${String(record.useLimit ?? record.resetWindow ?? "its authored passive timing")}.`,
        cleanup: "Discard/loss rules remove the instance; round reset clears typed exhaustion.",
        visibility: "Ownership is public-safe; actionable detail remains owner-controlled.",
        reconnect: "Owned instance, uniqueness, and exhausted state persist.",
        tests: ["src/game/engine/__tests__/followerSystemCompletion.test.ts", "src/game/engine/__tests__/p23CardLifecycle.test.ts"]
      };
    case "Tile Challenge":
      return {
        purpose: "Persistent recurring sector challenge.",
        acquisitionOrTrigger: `${String(record.trigger)} at ${String(record.sectorId)}.`,
        authoritativeResolver: "startNextTileChallenge → CHECK_REQUESTED → CHECK_ROLLED → RESOLUTION_APPLIED.",
        outcome: `Success: ${effectSummary(record.successEffect)} Failure: ${effectSummary(record.failureEffect)}`,
        repeatability: record.recurring === true ? "Recurring on each qualifying arrival; one event per visit." : "Once until its authored removal rule.",
        cleanup: "Pending challenge clears after result; recurring board attachment remains.",
        visibility: "Public challenge identity, stat, totals, and result; owner choice remains private.",
        reconnect: "Pending challenge, roll state, visit progress, and attachment persist without replay.",
        tests: ["src/game/rules/__tests__/tileFunctions.test.ts", "src/game/engine/__tests__/p23CardLifecycle.test.ts"]
      };
    case "Character":
      return {
        purpose: "Operative identity, base stats, abilities, and starting loadout.",
        acquisitionOrTrigger: record.qaOnly === true ? "Explicit QA selection gate only." : "Lobby selection, late join, or replacement selection.",
        authoritativeResolver: "Server character eligibility and selection/replacement reducers.",
        outcome: `Creates operative ${String(record.name)} with canonical stats and abilities.`,
        repeatability: "Selected once per seat identity; replacement follows recall rules.",
        cleanup: "Operative persists for the session; replacement preserves authoritative ownership boundaries.",
        visibility: "Public identity/stats; private hand, notes, and mission data remain owner-only.",
        reconnect: "Seat-character assignment and operative state persist.",
        tests: ["src/game/rules/__tests__/playerIdentity.test.ts", "src/server/__tests__/privacyProjection.test.ts"]
      };
    case "Scenario":
      return {
        purpose: "Session-wide pressure, objectives, final confrontation, and victory/defeat authority.",
        acquisitionOrTrigger: "Selected during lobby configuration and activated at session start.",
        authoritativeResolver: "scenarioAmbient, scenarioObjectiveTriggers, confrontation, and endgame reducers.",
        outcome: `${String(record.theme ?? record.name ?? record.id)} scenario progression and final result.`,
        repeatability: "One selected scenario per session; objective source-event IDs prevent duplicate progress.",
        cleanup: "Ends in authoritative victory/defeat state; restart creates a fresh lifecycle.",
        visibility: "Public scenario state; rivalry/private objective data remains redacted.",
        reconnect: "Progress, preparation, confrontation, result, and processed event IDs persist.",
        tests: ["src/server/__tests__/phaseThreeScenarioObjectiveTriggers.test.ts", "src/server/__tests__/progressionEndgameProjection.test.ts"]
      };
    case "Legacy Mission":
      return {
        purpose: "Historical pre-Contract mission design reference.",
        acquisitionOrTrigger: "No normal-play trigger.",
        authoritativeResolver: "No live resolver; canonical Contract cards supersede this data.",
        outcome: `${String(record.objectiveText)} / ${String(record.rewardText)}`,
        repeatability: "Not applicable to canonical play.",
        cleanup: "Static compatibility/reference data only.",
        visibility: "Not projected by the live TV or phone clients.",
        reconnect: "Not serialized into live sessions.",
        tests: ["scripts/validate-content.ts"]
      };
  }
}

const records: CardLifecycleAuditRecord[] = configs.flatMap((config) =>
  config.records.map((record) => {
    const sourcePath = sourceIndexes.get(config.family)?.get(record.id)
      ?? (config.family === "Scenario" ? "src/game/data/scenarios.ts" : "src/game/data/missions.ts");
    const classified = classification(config.family, record);
    return {
      family: config.family,
      scope: config.scope,
      id: record.id,
      name: String(record.title ?? record.name ?? record.id),
      sourcePath,
      ...lifecycleFor(config.family, record),
      ...classified
    };
  })
);

const gameplayRecordCount = records.filter((record) => record.scope === "gameplay").length;
const appendixRecordCount = records.filter((record) => record.scope === "appendix").length;
const parsed = cardLifecycleAuditSchema.parse({
  generatedAt: new Date().toISOString(),
  recordCount: records.length,
  gameplayRecordCount,
  appendixRecordCount,
  records
});

const familyCounts = Object.entries(
  records.reduce<Record<string, number>>((counts, record) => {
    counts[record.family] = (counts[record.family] ?? 0) + 1;
    return counts;
  }, {})
);
const statusCounts = Object.entries(
  records.reduce<Record<string, number>>((counts, record) => {
    counts[record.status] = (counts[record.status] ?? 0) + 1;
    return counts;
  }, {})
);
const esc = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", " ");

const markdown = `# P23 Card Category Lifecycle Audit

Generated from canonical content and development-only appendix data. This report classifies every record individually; the adjacent JSON matrix is the machine-readable source.

## Totals

| Scope / family | Records |
|---|---:|
| Gameplay families | ${gameplayRecordCount} |
| Appendix | ${appendixRecordCount} |
| **Total** | **${records.length}** |
${familyCounts.map(([family, count]) => `| ${family} | ${count} |`).join("\n")}

## Completion status

| Status | Records |
|---|---:|
${statusCounts.map(([status, count]) => `| ${status} | ${count} |`).join("\n")}

“Complete” means the record has a reachable, typed, server-authoritative path and focused or family-level automated coverage. Development-only, compatibility-only, and superseded records are intentionally excluded from ordinary play rather than presented as live cards.

## Individual lifecycle matrix

| Family | ID | Name | Source | Purpose | Acquisition / trigger | Resolver | Outcome | Repeatability | Cleanup | Visibility | Reconnect | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
${records.map((record) => `| ${record.family} | \`${record.id}\` | ${esc(record.name)} | \`${record.sourcePath}\` | ${esc(record.purpose)} | ${esc(record.acquisitionOrTrigger)} | ${esc(record.authoritativeResolver)} | ${esc(record.outcome)} | ${esc(record.repeatability)} | ${esc(record.cleanup)} | ${esc(record.visibility)} | ${esc(record.reconnect)} | ${record.tests.map((test) => `\`${test}\``).join("<br>")} | ${record.status} | ${esc(record.notes)} |`).join("\n")}
`;

writeFileSync(
  join(docsRoot, "P23_CARD_CATEGORY_LIFECYCLE_MATRIX.json"),
  `${JSON.stringify(parsed, null, 2)}\n`,
  "utf8"
);
writeFileSync(
  join(docsRoot, "P23_CARD_CATEGORY_LIFECYCLE_AUDIT.md"),
  markdown,
  "utf8"
);

console.log(`Generated P23 lifecycle audit: ${records.length} records (${gameplayRecordCount} gameplay + ${appendixRecordCount} appendix).`);
