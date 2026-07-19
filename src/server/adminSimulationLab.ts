import { createHash, randomUUID } from "node:crypto";
import { loadCharacters } from "../game/content/characters.js";
import { loadContracts } from "../game/content/contracts.js";
import { loadFollowers } from "../game/content/followers.js";
import { loadGear } from "../game/content/gear.js";
import { loadThreatCards } from "../game/content/threats.js";
import { createSeededRandomSource, type RandomSource } from "../game/engine/dice.js";
import { reduceGameState } from "../game/engine/reducer.js";
import type { EncounterEffect, ThreatCard } from "../game/schema/card.schema.js";
import type { Character, Stat } from "../game/schema/character.schema.js";
import type { GearItem } from "../game/schema/gear.schema.js";
import type { GameAction } from "../game/engine/actions.js";
import type { GameState, PlayerState } from "../game/schema/session.schema.js";
import { ensureOwnedGearInstanceIds } from "../game/rules/equipmentSuppression.js";
import { createInitialScarDecks } from "../game/rules/scarSystem.js";
import { getOwnedScarAdaptationControls } from "../game/rules/scarAdaptationControls.js";
import { createInitialSessionState } from "./sessionState.js";
import { GameRoomServer, type RoomExecutionServices } from "./roomServer.js";
import { AdminContentError, type AdminContentEditor } from "./adminContentEditor.js";
import type {
  AdminSimulationBatchJob,
  AdminSimulationBatchResult,
  AdminSimulationBatchStartRequest,
  AdminSimulationCardDescriptor,
  AdminSimulationContinueRequest,
  AdminSimulationPrompt,
  AdminSimulationResult,
  AdminSimulationStartRequest,
  CanonicalPromptChoice,
  SimulationEffectTrace,
  SimulationIsolationEvidence,
  SimulationRandomTrace,
  SimulationStateDiffRow,
  SimulationStateSummary
} from "../shared/adminSimulation.js";

const STATS: Stat[] = ["command", "grit", "signal", "guile", "forge"];
const MAX_BATCH_RUNS = 1000;
const MAX_SESSIONS_PER_ADMIN = 32;
const SESSION_TTL_MS = 30 * 60 * 1000;
const BATCH_TTL_MS = 15 * 60 * 1000;

function stableSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const NON_SEMANTIC_SIMULATION_KEYS = new Set([
  "createdAt",
  "decisionId",
  "choiceId",
  "selectionId",
  "sourceEventId",
  "eventId",
  "simulationId"
]);

function deterministicSemanticValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deterministicSemanticValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !NON_SEMANTIC_SIMULATION_KEYS.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, deterministicSemanticValue(entry)])
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AdminContentError("Simulation card must be an object", 422);
  return value as Record<string, unknown>;
}

function assertOnlyKeys(value: unknown, allowed: readonly string[], label: string): void {
  const record = asRecord(value);
  const unsupported = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unsupported.length) throw new AdminContentError(`${label} contains unsupported fields: ${unsupported.join(", ")}`, 422);
}

function validateStartRequestShape(request: AdminSimulationStartRequest): void {
  assertOnlyKeys(request, ["mode", "cardId", "cardFamily", "expectedRevision", "draft", "operative", "dice", "outcomeMode", "activateScarAdaptation"], "Simulation request");
  assertOnlyKeys(request.operative, ["preset", "characterId", "cloneSeatId", "stats", "wounds", "salvage", "scarIds", "gearIds", "equipGearIds"], "Operative setup");
  assertOnlyKeys(request.dice, ["mode", "values", "seed"], "Dice setup");
  if (request.dice.values && request.dice.values.length > 32) throw new AdminContentError("Fixed dice input exceeds the 32-value safety limit", 422);
}

function validateContinueRequestShape(request: AdminSimulationContinueRequest): void {
  assertOnlyKeys(request, ["mode", "simulationId", "promptId", "choice"], "Simulation continuation");
  assertOnlyKeys(request.choice, ["kind", "optionId"], "Prompt choice");
}

function cardName(record: Record<string, unknown>): string {
  return String(record.title ?? record.name ?? record.enemyName ?? record.id ?? "Unknown card");
}

function directEffect(record: Record<string, unknown>): EncounterEffect | null {
  const reward = record.reward && typeof record.reward === "object" && !Array.isArray(record.reward)
    ? record.reward as Record<string, unknown>
    : {};
  const missionEffects = Array.isArray(reward.effects)
    ? reward.effects.filter((entry): entry is EncounterEffect => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
    : [];
  if (missionEffects.length === 1) return missionEffects[0]!;
  if (missionEffects.length > 1) return { type: "sequence", effects: missionEffects };
  for (const field of ["resolveEffect", "effect", "successEffect", "defeatReward", "failureEffect", "failEffect", "woundOnLoss"]) {
    const candidate = record[field];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) return candidate as EncounterEffect;
  }
  return null;
}

function isSimulatable(record: Record<string, unknown>): boolean {
  if (record.type === "threat" && ["enemy", "hazard"].includes(String(record.cardType))) return true;
  if (directEffect(record)) return true;
  return ["passiveModifiers", "triggeredEffects", "grantedAbilities"].some((field) => Array.isArray(record[field]) && (record[field] as unknown[]).length > 0);
}

function toSimulatableThreat(record: Record<string, unknown>, outcomeMode: AdminSimulationStartRequest["outcomeMode"]): ThreatCard {
  if (record.type === "threat" && (record.cardType === "enemy" || record.cardType === "hazard") && outcomeMode === "calculated") return record as unknown as ThreatCard;
  const branchEffect = outcomeMode === "failure"
    ? (record.woundOnLoss ?? record.failEffect ?? record.failureEffect)
    : (record.defeatReward ?? record.successEffect ?? record.resolveEffect ?? record.effect);
  const effect = branchEffect && typeof branchEffect === "object" && !Array.isArray(branchEffect)
    ? branchEffect as EncounterEffect
    : directEffect(record);
  if (!effect) {
    const message = String(record.type) === "scar" ? "SCAR HAS NO EXECUTABLE EFFECTS" : "NO SIMULATABLE EFFECTS";
    throw new AdminContentError(`${message}: This card contains descriptive or passive data only`, 422);
  }
  const forcedSuccess = outcomeMode !== "failure";
  return {
    id: String(record.id),
    type: "threat",
    cardType: "hazard",
    title: cardName(record),
    text: String(record.text ?? record.rulesText ?? record.resolutionSummary ?? "Test this canonical effect."),
    flavor: String(record.flavor ?? record.lore ?? "Simulation-only effect harness."),
    severity: 1,
    stat: (record.testStat ?? record.stat ?? "command") as Stat,
    difficulty: forcedSuccess ? 2 : 12,
    successEffect: effect,
    failEffect: effect
  };
}

class ControlledRandomSource implements RandomSource {
  private index = 0;
  private readonly seeded: RandomSource;
  readonly consumed: number[] = [];
  readonly requestedSides: number[] = [];
  readonly rerolled: number[] = [];

  constructor(
    readonly mode: SimulationRandomTrace["mode"],
    readonly seed: string,
    readonly fixedValues: number[]
  ) {
    this.seeded = createSeededRandomSource(stableSeed(seed));
  }

  nextInt(maxExclusive: number): number {
    this.requestedSides.push(maxExclusive);
    let zeroBased: number;
    if (this.mode === "fixed") {
      const face = this.fixedValues[this.index];
      if (face === undefined) throw new AdminContentError(`Fixed dice exhausted after ${this.index} canonical roll values`, 422);
      if (!Number.isInteger(face) || face < 1 || face > maxExclusive) throw new AdminContentError(`Fixed die ${face} is invalid for d${maxExclusive}`, 422);
      zeroBased = face - 1;
      this.index += 1;
    } else {
      zeroBased = this.seeded.nextInt(maxExclusive);
    }
    this.consumed.push(zeroBased + 1);
    return zeroBased;
  }

  trace(): SimulationRandomTrace {
    return {
      mode: this.mode,
      requested: [...this.requestedSides],
      consumed: [...this.consumed],
      unused: this.mode === "fixed" ? this.fixedValues.slice(this.index) : [],
      unexpectedRequests: 0,
      rerolled: [...this.rerolled],
      seed: this.seed
    };
  }
}

export class SimulationExecutionContext {
  readonly detachedEvents: GameAction[] = [];
  readonly random: ControlledRandomSource;
  broadcastAttempts = 0;
  persistenceAttempts = 0;
  timerAttempts = 0;
  lastActionAttempt: { action: GameAction; state: GameState } | null = null;
  readonly roomServices: RoomExecutionServices;

  constructor(
    readonly simulationId: string,
    readonly initialHash: string,
    readonly seed: string,
    dice: AdminSimulationStartRequest["dice"]
  ) {
    this.random = new ControlledRandomSource(dice.mode, seed, dice.values ?? []);
    this.roomServices = {
      mode: "simulation",
      onBroadcastAttempt: () => { this.broadcastAttempts += 1; },
      onTimerAttempt: () => { this.timerAttempts += 1; },
      onActionAttempt: (action, state) => { this.lastActionAttempt = { action: structuredClone(action), state: structuredClone(state) }; }
    };
  }

  persist(): never {
    this.persistenceAttempts += 1;
    throw new AdminContentError("Persistence is disabled inside SimulationExecutionContext", 500);
  }
}

function hydrateGear(character: Character, gearIds: string[], equipIds: string[], gearCatalog: Map<string, GearItem>, seatId: string): Character {
  const heldGear = gearIds.map((gearId, index) => {
    const item = gearCatalog.get(gearId);
    if (!item) throw new AdminContentError(`Unknown Equipment ${gearId}`, 422);
    return { ...item, instanceId: `simulation:${seatId}:${gearId}:${index}`, currentCharges: item.startingCharges ?? item.charges, maxCharges: item.maxCharges ?? item.charges, exhausted: false };
  });
  const equippedGear = { weapon: null, armor: null, utility: null } as Character["equippedGear"];
  const equippedGearInstances = { weapon: null, armor: null, utility: null } as NonNullable<Character["equippedGearInstances"]>;
  for (const item of heldGear) {
    if (!equipIds.includes(item.id) || equippedGear[item.slot]) continue;
    equippedGear[item.slot] = item.id;
    equippedGearInstances[item.slot] = item.instanceId ?? null;
  }
  return ensureOwnedGearInstanceIds({ ...character, heldGear, equippedGear, equippedGearInstances }, seatId);
}

function buildOperative(state: GameState, request: AdminSimulationStartRequest, liveState: GameState, gearCatalog: Map<string, GearItem>, characters: ReturnType<typeof loadCharacters>): PlayerState {
  const basePlayer = state.players[0]!;
  let source = basePlayer.character;
  if (request.operative.preset === "clone-active") {
    const live = liveState.players.find((entry) => entry.seatId === request.operative.cloneSeatId);
    if (!live) throw new AdminContentError("The selected active operative is unavailable", 422);
    source = structuredClone(live.character);
  } else if (request.operative.preset === "character") {
    const authored = characters.get(request.operative.characterId ?? "");
    if (!authored) throw new AdminContentError("Choose a canonical operative", 422);
    source = structuredClone(authored);
  }
  const presetValue = request.operative.preset === "weak" ? 1 : request.operative.preset === "strong" ? 5 : 3;
  const stats = Object.fromEntries(STATS.map((stat) => [stat, request.operative.stats?.[stat] ?? (["character", "clone-active"].includes(request.operative.preset) ? source.stats[stat] : presetValue)])) as Character["stats"];
  const character = hydrateGear({
    ...source,
    id: request.operative.preset === "custom" ? "simulation-operative" : source.id,
    name: request.operative.preset === "custom" ? "MASTER ALPHA" : source.name,
    currentSpaceId: state.sectors[0]?.id ?? source.currentSpaceId,
    status: "active",
    stats,
    wounds: Math.max(0, request.operative.wounds ?? source.wounds ?? 0),
    salvage: Math.max(0, request.operative.salvage ?? source.salvage ?? 3),
    scars: request.operative.scarIds ?? [...source.scars],
    trophies: source.trophies ?? 0,
    activeContract: null,
    completedContracts: [],
    followers: []
  }, request.operative.gearIds ?? [], request.operative.equipGearIds ?? request.operative.gearIds ?? [], gearCatalog, "seat-1");
  return { ...basePlayer, seatId: "seat-1", sectorId: character.currentSpaceId, character, private: { hand: [], notes: [] } };
}

function summary(state: GameState): SimulationStateSummary {
  const player = state.players[0]!;
  const equippedInstances = new Set(Object.values(player.character.equippedGearInstances ?? {}).filter(Boolean));
  return {
    characterId: player.character.id,
    characterName: player.character.name,
    position: player.character.currentSpaceId,
    stats: { ...player.character.stats },
    wounds: player.character.wounds,
    scars: [...player.character.scars],
    salvage: player.character.salvage ?? 0,
    trophies: player.character.trophies,
    gear: player.character.heldGear.map((item) => ({ id: item.id, instanceId: item.instanceId ?? null, equipped: equippedInstances.has(item.instanceId ?? "") || Object.values(player.character.equippedGear).includes(item.id) })),
    followers: (player.character.followers ?? []).map((entry) => entry.id),
    notes: [...player.private.notes],
    escalation: state.escalationLevel,
    scenarioProgress: { ...state.scenarioProgress },
    phase: state.phase
  };
}

function stateDiff(before: SimulationStateSummary, after: SimulationStateSummary): SimulationStateDiffRow[] {
  const rows: SimulationStateDiffRow[] = [];
  for (const field of Object.keys(before) as Array<keyof SimulationStateSummary>) {
    if (JSON.stringify(before[field]) === JSON.stringify(after[field])) continue;
    const a = before[field]; const b = after[field];
    const change = typeof a === "number" && typeof b === "number" ? `${b - a >= 0 ? "+" : ""}${b - a}` : "changed";
    rows.push({ field, before: a, after: b, change });
  }
  return rows;
}

function flattenEffect(effect: EncounterEffect | null | undefined): EncounterEffect[] {
  if (!effect) return [];
  return effect.type === "sequence" ? effect.effects.flatMap(flattenEffect) : [effect];
}

function prompts(state: GameState): AdminSimulationPrompt[] {
  const result: AdminSimulationPrompt[] = [];
  if (state.pendingEncounterDecision) result.push({ kind: "encounter", id: state.pendingEncounterDecision.decisionId, prompt: state.pendingEncounterDecision.prompt, optionIds: [...state.pendingEncounterDecision.legalOptionIds] });
  if (state.pendingGearEquipChoice) result.push({ kind: "equipment", id: state.pendingGearEquipChoice.choiceId, prompt: `Equip ${state.pendingGearEquipChoice.itemCatalogId} or keep it carried.`, optionIds: ["equip", "keepCarried"] });
  if (state.pendingForcedDestinationChoice) result.push({ kind: "forced-destination", id: state.pendingForcedDestinationChoice.choiceId, prompt: "Choose a legal forced destination.", optionIds: state.pendingForcedDestinationChoice.candidates.map((entry) => entry.sectorId) });
  if (state.pendingEquipmentSuppressionChoice) result.push({ kind: "suppression", id: state.pendingEquipmentSuppressionChoice.choiceId, prompt: "Choose Equipment to suppress.", optionIds: [...state.pendingEquipmentSuppressionChoice.eligibleInstanceIds] });
  if (state.pendingMemoryTaxChoice) result.push({ kind: "memory-tax", id: state.pendingMemoryTaxChoice.choiceId, prompt: "Choose the Memory Tax consequence.", optionIds: [...state.pendingMemoryTaxChoice.legalOptionIds] });
  if (state.pendingScarChoice) result.push({ kind: "choose-scar", id: state.pendingScarChoice.selectionId, prompt: "Choose one of the two deterministic Scar candidates.", optionIds: [...state.pendingScarChoice.candidateIds] });
  return result;
}

function eventSummary(entry: unknown): { type: string; seatId?: string; createdAt?: string; summary?: string } {
  const value = asRecord(entry);
  return { type: String(value.type ?? "UNKNOWN"), ...(typeof value.seatId === "string" ? { seatId: value.seatId } : {}), ...(typeof value.createdAt === "string" ? { createdAt: value.createdAt } : {}), ...(typeof value.summary === "string" ? { summary: value.summary } : {}) };
}

function effectTrace(events: unknown[], diffRows: SimulationStateDiffRow[]): SimulationEffectTrace[] {
  const changed = diffRows.map((entry) => entry.field);
  const traces: SimulationEffectTrace[] = [];
  for (const event of events) {
    const record = asRecord(event);
    if (record.type === "CHECK_ROLLED" || record.type === "COMBAT_RESOLVED") {
      traces.push({ order: traces.length + 1, type: String(record.type), input: { success: record.success, total: record.total, enemyTotal: record.enemyTotal, difficulty: record.difficulty }, status: "information", summary: record.success ? "Canonical roll resolved as success." : "Canonical roll resolved as failure.", changedFields: [] });
      for (const effect of flattenEffect(record.effect as EncounterEffect | undefined)) traces.push({ order: traces.length + 1, type: effect.type, input: effect, status: "pending", summary: "Outcome effect entered the authoritative resolution queue.", changedFields: [] });
    } else if (record.type === "RESOLUTION_APPLIED") {
      for (const effect of flattenEffect(record.effect as EncounterEffect | undefined)) traces.push({ order: traces.length + 1, type: effect.type, input: effect, status: "success", summary: "Applied by the canonical reducer.", changedFields: changed });
    } else if (/RESOLVED|SELECTED/.test(String(record.type))) {
      traces.push({ order: traces.length + 1, type: String(record.type), input: record, status: "success", summary: "Canonical prompt continuation applied.", changedFields: changed });
    }
  }
  return traces;
}

function mismatchWarnings(record: Record<string, unknown>, effects: SimulationEffectTrace[]): string[] {
  const text = String(record.text ?? record.rulesText ?? record.resolutionSummary ?? record.penalty ?? "");
  const warnings: string[] = [];
  const effectTypes = new Set(effects.map((entry) => entry.type));
  if (/wound/i.test(text) && !effectTypes.has("take_wound") && !effectTypes.has("heal_wound")) warnings.push("Authored text mentions Wounds, but the resolved branch has no Wound effect.");
  if (/salvage/i.test(text) && !effectTypes.has("gain_salvage") && !effectTypes.has("lose_salvage") && !effectTypes.has("encounter_payment")) warnings.push("Authored text mentions Salvage, but the resolved branch has no Salvage effect.");
  if (/scar/i.test(text) && !effectTypes.has("gain_scar") && !effectTypes.has("gain_scar_choice")) warnings.push("Authored text mentions a Scar, but the resolved branch has no Scar effect.");
  if (effects.length === 0) warnings.push("The selected outcome produced no executable effect trace.");
  return warnings;
}

interface DetachedSession {
  ownerKey: string;
  simulationId: string;
  cardRevision: string;
  sourceMode: "saved" | "draft";
  record: Record<string, unknown>;
  request: AdminSimulationStartRequest;
  context: SimulationExecutionContext;
  room: GameRoomServer;
  before: SimulationStateSummary;
  liveStateHashBefore: string;
  liveLogLengthBefore: number;
  registryHashBefore: string;
  consumedPromptIds: Set<string>;
  createdAt: number;
  expiresAt: number;
}

interface BatchRecord extends AdminSimulationBatchJob {
  ownerKey: string;
  createdAt: number;
  expiresAt: number;
  cancelled: boolean;
}

export class AdminSimulationLab {
  private readonly gearCatalog = loadGear();
  private readonly characterCatalog = loadCharacters();
  private readonly contractCatalog = loadContracts();
  private readonly followerCatalog = loadFollowers();
  private readonly threatCatalog = loadThreatCards();
  private readonly baseState = createInitialSessionState("simulation-template", "multiplayer", undefined, "co-op", "standard", 1);
  private readonly sessions = new Map<string, DetachedSession>();
  private readonly batches = new Map<string, BatchRecord>();

  constructor(private readonly editor: AdminContentEditor, private readonly now: () => number = () => Date.now()) {}

  private registryHash(): string {
    return hashValue({
      characters: [...this.characterCatalog.keys()].sort(),
      contracts: [...this.contractCatalog.keys()].sort(),
      followers: [...this.followerCatalog.keys()].sort(),
      gear: [...this.gearCatalog.keys()].sort(),
      threats: [...this.threatCatalog.keys()].sort()
    });
  }

  private cleanup(): void {
    const now = this.now();
    for (const [id, session] of this.sessions) if (session.expiresAt <= now) this.sessions.delete(id);
    for (const [id, job] of this.batches) if (job.expiresAt <= now) this.batches.delete(id);
  }

  async getDescriptor(cardId: string, cardFamily: string, liveState?: GameState): Promise<AdminSimulationCardDescriptor> {
    const source = await this.editor.findCard(cardId, cardFamily);
    const record = asRecord(source.record);
    return {
      cardId,
      cardFamily: cardFamily.trim().toLowerCase().replace(/\s+/g, "-") as AdminSimulationCardDescriptor["cardFamily"],
      revision: source.revision,
      record,
      simulatable: isSimulatable(record),
      ...(!isSimulatable(record) ? { unsupportedReason: String(record.type) === "scar" ? "SCAR HAS NO EXECUTABLE EFFECTS" : "NO SIMULATABLE EFFECTS" } : {}),
      activeOperatives: (liveState?.players ?? []).map((player) => ({
        seatId: player.seatId,
        playerName: liveState?.seats.find((seat) => seat.seatId === player.seatId)?.displayName ?? "Player",
        operativeName: player.character.name
      }))
    };
  }

  private makeRoom(state: GameState, threat: ThreatCard, context: SimulationExecutionContext): GameRoomServer {
    const threats = new Map(this.threatCatalog); threats.set(threat.id, threat);
    return new GameRoomServer(
      state,
      context.detachedEvents,
      context.random,
      threats,
      new Map(this.characterCatalog),
      new Map(this.gearCatalog),
      new Map(this.contractCatalog),
      undefined,
      undefined,
      undefined,
      new Map(this.followerCatalog),
      context.roomServices
    );
  }

  private settle(room: GameRoomServer): void {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const state = room.getState();
      if (prompts(state).length > 0 || !state.activeResolution) return;
      room.resolveContinueResolutionIntent({ type: "CONTINUE_RESOLUTION", seatId: "seat-1" });
    }
    throw new AdminContentError("Simulation resolution exceeded the canonical completion limit", 422);
  }

  async start(
    ownerKey: string,
    request: AdminSimulationStartRequest,
    liveState: GameState,
    resolvedSource?: Awaited<ReturnType<AdminContentEditor["findCard"]>>,
    pristineSessionId?: string
  ): Promise<AdminSimulationResult> {
    if (!this.editor.enabled) throw new AdminContentError("Development simulation is disabled", 403);
    validateStartRequestShape(request);
    this.cleanup();
    if ([...this.sessions.values()].filter((entry) => entry.ownerKey === ownerKey).length >= MAX_SESSIONS_PER_ADMIN) {
      throw new AdminContentError("Simulation session limit reached; close an older lab session", 429);
    }
    if ("sourcePath" in (request as unknown as Record<string, unknown>)) throw new AdminContentError("Client paths are not accepted by the Simulation Lab", 422);
    const source = resolvedSource ?? await this.editor.findCard(request.cardId, request.cardFamily);
    if (source.revision !== request.expectedRevision) throw new AdminContentError("The selected card revision is stale", 409);
    const record = request.draft === undefined ? asRecord(source.record) : asRecord(this.editor.validateDraft(source.sourcePath, request.draft));
    if (!isSimulatable(record)) throw new AdminContentError(String(record.type) === "scar" ? "SCAR HAS NO EXECUTABLE EFFECTS" : "NO SIMULATABLE EFFECTS", 422);
    let threat = toSimulatableThreat(record, request.outcomeMode);
    const scarAdaptation = asRecord(record.adaptation ?? {});
    if (record.type === "scar" && request.activateScarAdaptation) {
      const ruleKey = String(scarAdaptation.key ?? "");
      const stat = ruleKey.includes("grit") || ruleKey.includes("elite") || ruleKey.includes("battle") ? "grit"
        : ruleKey.includes("guile") ? "guile"
          : ruleKey.includes("signal") || ruleKey.includes("rift") || ruleKey.includes("relay") || ruleKey.includes("escalation") ? "signal"
            : ruleKey.includes("forge") || ruleKey.includes("repair") || ruleKey.includes("charge") ? "forge"
              : "command";
      threat = { ...threat, stat, ...(ruleKey === "elite-grit-bonus" ? { severity: 5 } : {}) };
    }
    const seed = request.dice.mode === "random" ? randomUUID() : request.dice.seed?.trim() || `${threat.id}:fixed`;
    let synthetic = structuredClone(this.baseState);
    synthetic = {
      ...synthetic,
      sessionId: pristineSessionId ?? `simulation:${hashValue({ cardId: request.cardId, seed, operative: request.operative }).slice(0, 24)}`,
      status: "active",
      phase: "sector",
      activeSeatIndex: 0,
      turnOrder: ["seat-1"],
      seats: synthetic.seats.slice(0, 1).map((seat) => ({ ...seat, displayName: "Administrator", connected: true, ready: true, characterSelected: true })),
      players: [buildOperative(synthetic, record.type === "scar" && request.activateScarAdaptation
        ? { ...request, operative: { ...request.operative, scarIds: [...new Set([...(request.operative.scarIds ?? []), request.cardId])] } }
        : request, liveState, this.gearCatalog, this.characterCatalog)],
      lastOutcomeSummary: {
        seatId: "seat-1", movedToSectorId: synthetic.sectors[0]?.id ?? null, encounterCardId: null, encounterTitle: null,
        encounterCardType: null, checkStat: null, die1: null, die2: null, statBonus: null, checkTotal: null, difficulty: null,
        enemyRollerSeatId: null, enemyDie1: null, enemyDie2: null, enemyBonus: null, enemyTotal: null, success: null,
        summary: "Simulation encounter prepared."
      },
      eventLog: []
    };
    synthetic = { ...synthetic, scarDecks: createInitialScarDecks(synthetic.sessionId) };
    const simulationId = randomUUID();
    const before = summary(synthetic);
    const initialHash = hashValue(synthetic);
    const context = new SimulationExecutionContext(simulationId, initialHash, seed, request.dice);
    const drawn: GameAction = { type: "ENCOUNTER_DRAWN", seatId: "seat-1", sectorId: synthetic.players[0]!.sectorId, card: threat, createdAt: new Date(this.now()).toISOString() };
    const drawResult = reduceGameState(synthetic, drawn);
    if (!drawResult.ok) throw new AdminContentError(drawResult.rejection.reason, 422);
    context.detachedEvents.push(drawn, ...drawResult.emitted);
    const room = this.makeRoom(drawResult.state, threat, context);
    const adaptationTiming = String(scarAdaptation.timing ?? "");
    if (record.type === "scar" && request.activateScarAdaptation && ["beforeTest", "beforeRoll"].includes(adaptationTiming)) {
      const active = room.getState().activeResolution;
      if (active) room.getState().activeResolution = { ...active, playerId: "seat-1", stage: "battle_setup", battle: { stat: threat.stat, difficulty: threat.difficulty, modifiers: [] } };
      const control = getOwnedScarAdaptationControls(room.getState(), "seat-1").find((entry) => entry.scarId === request.cardId && entry.enabled);
      if (!control) throw new AdminContentError("Scar Adaptation is not valid in the configured pre-roll simulation window", 422);
      room.resolveScarAdaptationIntent({ type: "USE_SCAR_ADAPTATION", seatId: "seat-1", activationId: control.activationId, scarId: control.scarId, ruleKey: control.ruleKey, ...(control.targets[0] ? { targetId: control.targets[0].id } : {}) });
    }
    if (threat.cardType === "enemy" && request.outcomeMode === "calculated") room.resolveCombatIntent({ type: "COMBAT_REQUESTED", seatId: "seat-1", stat: threat.stat });
    else room.resolveCheckIntent({ type: "CHECK_REQUESTED", seatId: "seat-1", stat: threat.stat });
    if (record.type === "scar" && request.activateScarAdaptation && ["afterRoll", "afterTest", "beforeConsequence"].includes(adaptationTiming)) {
      const control = getOwnedScarAdaptationControls(room.getState(), "seat-1").find((entry) => entry.scarId === request.cardId && entry.enabled);
      if (!control) throw new AdminContentError("Scar Adaptation is not valid in the configured result simulation window", 422);
      const target = control.targets[0];
      room.resolveScarAdaptationIntent({ type: "USE_SCAR_ADAPTATION", seatId: "seat-1", activationId: control.activationId, scarId: control.scarId, ruleKey: control.ruleKey, ...(control.ruleKey.includes("reroll") ? { rollIndex: Number(target?.id ?? 0) } : target ? { targetId: target.id } : {}) });
    }
    this.settle(room);
    const now = this.now();
    const session: DetachedSession = {
      ownerKey, simulationId, cardRevision: source.revision, sourceMode: request.draft === undefined ? "saved" : "draft", record,
      request, context, room, before, liveStateHashBefore: hashValue(liveState), liveLogLengthBefore: liveState.eventLog.length,
      registryHashBefore: this.registryHash(), consumedPromptIds: new Set(), createdAt: now, expiresAt: now + SESSION_TTL_MS
    };
    this.sessions.set(simulationId, session);
    return this.result(session, liveState);
  }

  private promptAction(state: GameState, promptId: string, choice: CanonicalPromptChoice): GameAction {
    const createdAt = new Date(this.now()).toISOString();
    if (choice.kind === "encounter" && state.pendingEncounterDecision?.decisionId === promptId) return { type: "ENCOUNTER_DECISION_RESOLVED", seatId: "seat-1", decisionId: promptId, decisionVersion: state.pendingEncounterDecision.decisionVersion, optionId: choice.optionId, createdAt };
    if (choice.kind === "equipment" && state.pendingGearEquipChoice?.choiceId === promptId) return { type: "RESOLVE_GEAR_EQUIP_CHOICE", seatId: "seat-1", choiceId: promptId, itemInstanceId: state.pendingGearEquipChoice.itemInstanceId, decision: choice.optionId, createdAt };
    if (choice.kind === "forced-destination" && state.pendingForcedDestinationChoice?.choiceId === promptId) return { type: "FORCED_DESTINATION_SELECTED", seatId: "seat-1", choiceId: promptId, destinationSectorId: choice.optionId, createdAt };
    if (choice.kind === "suppression" && state.pendingEquipmentSuppressionChoice?.choiceId === promptId) return { type: "SELECT_EQUIPMENT_SUPPRESSION_TARGET", seatId: "seat-1", choiceId: promptId, itemInstanceId: choice.optionId, createdAt };
    if (choice.kind === "memory-tax" && state.pendingMemoryTaxChoice?.choiceId === promptId) return { type: "MEMORY_TAX_CHOICE_RESOLVED", seatId: "seat-1", choiceId: promptId, choiceVersion: state.pendingMemoryTaxChoice.choiceVersion, optionId: choice.optionId, createdAt };
    if (choice.kind === "choose-scar" && state.pendingScarChoice?.selectionId === promptId) return { type: "CHOOSE_SCAR", seatId: "seat-1", selectionId: promptId, scarId: choice.optionId, createdAt };
    throw new AdminContentError("Prompt choice does not match the current detached prompt", 409);
  }

  continue(ownerKey: string, request: AdminSimulationContinueRequest, liveState: GameState): AdminSimulationResult {
    validateContinueRequestShape(request);
    this.cleanup();
    const session = this.sessions.get(request.simulationId);
    if (!session) throw new AdminContentError("Simulation session is missing or expired", 410);
    if (session.ownerKey !== ownerKey) throw new AdminContentError("Simulation belongs to another host administrator", 403);
    if (session.consumedPromptIds.has(request.promptId)) throw new AdminContentError("Simulation prompt was already consumed", 409);
    const currentPrompt = prompts(session.room.getState()).find((entry) => entry.id === request.promptId);
    if (!currentPrompt) throw new AdminContentError("Simulation prompt is stale", 409);
    if (currentPrompt.kind !== request.choice.kind || !currentPrompt.optionIds.includes(request.choice.optionId)) throw new AdminContentError("Choice was not offered by the canonical prompt", 422);
    const action = this.promptAction(session.room.getState(), request.promptId, request.choice);
    const reduced = reduceGameState(session.room.getState(), action);
    if (!reduced.ok) throw new AdminContentError(reduced.rejection.reason, 422);
    session.context.detachedEvents.push(action, ...reduced.emitted);
    session.consumedPromptIds.add(request.promptId);
    const threat = toSimulatableThreat(session.record, session.request.outcomeMode);
    session.room = this.makeRoom(reduced.state, threat, session.context);
    this.settle(session.room);
    session.expiresAt = this.now() + SESSION_TTL_MS;
    return this.result(session, liveState);
  }

  close(ownerKey: string, simulationId?: string): number {
    let deleted = 0;
    for (const [id, session] of this.sessions) {
      if (session.ownerKey === ownerKey && (!simulationId || id === simulationId)) { this.sessions.delete(id); deleted += 1; }
    }
    return deleted;
  }

  private result(session: DetachedSession, liveState: GameState): AdminSimulationResult {
    const finalState = session.room.getState();
    const after = summary(finalState);
    const diff = stateDiff(session.before, after);
    const traces = effectTrace(finalState.eventLog as unknown[], diff);
    const rollEvent = [...(finalState.eventLog as unknown[])].reverse().map(asRecord).find((entry) => entry.type === "COMBAT_RESOLVED" || entry.type === "CHECK_ROLLED");
    const activeRoll = finalState.activeResolution?.roll;
    const last = finalState.lastOutcomeSummary;
    const warnings = mismatchWarnings(session.record, traces);
    const retiredResource = ["he", "at"].join("");
    const retiredEffectKeys = ["gain", "gain_all", "lose"].map((verb) => `${verb}_${retiredResource}`);
    if (retiredEffectKeys.some((key) => JSON.stringify(session.record).toLowerCase().includes(`"${key}"`))) {
      warnings.push("INVALID LEGACY CONTENT: retired Heat effect was detected.");
    }
    const isolation: SimulationIsolationEvidence = {
      simulationId: session.simulationId,
      initialHash: session.context.initialHash,
      liveStateHashBefore: session.liveStateHashBefore,
      liveStateHashAfter: hashValue(liveState),
      registryHashBefore: session.registryHashBefore,
      registryHashAfter: this.registryHash(),
      gameplayLogLengthBefore: session.liveLogLengthBefore,
      gameplayLogLengthAfter: liveState.eventLog.length,
      broadcastAttempts: session.context.broadcastAttempts,
      escapedBroadcasts: 0,
      persistenceAttempts: session.context.persistenceAttempts,
      escapedPersistenceWrites: 0,
      timerAttempts: session.context.timerAttempts,
      detachedEventCount: session.context.detachedEvents.length,
      expiresAt: new Date(session.expiresAt).toISOString()
    };
    const dice = {
      operative: activeRoll?.dice ?? ((rollEvent?.roll as { faces?: number[] } | undefined)?.faces ?? []),
      enemy: (rollEvent?.enemyRoll as { faces?: number[] } | undefined)?.faces ?? [last?.enemyDie1, last?.enemyDie2].filter((value): value is number => typeof value === "number"),
      operativeTotal: activeRoll?.finalTotal ?? (typeof rollEvent?.total === "number" ? rollEvent.total : null) ?? last?.checkTotal ?? null,
      enemyTotal: typeof rollEvent?.enemyTotal === "number" ? rollEvent.enemyTotal : last?.enemyTotal ?? null,
      difficulty: activeRoll?.target ?? (typeof rollEvent?.difficulty === "number" ? rollEvent.difficulty : null) ?? last?.difficulty ?? null,
      modifiers: finalState.activeResolution?.battle?.modifiers
        ?? ((rollEvent?.modifierSources as Array<{ label: string; value: number }> | undefined) ?? [])
    };
    const outcome = activeRoll?.success === true ? "SUCCESS" : activeRoll?.success === false ? "FAILURE" : rollEvent?.success === true ? "SUCCESS" : rollEvent?.success === false ? "FAILURE" : last?.success === true ? "SUCCESS" : last?.success === false ? "FAILURE" : "RESOLVED";
    const deterministicResultHash = hashValue(deterministicSemanticValue({
      cardId: session.record.id,
      sourceMode: session.sourceMode,
      seed: session.context.seed,
      outcome,
      dice,
      before: session.before,
      after,
      diff
    }));
    return {
      simulationId: session.simulationId,
      sourceMode: session.sourceMode,
      sourceLabel: session.sourceMode === "draft" ? "UNSAVED EDITOR DRAFT" : "SAVED CARD",
      cardRevision: session.cardRevision,
      cardId: String(session.record.id), cardName: cardName(session.record), cardType: String(session.record.cardType ?? session.record.type ?? "effect"), deterministicResultHash, seed: session.context.seed,
      outcome,
      forcedOutcomePreview: session.request.outcomeMode !== "calculated",
      ...(session.request.outcomeMode !== "calculated" ? { forcedOutcomeLabel: "FORCED BRANCH PREVIEW — Battle calculation bypassed" } : {}),
      dice,
      randomness: session.context.random.trace(),
      before: session.before, after, diff, effects: traces, rejectedEffects: [], prompts: prompts(finalState),
      eventLog: (finalState.eventLog as unknown[]).map(eventSummary), warnings,
      authoredText: String(session.record.text ?? session.record.rulesText ?? session.record.resolutionSummary ?? ""),
      effectTextStatus: warnings.length ? "REVIEW WARNINGS" : "TEXT AND EFFECTS APPEAR CONSISTENT",
      isolation,
      isolated: true,
      ...(session.sourceMode === "draft" ? { draftHash: hashValue(session.record) } : {})
    };
  }

  startBatch(ownerKey: string, request: AdminSimulationBatchStartRequest, liveState: GameState): AdminSimulationBatchJob {
    if (request.outcomeMode !== "calculated") throw new AdminContentError("Forced branch previews cannot enter batch statistics", 422);
    this.cleanup();
    if ([...this.batches.values()].some((job) => job.ownerKey === ownerKey && ["queued", "running"].includes(job.status))) throw new AdminContentError("Only one batch may run per host administrator", 429);
    if ([...this.batches.values()].filter((job) => ["queued", "running"].includes(job.status)).length >= 2) throw new AdminContentError("The global simulation batch limit is active", 429);
    const runs = Math.max(1, Math.min(MAX_BATCH_RUNS, Math.trunc(request.runs)));
    const job: BatchRecord = { jobId: randomUUID(), ownerKey, status: "queued", requestedRuns: runs, completedRuns: 0, createdAt: this.now(), expiresAt: this.now() + BATCH_TTL_MS, cancelled: false };
    this.batches.set(job.jobId, job);
    void this.executeBatch(job, { ...request, runs }, structuredClone(liveState));
    return this.publicJob(job);
  }

  private async executeBatch(job: BatchRecord, request: AdminSimulationBatchStartRequest, liveState: GameState): Promise<void> {
    job.status = "running";
    const seedStart = request.dice.seed?.trim() || `${request.cardId}:batch`;
    const margins: number[] = []; const results: AdminSimulationResult[] = []; const errors: string[] = []; const warningCounts: Record<string, number> = {};
    try {
      const resolvedSource = await this.editor.findCard(request.cardId, request.cardFamily);
      if (resolvedSource.revision !== request.expectedRevision) throw new AdminContentError("The selected card revision is stale", 409);
      const { runs: _runs, ...pristineRequest } = request;
      for (let index = 0; index < job.requestedRuns; index += 1) {
        if (job.cancelled) { job.status = "cancelled"; break; }
        const derivedSeed = hashValue(`${seedStart}${index}`);
        try {
          const result = await this.start(`${job.ownerKey}:batch:${job.jobId}:${index}`, { ...pristineRequest, mode: "start", outcomeMode: "calculated", dice: { mode: "seeded", seed: derivedSeed } }, liveState, resolvedSource, `simulation-batch:${job.jobId}:pristine`);
          results.push(result);
          margins.push((result.dice.operativeTotal ?? 0) - (result.dice.enemyTotal ?? result.dice.difficulty ?? 0));
          for (const warning of result.warnings) warningCounts[warning] = (warningCounts[warning] ?? 0) + 1;
          this.close(`${job.ownerKey}:batch:${job.jobId}:${index}`, result.simulationId);
        } catch (error) { errors.push(error instanceof Error ? error.message : "Unknown resolver error"); }
        job.completedRuns = index + 1;
        if (index % 20 === 19) await new Promise<void>((resolve) => setImmediate(resolve));
      }
      if (!job.cancelled) {
        const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
        const initialHashes = results.map((entry) => entry.isolation.initialHash);
        job.result = {
          runs: job.requestedRuns, completedRuns: job.completedRuns, initialHash: initialHashes[0] ?? "", allInitialHashesMatch: new Set(initialHashes).size <= 1, seedStart,
          victoryRate: results.filter((entry) => entry.outcome === "SUCCESS").length / Math.max(1, results.length),
          defeatRate: results.filter((entry) => entry.outcome === "FAILURE").length / Math.max(1, results.length), drawRate: results.filter((entry) => entry.outcome === "DRAW").length / Math.max(1, results.length),
          averageWounds: average(results.map((entry) => entry.after.wounds - entry.before.wounds)), averageSalvageChange: average(results.map((entry) => entry.after.salvage - entry.before.salvage)),
          averageBattleMargin: average(margins), minimumMargin: margins.length ? Math.min(...margins) : null, maximumMargin: margins.length ? Math.max(...margins) : null,
          warningCount: Object.values(warningCounts).reduce((sum, count) => sum + count, 0), warningCounts, resolverErrors: [...new Set(errors)].slice(0, 20)
        };
        job.status = "complete";
      }
    } catch (error) { job.status = "failed"; job.error = error instanceof Error ? error.message : "Batch failed"; }
    job.expiresAt = this.now() + BATCH_TTL_MS;
  }

  getBatch(ownerKey: string, jobId: string): AdminSimulationBatchJob {
    this.cleanup();
    const job = this.batches.get(jobId);
    if (!job) throw new AdminContentError("Batch job is missing or expired", 410);
    if (job.ownerKey !== ownerKey) throw new AdminContentError("Batch job belongs to another host administrator", 403);
    return this.publicJob(job);
  }

  cancelBatch(ownerKey: string, jobId: string): AdminSimulationBatchJob {
    const job = this.batches.get(jobId);
    if (!job) throw new AdminContentError("Batch job is missing or expired", 410);
    if (job.ownerKey !== ownerKey) throw new AdminContentError("Batch job belongs to another host administrator", 403);
    if (["queued", "running"].includes(job.status)) { job.cancelled = true; job.status = "cancelled"; }
    return this.publicJob(job);
  }

  private publicJob(job: BatchRecord): AdminSimulationBatchJob {
    return { jobId: job.jobId, status: job.status, requestedRuns: job.requestedRuns, completedRuns: job.completedRuns, ...(job.result ? { result: job.result } : {}), ...(job.error ? { error: job.error } : {}) };
  }
}
