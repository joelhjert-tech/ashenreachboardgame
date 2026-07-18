import { loadAnomalyCards } from "../src/game/content/anomalies.js";
import { loadContracts } from "../src/game/content/contracts.js";
import { loadEscalationCards } from "../src/game/content/escalations.js";
import { loadFollowers } from "../src/game/content/followers.js";
import { loadGear } from "../src/game/content/gear.js";
import { loadThreatCards } from "../src/game/content/threats.js";
import { BOARD_TEXT_EFFECTS } from "../src/game/data/boardTextEffects.js";
import { getShopGearCost, getShopGearSellValue } from "../src/game/rules/shopAvailability.js";

type EconomyHit = { source: string; kind: string; amount: number | null };

function collectEconomyHits(value: unknown, source: string, hits: EconomyHit[], seen = new Set<unknown>()): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectEconomyHits(entry, `${source}[${index}]`, hits, seen));
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.type === "string" && ["gain_salvage", "lose_salvage", "gain_trophy"].includes(record.type)) {
    hits.push({ source, kind: record.type, amount: typeof record.amount === "number" ? record.amount : null });
  }
  for (const [key, entry] of Object.entries(record)) collectEconomyHits(entry, `${source}.${key}`, hits, seen);
}

const profiles = [
  { id: "combat", salvagePerTurn: 0.20, spendPerTurn: 0.22, trophyPerTurn: 0.75, contractPerTurn: 0.10 },
  { id: "signal", salvagePerTurn: 0.24, spendPerTurn: 0.18, trophyPerTurn: 0.35, contractPerTurn: 0.11 },
  { id: "guile", salvagePerTurn: 0.31, spendPerTurn: 0.25, trophyPerTurn: 0.30, contractPerTurn: 0.10 },
  { id: "mission", salvagePerTurn: 0.22, spendPerTurn: 0.16, trophyPerTurn: 0.30, contractPerTurn: 0.17 },
  { id: "mixed", salvagePerTurn: 0.24, spendPerTurn: 0.20, trophyPerTurn: 0.43, contractPerTurn: 0.12 },
  { id: "conservative", salvagePerTurn: 0.22, spendPerTurn: 0.10, trophyPerTurn: 0.40, contractPerTurn: 0.11 },
  { id: "aggressive", salvagePerTurn: 0.25, spendPerTurn: 0.30, trophyPerTurn: 0.44, contractPerTurn: 0.12 }
] as const;

function simulate(startingSalvage: number) {
  return profiles.map((profile) => ({
    profile: profile.id,
    checkpoints: [5, 10, 15, 20].map((turns) => {
      const gained = Math.floor(turns * profile.salvagePerTurn);
      const desiredSpend = Math.floor(turns * profile.spendPerTurn);
      const spent = Math.min(startingSalvage + gained, desiredSpend);
      const trophyValue = Math.floor(turns * profile.trophyPerTurn);
      const completedContracts = Math.floor(turns * profile.contractPerTurn);
      return {
        turns,
        salvageGained: gained,
        salvageSpent: spent,
        salvageRemaining: startingSalvage + gained - spent,
        estimatedPurchasesOrServices: Math.floor(spent / 2),
        trophyValue,
        estimatedStatAdvancements: trophyValue >= 6 ? 1 : 0,
        completedContracts,
        artifactExchangeReady: completedContracts >= 3,
        unaffordableDesiredPurchases: Math.max(0, desiredSpend - spent)
      };
    })
  }));
}

const hits: EconomyHit[] = [];
for (const [id, card] of loadThreatCards()) collectEconomyHits(card, `threat:${id}`, hits);
for (const [id, card] of loadContracts()) collectEconomyHits(card, `contract:${id}`, hits);
for (const [id, card] of loadAnomalyCards()) collectEconomyHits(card, `anomaly:${id}`, hits);
for (const [id, card] of loadEscalationCards()) collectEconomyHits(card, `escalation:${id}`, hits);
for (const [id, card] of loadFollowers()) collectEconomyHits(card, `follower:${id}`, hits);
for (const [id, effect] of Object.entries(BOARD_TEXT_EFFECTS)) collectEconomyHits(effect, `board:${id}`, hits);

const gear = [...loadGear().values()];
const normalShopGear = gear.filter((item) => item.tier !== "artifact" && item.normalShopCommon === true);
const artifactGear = gear.filter((item) => item.tier === "artifact" && !item.id.startsWith("qa_"));
const prices = normalShopGear.map(getShopGearCost);

const result = {
  generatedFromCanonicalContent: true,
  caveat: "Deterministic estimates are a balance model, not playtest evidence.",
  catalog: {
    normalShopEquipment: normalShopGear.length,
    artifactGearOptions: artifactGear.length,
    priceMinimum: Math.min(...prices),
    priceMaximum: Math.max(...prices),
    priceAverage: Number((prices.reduce((sum, value) => sum + value, 0) / prices.length).toFixed(2)),
    saleProfitViolations: normalShopGear.filter((item) => (getShopGearSellValue(item) ?? 0) > getShopGearCost(item)).map((item) => item.id)
  },
  authoredEffects: {
    gainSalvage: hits.filter((hit) => hit.kind === "gain_salvage"),
    loseSalvage: hits.filter((hit) => hit.kind === "lose_salvage"),
    gainTrophy: hits.filter((hit) => hit.kind === "gain_trophy")
  },
  simulations: {
    solo: simulate(4),
    multiplayerPerOperative: simulate(3)
  }
};

console.log(JSON.stringify(result, null, 2));
