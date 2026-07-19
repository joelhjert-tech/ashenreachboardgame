export type AdminCardFamily =
  | "affliction"
  | "anomaly"
  | "artifact"
  | "contract"
  | "escalation"
  | "scar"
  | "threat"
  | "gear"
  | "follower"
  | "tile-challenge";

export type SimulationSourceMode = "saved" | "draft";
export type SimulationDiceMode = "random" | "fixed" | "seeded";
export type SimulationOutcomeMode = "calculated" | "success" | "failure";
export type SimulationOperativePreset = "weak" | "average" | "strong" | "character" | "custom" | "clone-active";

export interface SimulationOperativeInput {
  preset: SimulationOperativePreset;
  characterId?: string;
  cloneSeatId?: string;
  stats?: Partial<Record<"command" | "grit" | "signal" | "guile" | "forge", number>>;
  wounds?: number;
  salvage?: number;
  scarIds?: string[];
  gearIds?: string[];
  equipGearIds?: string[];
}

export interface SimulationDiceInput {
  mode: SimulationDiceMode;
  values?: number[];
  seed?: string;
}

export type CanonicalPromptChoice =
  | { kind: "encounter"; optionId: string }
  | { kind: "equipment"; optionId: "equip" | "keepCarried" }
  | { kind: "forced-destination"; optionId: string }
  | { kind: "suppression"; optionId: string }
  | { kind: "memory-tax"; optionId: "lose-salvage-1" | "next-non-battle-test-minus-1" }
  | { kind: "choose-scar"; optionId: string };

export interface AdminSimulationStartRequest {
  mode: "start";
  cardId: string;
  cardFamily: AdminCardFamily;
  expectedRevision: string;
  draft?: unknown;
  operative: SimulationOperativeInput;
  dice: SimulationDiceInput;
  outcomeMode: SimulationOutcomeMode;
  activateScarAdaptation?: boolean;
}

export interface AdminSimulationContinueRequest {
  mode: "continue";
  simulationId: string;
  promptId: string;
  choice: CanonicalPromptChoice;
}

export type AdminSimulationRequest = AdminSimulationStartRequest | AdminSimulationContinueRequest;

export interface SimulationStateSummary {
  characterId: string;
  characterName: string;
  position: string;
  stats: Record<string, number>;
  wounds: number;
  scars: string[];
  salvage: number;
  trophies: number;
  gear: Array<{ id: string; instanceId: string | null; equipped: boolean }>;
  followers: string[];
  notes: string[];
  escalation: number;
  scenarioProgress: Record<string, number>;
  phase: string;
}

export interface SimulationStateDiffRow {
  field: string;
  before: unknown;
  after: unknown;
  change: string;
}

export interface SimulationEffectTrace {
  order: number;
  type: string;
  input: unknown;
  status: "success" | "rejected" | "pending" | "information";
  summary: string;
  changedFields: string[];
}

export interface AdminSimulationPrompt {
  kind: CanonicalPromptChoice["kind"];
  id: string;
  prompt: string;
  optionIds: string[];
}

export interface SimulationRandomTrace {
  mode: SimulationDiceMode;
  requested: number[];
  consumed: number[];
  unused: number[];
  unexpectedRequests: number;
  rerolled: number[];
  seed: string;
}

export interface SimulationIsolationEvidence {
  simulationId: string;
  initialHash: string;
  liveStateHashBefore: string;
  liveStateHashAfter: string;
  registryHashBefore: string;
  registryHashAfter: string;
  gameplayLogLengthBefore: number;
  gameplayLogLengthAfter: number;
  broadcastAttempts: number;
  escapedBroadcasts: 0;
  persistenceAttempts: number;
  escapedPersistenceWrites: 0;
  timerAttempts: number;
  detachedEventCount: number;
  expiresAt: string;
}

export interface AdminSimulationResult {
  simulationId: string;
  sourceMode: SimulationSourceMode;
  sourceLabel: string;
  cardRevision: string;
  cardId: string;
  cardName: string;
  cardType: string;
  deterministicResultHash: string;
  seed: string;
  outcome: string;
  forcedOutcomePreview: boolean;
  forcedOutcomeLabel?: string;
  dice: {
    operative: number[];
    enemy: number[];
    operativeTotal: number | null;
    enemyTotal: number | null;
    difficulty: number | null;
    modifiers: Array<{ label: string; value: number }>;
  };
  randomness: SimulationRandomTrace;
  before: SimulationStateSummary;
  after: SimulationStateSummary;
  diff: SimulationStateDiffRow[];
  effects: SimulationEffectTrace[];
  rejectedEffects: SimulationEffectTrace[];
  prompts: AdminSimulationPrompt[];
  eventLog: Array<{ type: string; seatId?: string; createdAt?: string; summary?: string }>;
  warnings: string[];
  authoredText: string;
  effectTextStatus: string;
  isolation: SimulationIsolationEvidence;
  isolated: true;
  draftHash?: string;
}

export interface AdminSimulationCardDescriptor {
  cardId: string;
  cardFamily: AdminCardFamily;
  revision: string;
  record: Record<string, unknown>;
  simulatable: boolean;
  unsupportedReason?: string;
  activeOperatives: Array<{ seatId: string; playerName: string; operativeName: string }>;
}

export interface AdminSimulationBatchStartRequest extends Omit<AdminSimulationStartRequest, "outcomeMode"> {
  outcomeMode: "calculated";
  runs: number;
}

export interface AdminSimulationBatchResult {
  runs: number;
  completedRuns: number;
  initialHash: string;
  allInitialHashesMatch: boolean;
  seedStart: string;
  victoryRate: number;
  defeatRate: number;
  drawRate: number;
  averageWounds: number;
  averageSalvageChange: number;
  averageBattleMargin: number;
  minimumMargin: number | null;
  maximumMargin: number | null;
  warningCount: number;
  warningCounts: Record<string, number>;
  resolverErrors: string[];
}

export interface AdminSimulationBatchJob {
  jobId: string;
  status: "queued" | "running" | "complete" | "cancelled" | "failed";
  requestedRuns: number;
  completedRuns: number;
  result?: AdminSimulationBatchResult;
  error?: string;
}
