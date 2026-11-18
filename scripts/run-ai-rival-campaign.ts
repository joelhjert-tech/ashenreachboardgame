import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { PhonePatchPayload } from "../src/client/shared/types.js";
import type { RandomSource } from "../src/game/engine/dice.js";
import { loadCharacters } from "../src/game/content/characters.js";
import { isContractObjectiveComplete } from "../src/game/contracts/objectives.js";
import { matchesScenarioObjective } from "../src/game/rules/scenarioObjectiveTriggers.js";
import { AI_RIVAL_SUPPORTED_SCENARIO_IDS, chooseAiRivalIntent, chooseAiSetupCharacter, chooseAiStartingBonus } from "../src/server/aiRival.js";
import { createPhoneProjection, GameRoomServer, type ConnectedClient } from "../src/server/roomServer.js";
import { createInitialSessionState } from "../src/server/sessionState.js";

const characters = loadCharacters();

// Mix all bits before mapping to dice faces; a modulo of an LCG's low bits
// would correlate consecutive rolls and distort a balance campaign.
function campaignRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return { nextInt(maxExclusive) {
    value += 0x6d2b79f5;
    let mixed = Math.imul(value ^ value >>> 15, 1 | value);
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed);
    return Math.floor(((mixed ^ mixed >>> 14) >>> 0) / 4294967296 * maxExclusive);
  } };
}

export function createAiRivalGame(scenarioId: string, playerCount: number, seed: number, start = true) {
  const initial = createInitialSessionState(`bot-campaign-${scenarioId}-${playerCount}-${seed}`,
    "multiplayer", scenarioId, "rivalry", "standard", playerCount, { lobbyConfigured: true });
  // Offline setup offers are seeded from the join token. Fix this input too;
  // live spectator rooms (start=false) retain their cryptographic join tokens.
  if (start) initial.seats = initial.seats.map((seat) => ({ ...seat,
    joinToken: `offline-campaign:${scenarioId}:${playerCount}:${seed}:${seat.seatId}` }));
  const server = new GameRoomServer(initial, [], campaignRandom(seed), undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, { mode: "simulation" });
  // The lobby requires a human host. Drive its ordinary phone intents with the
  // same policy; the remaining seats are real AI rivals created by the server.
  const hostId = server.joinSeat("Campaign Host").seatId;
  const hostPatch = createPhoneProjection(server.getState(), hostId, false, characters) as unknown as PhonePatchPayload;
  const character = chooseAiSetupCharacter((hostPatch.characterOptions ?? [])
    .filter((option) => option.eligible && !option.developerQa && !option.character.qaOnly)
    .map((option) => option.character), hostPatch.privateRivalry?.objective?.id);
  if (!character) throw new Error("No host operative available");
  server.selectSeatCharacter(hostId, character.id);
  server.selectStartingContract(hostId, [...server.getState().seats[0]!.startingContractOptions].sort()[0]!);
  while ((server.getState().seats[0]!.startingBonusSelections?.length ?? 0) < 2) {
    const seat = server.getState().seats[0]!;
    const bonus = chooseAiStartingBonus(seat.startingBonusOfferOptions ?? []);
    if (!bonus || !seat.startingBonusOfferId) throw new Error("No host provision available");
    server.selectStartingBonus(hostId, seat.startingBonusOfferId, bonus.kind, bonus.id);
  }
  server.setSeatReady(hostId, true);
  for (let i = 1; i < playerCount; i++) server.addAiRival(hostId);
  if (start) server.startSession();
  return server;
}

export function runAiRivalGame(scenarioId: string, playerCount: number, seed: number, maxActions = 3000) {
  const server = createAiRivalGame(scenarioId, playerCount, seed);
  const trace: Array<Record<string, unknown>> = [];
  const rejections: unknown[] = [];
  const missedWinningContracts: Array<{ step: number; seatId: string; contractId: string; chosenReason: string }> = [];
  let failure: string | null = null;
  const clients = new Map(server.getState().seats.map((seat) => [seat.seatId, {
    seatId: seat.seatId, view: "phone", automated: seat.controllerType === "ai",
    onAutomatedRejection: (reason: string) => { rejections.push({ reason, seatId: seat.seatId }); },
    socket: { send(message: string) {
      const parsed = JSON.parse(message);
      if (parsed.type === "INTENT_REJECTED") rejections.push(parsed);
    }, close() {} } as unknown as ConnectedClient["socket"]
  } as ConnectedClient]));
  for (let step = 0; step < maxActions && server.getState().status === "active"; step++) {
    const state = server.getState();
    const decisions = state.seats.map((seat) => {
      const patch = createPhoneProjection(state, seat.seatId, false, characters) as unknown as PhonePatchPayload;
      return { seatId: seat.seatId, patch, decision: chooseAiRivalIntent(patch, seat.seatId) };
    });
    const selected = decisions.find((entry) => entry.decision);
    if (!selected?.decision) { failure = "No bot has a legal policy decision"; break; }
    const { intent, reasonCode } = selected.decision;
    const patch = selected.patch;
    const scenario = patch.activeScenario;
    if (intent.type !== "COMPLETE_CONTRACT" && patch.phase === "action" && !patch.encounter && !patch.activeResolution
      && scenario && scenario.progress + 1 === scenario.threshold && patch.requiredAction?.actorSeatId === selected.seatId) {
      for (const contract of patch.activeContractCards ?? []) {
        const progress = patch.self?.character.activeContracts?.find((entry) => entry.contractId === contract.id)
          ?? (patch.self?.character.activeContract?.contractId === contract.id ? patch.self.character.activeContract : null);
        if (progress && isContractObjectiveComplete(contract, progress) && matchesScenarioObjective(scenario.id, {
          type: "contractCompleted", contractId: contract.id
        })) missedWinningContracts.push({ step, seatId: selected.seatId, contractId: contract.id, chosenReason: reasonCode });
      }
    }
    trace.push({ step, sequence: state.sequence, phase: state.phase, activeSeat: state.turnOrder[state.activeSeatIndex],
      actor: selected.seatId, sector: state.players.find((p) => p.seatId === selected.seatId)?.sectorId,
      escalation: state.escalationLevel, resolution: state.activeResolution?.stage,
      encounter: state.currentEncounter?.id, reason: reasonCode, intent });
    try { server.handleIntent(clients.get(selected.seatId)!, intent); }
    catch (error) { failure = String(error); break; }
    if (rejections.length) { failure = "Server rejected bot intent"; break; }
    if (server.getState().sequence === state.sequence) { failure = "Bot intent made no progress"; break; }
  }
  const state = server.getState();
  const turns = state.eventLog.filter((event) => (event as { type?: string }).type === "TURN_COMPLETED").length;
  if (state.status !== "ended" && !failure) failure = `Exceeded ${maxActions} actions`;
  const observations = failure ? Object.fromEntries(state.seats.map((seat) => [seat.seatId,
    createPhoneProjection(state, seat.seatId, false, characters)])) : undefined;
  return { scenarioId, playerCount, seed, status: state.status, failure, actions: trace.length, turns,
    winnerSeatId: state.winnerSeatId, result: state.scenarioResult, escalation: state.escalationLevel,
    scenarioProgress: state.scenarioProgress,
    objectiveEvents: state.eventLog.filter((event) => (event as { type?: string }).type === "SCENARIO_OBJECTIVE_PROGRESS_TRIGGERED").length,
    confrontations: trace.filter((entry) => entry.reason === "scenario-confrontation").length,
    players: state.players.map((p) => ({ seatId: p.seatId, character: p.character.id, sector: p.sectorId,
      status: p.character.status, wounds: p.character.wounds, trophies: p.character.trophies,
      salvage: p.character.salvage, stats: p.character.stats, scars: p.character.scars })),
    missedWinningContracts, rejections, trace, eventLog: state.eventLog, observations, failureState: failure ? state : undefined };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const get = (name: string, fallback: string) => args.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;
  const seedCount = Number(get("seeds", "3"));
  const firstSeed = Number(get("first-seed", "1"));
  const counts = get("players", "2,4,6").split(",").map(Number);
  const scenarios = get("scenarios", [...AI_RIVAL_SUPPORTED_SCENARIO_IDS].join(",")).split(",");
  const output = resolve(get("output", "node_modules/.cache/ai-rival-campaign"));
  mkdirSync(output, { recursive: true });
  const summaries = [];
  for (const scenario of scenarios) for (const count of counts) for (let seed = firstSeed; seed < firstSeed + seedCount; seed++) {
    const game = runAiRivalGame(scenario, count, seed, Number(get("max-actions", "3000")));
    writeFileSync(resolve(output, `${scenario}-${count}-${seed}.json`), JSON.stringify(game, null, 2));
    const { trace, eventLog, observations, failureState, ...summary } = game;
    summaries.push(summary);
    console.log(JSON.stringify({ scenario, players: count, seed, status: game.status, failure: game.failure,
      turns: game.turns, actions: game.actions, winner: game.winnerSeatId, result: game.result }));
  }
  writeFileSync(resolve(output, "summary.json"), JSON.stringify(summaries, null, 2));
  if (summaries.some((game) => game.failure)) process.exitCode = 1;
}
