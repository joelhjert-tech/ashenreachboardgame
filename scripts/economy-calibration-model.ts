import { loadCharacters } from "../src/game/content/characters.js";
import { loadContracts } from "../src/game/content/contracts.js";
import { loadGear } from "../src/game/content/gear.js";
import { loadThreatCards } from "../src/game/content/threats.js";
import { getShopGearCost, getShopGearSellValue } from "../src/game/rules/shopAvailability.js";
import { getStatUpgradeCost, NORMAL_STAT_UPGRADE_CAP } from "../src/game/rules/statUpgrades.js";
import { NORMAL_STARTING_SALVAGE, SOLO_STARTING_SALVAGE } from "../src/game/rules/startingLoadout.js";
import type { Stat } from "../src/game/schema/character.schema.js";

export const ECONOMY_CALIBRATION_SEEDS = [11, 23, 37, 53, 71] as const;
export const ECONOMY_CHECKPOINTS = [1, 5, 10, 15, 20, 30] as const;

export type EconomyLedgerEventType =
  | "salvage_gain"
  | "salvage_loss"
  | "salvage_payment"
  | "salvage_spend"
  | "sale"
  | "trophy_gain"
  | "trophy_spend"
  | "contract_completed"
  | "completed_contract_spend"
  | "artifact_exchange_started"
  | "artifact_selected"
  | "transaction_rejected";

export type EconomyResource = "salvage" | "trophies" | "completedContracts" | "artifacts";

export interface EconomyLedgerEvent {
  runId: string;
  round: number;
  operativeTurn: number;
  operativeId: string;
  characterId: string;
  sourceStableId: string;
  eventType: EconomyLedgerEventType;
  resource: EconomyResource;
  amountBefore: number;
  delta: number;
  amountAfter: number;
  transactionId: string;
  replayStatus: "accepted" | "rejected";
}

interface Policy {
  salvageGainChance: number;
  salvageLossChance: number;
  trophyChance: number;
  contractChance: number;
  shopChance: number;
  serviceChance: number;
  saleChance: number;
  advancementChance: number;
  exchangeChance: number;
}

export interface EconomyCalibrationProfile {
  id: string;
  mode: "solo" | "coop" | "rivalry";
  characterIds: string[];
  policy: Policy;
}

export const ECONOMY_CALIBRATION_PROFILES: EconomyCalibrationProfile[] = [
  { id: "solo-mixed-mira", mode: "solo", characterIds: ["cinder-monk"], policy: { salvageGainChance: .24, salvageLossChance: .14, trophyChance: .44, contractChance: .12, shopChance: .28, serviceChance: .12, saleChance: .04, advancementChance: .56, exchangeChance: .60 } },
  { id: "solo-combat-bjornis", mode: "solo", characterIds: ["char_bjornis"], policy: { salvageGainChance: .20, salvageLossChance: .18, trophyChance: .76, contractChance: .10, shopChance: .30, serviceChance: .10, saleChance: .03, advancementChance: .70, exchangeChance: .52 } },
  { id: "solo-signal-lane", mode: "solo", characterIds: ["signal-witch"], policy: { salvageGainChance: .25, salvageLossChance: .12, trophyChance: .34, contractChance: .12, shopChance: .24, serviceChance: .14, saleChance: .04, advancementChance: .48, exchangeChance: .58 } },
  { id: "solo-guile-joss", mode: "solo", characterIds: ["black-ledger-agent"], policy: { salvageGainChance: .32, salvageLossChance: .15, trophyChance: .30, contractChance: .11, shopChance: .36, serviceChance: .15, saleChance: .07, advancementChance: .45, exchangeChance: .62 } },
  { id: "solo-mission-senna", mode: "solo", characterIds: ["rift-cartographer"], policy: { salvageGainChance: .24, salvageLossChance: .12, trophyChance: .31, contractChance: .18, shopChance: .22, serviceChance: .10, saleChance: .03, advancementChance: .44, exchangeChance: .78 } },
  { id: "coop-2", mode: "coop", characterIds: ["char_bjornis", "signal-witch"], policy: { salvageGainChance: .23, salvageLossChance: .14, trophyChance: .52, contractChance: .12, shopChance: .27, serviceChance: .12, saleChance: .04, advancementChance: .55, exchangeChance: .62 } },
  { id: "coop-3", mode: "coop", characterIds: ["cinder-monk", "black-ledger-agent", "signal-witch"], policy: { salvageGainChance: .25, salvageLossChance: .14, trophyChance: .43, contractChance: .12, shopChance: .28, serviceChance: .13, saleChance: .04, advancementChance: .52, exchangeChance: .64 } },
  { id: "coop-4", mode: "coop", characterIds: ["char_bjornis", "signal-witch", "black-ledger-agent", "rift-cartographer"], policy: { salvageGainChance: .25, salvageLossChance: .15, trophyChance: .47, contractChance: .13, shopChance: .29, serviceChance: .12, saleChance: .04, advancementChance: .54, exchangeChance: .66 } },
  { id: "rivalry-2", mode: "rivalry", characterIds: ["black-ledger-agent", "char_bjornis"], policy: { salvageGainChance: .25, salvageLossChance: .17, trophyChance: .50, contractChance: .11, shopChance: .31, serviceChance: .11, saleChance: .05, advancementChance: .58, exchangeChance: .58 } }
];

interface OperativeCalibrationState {
  operativeId: string;
  characterId: string;
  salvage: number;
  trophies: number;
  completedContracts: number;
  artifacts: number;
  stats: Record<Stat, number>;
  salvageGained: number;
  salvageLost: number;
  salvageSpent: number;
  purchases: number;
  services: number;
  sales: number;
  unaffordableDesiredActions: number;
  advancements: number;
  artifactExchanges: number;
  firstPurchaseTurn: number | null;
  firstArtifactExchangeTurn: number | null;
  zeroSalvageTurns: number;
}

export interface EconomyCheckpoint {
  operativeTurn: number;
  salvage: number;
  salvageGained: number;
  salvageLost: number;
  salvageSpent: number;
  purchases: number;
  services: number;
  sales: number;
  unaffordableDesiredActions: number;
  trophies: number;
  advancements: number;
  completedContracts: number;
  artifactExchanges: number;
}

export interface EconomyCalibrationRun {
  runId: string;
  profileId: string;
  mode: EconomyCalibrationProfile["mode"];
  seed: number;
  evidenceKind: "deterministic-canonical-content-model";
  cappedAtOperativeTurn: 30;
  operatives: Array<{
    operativeId: string;
    characterId: string;
    checkpoints: EconomyCheckpoint[];
    final: Omit<OperativeCalibrationState, "stats">;
  }>;
  ledger: EconomyLedgerEvent[];
}

export interface EconomyCalibrationResult {
  evidenceKind: "automated-calibration-not-human-playtest";
  seeds: readonly number[];
  profiles: string[];
  runs: EconomyCalibrationRun[];
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function hash(value: string): number {
  let output = 2166136261;
  for (const character of value) output = Math.imul(output ^ character.charCodeAt(0), 16777619);
  return output >>> 0;
}

function choose<T>(values: readonly T[], random: () => number): T {
  if (!values.length) throw new Error("Calibration pool is empty");
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))]!;
}

function cloneFinal(state: OperativeCalibrationState): Omit<OperativeCalibrationState, "stats"> {
  const { stats: _stats, ...output } = state;
  return output;
}

export function runEconomyCalibration(): EconomyCalibrationResult {
  const characters = loadCharacters();
  const contracts = [...loadContracts().values()].filter((card) => !card.id.startsWith("qa_"));
  const threats = [...loadThreatCards().values()];
  const enemies = threats.filter(
    (card): card is typeof card & { trophyValue: number } =>
      card.cardType === "enemy" && "trophyValue" in card && typeof card.trophyValue === "number" && card.trophyValue > 0
  );
  const normalShopGear = [...loadGear().values()].filter((item) => item.tier !== "artifact" && item.normalShopCommon === true);
  const lossSources = threats.filter((card) => JSON.stringify(card).includes('"lose_salvage"'));
  const salvageSources = ["latchspire-raider", "anomaly-bellrain-inversion", ...contracts.map((card) => card.id)];
  const runs: EconomyCalibrationRun[] = [];

  for (const profile of ECONOMY_CALIBRATION_PROFILES) {
    for (const seed of ECONOMY_CALIBRATION_SEEDS) {
      const runId = `${profile.id}:seed-${seed}`;
      const random = seededRandom(seed ^ hash(profile.id));
      const ledger: EconomyLedgerEvent[] = [];
      let transactionSequence = 0;
      const checkpoints = new Map<string, EconomyCheckpoint[]>();
      const operatives: OperativeCalibrationState[] = profile.characterIds.map((characterId, index) => {
        const character = characters.get(characterId);
        if (!character) throw new Error(`Missing calibration character ${characterId}`);
        const operativeId = `seat-${index + 1}`;
        checkpoints.set(operativeId, []);
        return {
          operativeId,
          characterId,
          salvage: profile.mode === "solo" ? SOLO_STARTING_SALVAGE : NORMAL_STARTING_SALVAGE,
          trophies: 0,
          completedContracts: 0,
          artifacts: 0,
          stats: { ...character.stats },
          salvageGained: 0,
          salvageLost: 0,
          salvageSpent: 0,
          purchases: 0,
          services: 0,
          sales: 0,
          unaffordableDesiredActions: 0,
          advancements: 0,
          artifactExchanges: 0,
          firstPurchaseTurn: null,
          firstArtifactExchangeTurn: null,
          zeroSalvageTurns: 0
        };
      });

      const record = (state: OperativeCalibrationState, operativeTurn: number, sourceStableId: string, eventType: EconomyLedgerEventType, resource: EconomyResource, before: number, delta: number, after: number, replayStatus: EconomyLedgerEvent["replayStatus"] = "accepted") => {
        transactionSequence += 1;
        ledger.push({ runId, round: operativeTurn, operativeTurn, operativeId: state.operativeId, characterId: state.characterId, sourceStableId, eventType, resource, amountBefore: before, delta, amountAfter: after, transactionId: `${runId}:${transactionSequence}`, replayStatus });
      };

      for (const state of operatives) record(state, 0, "session-start", "salvage_gain", "salvage", 0, state.salvage, state.salvage);

      for (let operativeTurn = 1; operativeTurn <= 30; operativeTurn += 1) {
        for (const state of operatives) {
          const policy = profile.policy;
          if (random() < policy.salvageGainChance) {
            const before = state.salvage;
            state.salvage += 1;
            state.salvageGained += 1;
            record(state, operativeTurn, choose(salvageSources, random), "salvage_gain", "salvage", before, 1, state.salvage);
          }
          if (random() < policy.salvageLossChance) {
            const before = state.salvage;
            state.salvage = Math.max(0, state.salvage - 1);
            const actual = state.salvage - before;
            state.salvageLost += Math.abs(actual);
            record(state, operativeTurn, choose(lossSources, random).id, "salvage_loss", "salvage", before, actual, state.salvage);
          }
          if (random() < policy.trophyChance) {
            const enemy = choose(enemies, random);
            const before = state.trophies;
            state.trophies += enemy.trophyValue;
            record(state, operativeTurn, enemy.id, "trophy_gain", "trophies", before, enemy.trophyValue, state.trophies);
          }
          const upgradeable = (Object.entries(state.stats) as Array<[Stat, number]>).filter(([, value]) => value < NORMAL_STAT_UPGRADE_CAP).sort((a, b) => a[1] - b[1]);
          if (upgradeable.length && random() < policy.advancementChance) {
            const [stat, value] = upgradeable[0]!;
            const cost = getStatUpgradeCost(value);
            if (state.trophies >= cost) {
              const before = state.trophies;
              state.trophies -= cost;
              state.stats[stat] += 1;
              state.advancements += 1;
              record(state, operativeTurn, `stat:${stat}`, "trophy_spend", "trophies", before, -cost, state.trophies);
            }
          }
          if (random() < policy.contractChance) {
            const contract = choose(contracts, random);
            const before = state.completedContracts;
            state.completedContracts += 1;
            record(state, operativeTurn, contract.id, "contract_completed", "completedContracts", before, 1, state.completedContracts);
          }
          if (state.completedContracts >= 3 && random() < policy.exchangeChance) {
            record(state, operativeTurn, "trade-missions-for-artifact", "artifact_exchange_started", "completedContracts", state.completedContracts, 0, state.completedContracts);
            const beforeContracts = state.completedContracts;
            state.completedContracts -= 3;
            record(state, operativeTurn, "trade-missions-for-artifact", "completed_contract_spend", "completedContracts", beforeContracts, -3, state.completedContracts);
            const beforeArtifacts = state.artifacts;
            state.artifacts += 1;
            state.artifactExchanges += 1;
            state.firstArtifactExchangeTurn ??= operativeTurn;
            record(state, operativeTurn, "artifact-private-selection", "artifact_selected", "artifacts", beforeArtifacts, 1, state.artifacts);
          }
          if (random() < policy.shopChance) {
            const item = choose(normalShopGear, random);
            const cost = getShopGearCost(item);
            if (state.salvage >= cost) {
              const before = state.salvage;
              state.salvage -= cost;
              state.salvageSpent += cost;
              state.purchases += 1;
              state.firstPurchaseTurn ??= operativeTurn;
              record(state, operativeTurn, item.id, "salvage_spend", "salvage", before, -cost, state.salvage);
            } else {
              state.unaffordableDesiredActions += 1;
              record(state, operativeTurn, item.id, "transaction_rejected", "salvage", state.salvage, 0, state.salvage, "rejected");
            }
          }
          if (random() < policy.serviceChance) {
            const cost = random() < .55 ? 1 : 2;
            if (state.salvage >= cost) {
              const before = state.salvage;
              state.salvage -= cost;
              state.salvageSpent += cost;
              state.services += 1;
              record(state, operativeTurn, cost === 1 ? "buy-supplies" : "buy-treatment", "salvage_payment", "salvage", before, -cost, state.salvage);
            } else {
              state.unaffordableDesiredActions += 1;
              record(state, operativeTurn, "service", "transaction_rejected", "salvage", state.salvage, 0, state.salvage, "rejected");
            }
          }
          if (state.sales === 0 && operativeTurn >= 8 && random() < policy.saleChance) {
            const character = characters.get(state.characterId)!;
            const saleCandidates = (character.startingGear ?? []).map((id) => loadGear().get(id)).filter((item) => item && item.tier !== "artifact" && getShopGearSellValue(item) !== null);
            if (saleCandidates.length) {
              const item = choose(saleCandidates, random)!;
              const value = getShopGearSellValue(item) ?? 0;
              const before = state.salvage;
              state.salvage += value;
              state.salvageGained += value;
              state.sales += 1;
              record(state, operativeTurn, item.id, "sale", "salvage", before, value, state.salvage);
            }
          }
          if (state.salvage === 0) state.zeroSalvageTurns += 1;
          if ((ECONOMY_CHECKPOINTS as readonly number[]).includes(operativeTurn)) {
            checkpoints.get(state.operativeId)!.push({ operativeTurn, salvage: state.salvage, salvageGained: state.salvageGained, salvageLost: state.salvageLost, salvageSpent: state.salvageSpent, purchases: state.purchases, services: state.services, sales: state.sales, unaffordableDesiredActions: state.unaffordableDesiredActions, trophies: state.trophies, advancements: state.advancements, completedContracts: state.completedContracts, artifactExchanges: state.artifactExchanges });
          }
        }
      }

      runs.push({ runId, profileId: profile.id, mode: profile.mode, seed, evidenceKind: "deterministic-canonical-content-model", cappedAtOperativeTurn: 30, operatives: operatives.map((state) => ({ operativeId: state.operativeId, characterId: state.characterId, checkpoints: checkpoints.get(state.operativeId)!, final: cloneFinal(state) })), ledger });
    }
  }

  return { evidenceKind: "automated-calibration-not-human-playtest", seeds: ECONOMY_CALIBRATION_SEEDS, profiles: ECONOMY_CALIBRATION_PROFILES.map((profile) => profile.id), runs };
}
