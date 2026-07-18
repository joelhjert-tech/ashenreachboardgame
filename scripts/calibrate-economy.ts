import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runEconomyCalibration } from "./economy-calibration-model.js";

const result = runEconomyCalibration();
const outputDirectory = resolve(".tmp-playtest", "economy-calibration");
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(resolve(outputDirectory, "results.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");

const allOperatives = result.runs.flatMap((run) => run.operatives.map((operative) => ({ profileId: run.profileId, seed: run.seed, ...operative.final })));
const averages = Object.fromEntries(result.profiles.map((profileId) => {
  const values = allOperatives.filter((entry) => entry.profileId === profileId);
  const average = (field: keyof typeof values[number]) => Number((values.reduce((sum, entry) => sum + Number(entry[field] ?? 0), 0) / values.length).toFixed(2));
  const purchaseTurns = values.map((entry) => entry.firstPurchaseTurn).filter((value): value is number => value !== null);
  const exchangeTurns = values.map((entry) => entry.firstArtifactExchangeTurn).filter((value): value is number => value !== null);
  const purchases = values.reduce((sum, entry) => sum + entry.purchases, 0);
  const rejected = values.reduce((sum, entry) => sum + entry.unaffordableDesiredActions, 0);
  return [profileId, {
    operativeSamples: values.length,
    salvageRemaining: average("salvage"),
    salvageGained: average("salvageGained"),
    salvageLost: average("salvageLost"),
    salvageSpent: average("salvageSpent"),
    purchases: average("purchases"),
    firstPurchaseTurn: purchaseTurns.length ? Number((purchaseTurns.reduce((sum, value) => sum + value, 0) / purchaseTurns.length).toFixed(2)) : null,
    affordableDesiredActionRate: purchases + rejected ? Number((purchases / (purchases + rejected)).toFixed(3)) : null,
    services: average("services"),
    unaffordableDesiredActions: average("unaffordableDesiredActions"),
    zeroSalvageTurns: average("zeroSalvageTurns"),
    advancements: average("advancements"),
    completedContractsRemaining: average("completedContracts"),
    artifactExchanges: average("artifactExchanges"),
    firstArtifactExchangeTurn: exchangeTurns.length ? Number((exchangeTurns.reduce((sum, value) => sum + value, 0) / exchangeTurns.length).toFixed(2)) : null
  }];
}));

console.log(JSON.stringify({ evidenceKind: result.evidenceKind, runs: result.runs.length, operativeSamples: allOperatives.length, rawResults: resolve(outputDirectory, "results.json"), averages }, null, 2));
