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

function createRandom(seed: number): (maxExclusive: number) => number {
  let state = seed >>> 0;
  return (maxExclusive) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state % maxExclusive;
  };
}

function shuffle<T>(items: readonly T[], random: (maxExclusive: number) => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = random(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

function simulateGlobalLaneArrivals(runs = 500): {
  averageDistinctSignals: number;
  percentAtLeastSixSignals: number;
  percentDuplicateTitles: number;
  enemyRate: number;
  hazardRate: number;
  serviceUnlockRate: number;
} {
  const outerSectors = sectors.filter((sector) => sector.regionTier === "borderlight");
  let distinctTotal = 0;
  let atLeastSix = 0;
  let duplicateRuns = 0;
  let enemies = 0;
  let hazards = 0;
  let serviceArrivals = 0;
  let successfulServiceArrivals = 0;
  const laneCatalogs = Object.fromEntries(
    (["red", "blue", "yellow"] as const).map((lane) => [
      lane,
      [...threats.values()].filter((card) => card.threatLane === lane)
    ])
  ) as Record<"red" | "blue" | "yellow", Array<(typeof threats extends Map<string, infer T> ? T : never)>>;

  for (let run = 0; run < runs; run += 1) {
    const random = createRandom(run + 1);
    const bags = {
      red: shuffle(laneCatalogs.red, random),
      blue: shuffle(laneCatalogs.blue, random),
      yellow: shuffle(laneCatalogs.yellow, random)
    };
    const seenSignals = new Set<string>();
    const seenTitles = new Set<string>();
    let duplicate = false;

    for (let arrival = 0; arrival < 10; arrival += 1) {
      const sector = outerSectors[(run + arrival) % outerSectors.length]!;
      let arrivalSucceeded = true;
      for (const lane of sector.threatIcons ?? []) {
        if (bags[lane].length === 0) bags[lane] = shuffle(laneCatalogs[lane], random);
        const threat = bags[lane].shift()!;
        seenSignals.add(`threat:${lane}:${threat.cardType}`);
        if (seenTitles.has(threat.id)) duplicate = true;
        seenTitles.add(threat.id);
        if (threat.cardType === "enemy") enemies += 1;
        else hazards += 1;
        const modeledTotal = random(6) + 1 + random(6) + 1 + 3;
        arrivalSucceeded = arrivalSucceeded && modeledTotal >= threat.difficulty;
      }
      if ((sector.threatIcons?.length ?? 0) > 0) {
        serviceArrivals += 1;
        if (arrivalSucceeded) successfulServiceArrivals += 1;
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
    percentDuplicateTitles: duplicateRuns / runs,
    enemyRate: enemies / Math.max(1, enemies + hazards),
    hazardRate: hazards / Math.max(1, enemies + hazards),
    serviceUnlockRate: successfulServiceArrivals / Math.max(1, serviceArrivals)
  };
}

const totalEncounterCards = threats.size + anomalies.size + artifacts.size + contracts.size + escalations.size;
const rarityCounts = countBy(threats.values(), (card) => card.rarity ?? "untagged");
const laneCounts = countBy(threats.values(), (card) => card.threatLane ?? "untagged");
const tempoCounts = countBy(threats.values(), (card) => card.tempo ?? "untagged");
const gearTierCounts = countBy(gear.values(), (item) => item.tier ?? "untagged");
const earlyVariance = simulateGlobalLaneArrivals();

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
console.log(
  `Global bag arrivals: enemies ${percent(earlyVariance.enemyRate)}, hazards ${percent(
    earlyVariance.hazardRate
  )}, modeled all-Threat service unlocks ${percent(earlyVariance.serviceUnlockRate)}`
);
