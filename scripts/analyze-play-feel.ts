import { createCanonicalSectorGraph } from "../src/game/data/canonicalSectorGraph.js";
import { loadAnomalyCards } from "../src/game/content/anomalies.js";
import { loadArtifactCards } from "../src/game/content/artifacts.js";
import { loadContracts } from "../src/game/content/contracts.js";
import { loadEscalationCards } from "../src/game/content/escalations.js";
import { loadGear } from "../src/game/content/gear.js";
import { loadThreatCards } from "../src/game/content/threats.js";

const threats = loadThreatCards();
const anomalies = loadAnomalyCards();
const artifacts = loadArtifactCards();
const contracts = loadContracts();
const escalations = loadEscalationCards();
const gear = loadGear();
const sectors = createCanonicalSectorGraph();

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function countBy<T>(items: Iterable<T>, getKey: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function formatCounts(counts: Map<string, number>): string {
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

function drawOne<T>(pool: T[], seed: number): T | null {
  if (pool.length === 0) {
    return null;
  }

  const index = Math.abs(Math.imul(seed + 17, 48271)) % pool.length;
  return pool[index] ?? null;
}

function simulateFirstTenDraws(runs = 500): {
  averageDistinctSignals: number;
  percentAtLeastSixSignals: number;
  percentDuplicateTitles: number;
} {
  const outerSectors = sectors.filter((sector) => sector.regionTier === "borderlight");
  let distinctTotal = 0;
  let atLeastSix = 0;
  let duplicateRuns = 0;
  const cooldownLimit = 12;

  for (let run = 0; run < runs; run += 1) {
    const seenSignals = new Set<string>();
    const seenTitles = new Set<string>();
    const cooldown: string[] = [];
    let duplicate = false;

    for (let draw = 0; draw < 10; draw += 1) {
      const sector = outerSectors[(run + draw) % outerSectors.length];
      if (!sector) {
        continue;
      }

      const fullPool = [
        ...sector.encounterDecks.threat.map((id) => ({ type: "threat", id })),
        ...sector.encounterDecks.anomaly.map((id) => ({ type: "anomaly", id })),
        ...sector.encounterDecks.contract.map((id) => ({ type: "contract", id })),
        ...sector.encounterDecks.artifact.map((id) => ({ type: "artifact", id })),
        ...sector.encounterDecks.escalation.map((id) => ({ type: "escalation", id }))
      ];
      const cooledPool = fullPool.filter((entry) => !cooldown.includes(entry.id));
      const deckChoice = drawOne(cooledPool.length > 0 ? cooledPool : fullPool, run * 31 + draw);

      if (!deckChoice) {
        seenSignals.add("board-text");
        continue;
      }

      const threat = deckChoice.type === "threat" ? threats.get(deckChoice.id) : null;
      seenSignals.add(threat ? `threat:${threat.threatLane ?? "untagged"}:${threat.rarity ?? "untagged"}` : deckChoice.type);
      if (seenTitles.has(deckChoice.id)) {
        duplicate = true;
      }
      seenTitles.add(deckChoice.id);
      cooldown.push(deckChoice.id);
      if (cooldown.length > cooldownLimit) {
        cooldown.shift();
      }
    }

    distinctTotal += seenSignals.size;
    if (seenSignals.size >= 6) {
      atLeastSix += 1;
    }
    if (duplicate) {
      duplicateRuns += 1;
    }
  }

  return {
    averageDistinctSignals: Number((distinctTotal / runs).toFixed(2)),
    percentAtLeastSixSignals: atLeastSix / runs,
    percentDuplicateTitles: duplicateRuns / runs
  };
}

const totalEncounterCards = threats.size + anomalies.size + artifacts.size + contracts.size + escalations.size;
const rarityCounts = countBy(threats.values(), (card) => card.rarity ?? "untagged");
const laneCounts = countBy(threats.values(), (card) => card.threatLane ?? "untagged");
const tempoCounts = countBy(threats.values(), (card) => card.tempo ?? "untagged");
const gearTierCounts = countBy(gear.values(), (item) => item.tier ?? "untagged");
const earlyVariance = simulateFirstTenDraws();

console.log("Ashen Reach play-feel snapshot");
console.log(`Encounter cards: ${totalEncounterCards}`);
console.log(`Threat rarity: ${formatCounts(rarityCounts)}`);
console.log(`Threat lanes: ${formatCounts(laneCounts)}`);
console.log(`Threat tempo: ${formatCounts(tempoCounts)}`);
console.log(`Gear tiers: ${formatCounts(gearTierCounts)}`);
console.log(
  `Early 10-draw variance: avg distinct signals ${earlyVariance.averageDistinctSignals}, >=6 signals ${percent(
    earlyVariance.percentAtLeastSixSignals
  )}, duplicate-title runs ${percent(earlyVariance.percentDuplicateTitles)}`
);
