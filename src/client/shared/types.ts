export type Stat = "command" | "grit" | "signal" | "guile" | "forge";
export type GearSlot = "weapon" | "armor" | "utility";
export type GearCategory =
  | "passive"
  | "active"
  | "consumable"
  | "chargedRelic"
  | "dangerous"
  | "contractObject"
  | "followerLinked";
export type Phase = "start" | "navigation" | "sector" | "action" | "resolution" | "broadcast";
export type SessionStatus = "lobby" | "active" | "ended";
export type SessionMode = "multiplayer" | "single-player";
export type InteractionMode = "co-op" | "rivalry" | "ruthless";

export interface PublicSeat {
  seatId: string;
  characterId: string;
  displayName: string | null;
  connected: boolean;
  kicked: boolean;
}

export interface PublicPlayerCharacter {
  id: string;
  name: string;
  archetype: string;
  status: "active" | "recalled";
  activeContract: { contractId: string; progress: number } | null;
  stats: Record<Stat, number>;
  trophies: number;
  heat: number;
  wounds: number;
  scars: string[];
  heldGearCount: number;
  followerCount?: number;
  equippedGear: Record<GearSlot, string | null>;
}

export interface PublicPlayer {
  seatId: string;
  sectorId: string;
  character: PublicPlayerCharacter;
}

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  statBonus: { stat: Stat; amount: number };
  category?: GearCategory;
  activeText?: string;
  useLimit?: "oncePerTurn" | "oncePerRound" | "discard" | "charge";
  charges?: number;
  heatCost?: number;
  linkedFollowerRole?: FollowerRole;
}

export type FollowerRole = "scout" | "medic" | "gunner" | "ritualist" | "porter" | "guide" | "informant";

export interface Follower {
  id: string;
  name: string;
  role: FollowerRole;
  text: string;
  useLimit?: "oncePerTurn" | "oncePerRound" | "discard";
  loyalty?: number;
  lossCondition?: "wound" | "heat" | "combatLoss" | "choice";
}

export interface PrivateCharacter {
  id: string;
  name: string;
  archetype: string;
  currentSpaceId: string;
  status: "active" | "recalled";
  stats: Record<Stat, number>;
  trophies: number;
  heat: number;
  wounds: number;
  scars: string[];
  activeContract: { contractId: string; progress: number } | null;
  heldGear: GearItem[];
  equippedGear: Record<GearSlot, string | null>;
  followers?: Follower[];
  abilities: Array<{ id: string; name: string; text: string }>;
}

export interface PhoneSelfState {
  seatId: string;
  sectorId: string;
  hand: string[];
  notes: string[];
  character: PrivateCharacter;
}

export interface SectorNode {
  id: string;
  name: string;
  regionTier: string;
  neighbors: string[];
  danger: number;
  encounterDecks: {
    threat: string[];
    anomaly: string[];
    contract: string[];
    artifact: string[];
    escalation: string[];
  };
}

export interface EncounterCard {
  id: string;
  title: string;
  cardType: "hazard" | "enemy";
  flavor: string;
  difficulty: number;
  stat: Stat;
  enemyName?: string | null;
}

export interface ContractCard {
  id: string;
  name: string;
  factionGiver: string;
  text: string;
  objective:
    | { type: "defeatCount"; target: number }
    | { type: "spaceTextResolved"; effectKey: string; label: string; target: number };
}

export interface PendingEnemyRoll {
  fighterSeatId: string;
  assignedRollerSeatId: string;
  encounterCardId: string;
  encounterTitle: string;
  stat: Stat;
}

export interface OutcomeSummary {
  seatId: string;
  movedToSectorId: string;
  encounterCardId: string | null;
  encounterTitle: string | null;
  encounterCardType: "hazard" | "enemy" | null;
  checkStat: string | null;
  die1: number | null;
  die2: number | null;
  statBonus: number | null;
  checkTotal: number | null;
  difficulty: number | null;
  enemyRollerSeatId?: string | null;
  enemyDie1?: number | null;
  enemyDie2?: number | null;
  enemyBonus?: number | null;
  enemyTotal?: number | null;
  success: boolean | null;
  replacementCharacterId?: string | null;
  summary: string;
}

export interface AbilityTriggerSummary {
  seatId: string;
  abilityId: string;
  summary: string;
  createdAt: string;
}

export interface ActiveNemesisAbilitySummary {
  timing: string;
  text: string;
}

export interface ActiveNemesisSummary {
  id: string;
  name: string;
  title: string;
  faction: string;
  life: number;
  damageDealt: number;
  abilities: ActiveNemesisAbilitySummary[];
}

export interface ActiveScenarioSummary {
  id: string;
  name: string;
  theme: string;
  difficulty: "easy" | "easy-medium" | "medium" | "medium-hard" | "hard";
  pressureSummary: string;
  confrontationTitle: string;
  progressLabel: string;
  progress: number;
  threshold: number;
  setup: string[];
  specialRules: string[];
  confrontationSteps: string[];
  victoryText: string;
}

export interface ScenarioCatalogEntry {
  id: string;
  name: string;
  theme: string;
  difficulty: "easy" | "easy-medium" | "medium" | "medium-hard" | "hard";
  pressureRule: string;
  expectedDuration: string;
  nemesis: {
    name: string;
    title: string;
    faction: string;
  } | null;
  setup: string[];
  specialRules: string[];
  confrontationTitle: string;
  confrontationSteps: string[];
  victoryText: string;
}

export interface ScenarioTelemetryItem {
  label: string;
  value: string;
}

export interface PublicPatchPayload {
  status: SessionStatus;
  sessionMode: SessionMode;
  interactionMode?: InteractionMode;
  winnerSeatId: string | null;
  activeScenario: ActiveScenarioSummary | null;
  scenarioTelemetry: ScenarioTelemetryItem[];
  scenarioProgress: Record<string, number>;
  seats: PublicSeat[];
  sectors: SectorNode[];
  players: PublicPlayer[];
  activeSeatIndex: number;
  turnOrder: string[];
  escalationLevel: number;
  escalationThreshold: number;
  escalationModifier: number;
  availableContracts: ContractCard[];
  encounter: EncounterCard | null;
  pendingEnemyRoll: PendingEnemyRoll | null;
  outcomeSummary: OutcomeSummary | null;
  recentAbilityTriggers: AbilityTriggerSummary[];
  nemesis: ActiveNemesisSummary | null;
}

export interface PhonePatchPayload extends PublicPatchPayload {
  phase: Phase;
  self: PhoneSelfState | null;
}

export interface StatePatch<TPayload = PublicPatchPayload> {
  type: "STATE_PATCH";
  sessionId: string;
  sequence: number;
  phase: Phase;
  payload: TPayload;
}

export interface IntentRejectedEnvelope {
  type: "INTENT_REJECTED";
  sessionId: string;
  sequence: number;
  actionType: string;
  reason: string;
}

export interface RejoinAcceptedEnvelope {
  type: "REJOIN_ACCEPTED";
  sessionId: string;
  seatId: string;
}

export interface RejoinRejectedEnvelope {
  type: "REJOIN_REJECTED";
  sessionId: string;
  reason: string;
}

export interface DebugEvent {
  id: string;
  timestamp: string;
  label: string;
  detail?: string;
  payload: unknown;
}

export type ServerEnvelope =
  | StatePatch<PublicPatchPayload | PhonePatchPayload>
  | IntentRejectedEnvelope
  | RejoinAcceptedEnvelope
  | RejoinRejectedEnvelope;

export type ClientIntent =
  | {
      type: "MOVE_REQUESTED";
      seatId: string;
      toSectorId: string;
    }
  | {
      type: "PHASE_ADVANCED";
      seatId: string;
      toPhase: Phase;
    }
  | {
      type: "CHECK_REQUESTED";
      seatId: string;
      stat: Stat;
    }
  | {
      type: "COMBAT_REQUESTED";
      seatId: string;
      stat: Stat;
    }
  | {
      type: "ENEMY_ROLL_REQUESTED";
      seatId: string;
    }
  | {
      type: "RECRUIT_REPLACEMENT";
      seatId: string;
      replacementCharacterId: string;
    }
  | {
      type: "EQUIP_GEAR";
      seatId: string;
      gearId: string;
      slot: GearSlot;
    }
  | {
      type: "UNEQUIP_GEAR";
      seatId: string;
      slot: GearSlot;
    }
  | {
      type: "USE_GEAR";
      seatId: string;
      gearId: string;
    }
  | {
      type: "USE_FOLLOWER";
      seatId: string;
      followerId: string;
    }
  | {
      type: "TABLE_INTERACTION";
      seatId: string;
      targetSeatId: string;
      interactionKind: "trade" | "aid" | "duel" | "interfere";
    }
  | {
      type: "ACCEPT_CONTRACT";
      seatId: string;
      contractId: string;
    }
  | {
      type: "COMPLETE_CONTRACT";
      seatId: string;
      contractId: string;
    }
  | {
      type: "SCENARIO_CONFRONTATION_REQUESTED";
      seatId: string;
    }
  | {
      type: "RESOLVE_SPACE_TEXT";
      seatId: string;
      choiceId?: string;
    }
  | {
      type: "STABILIZE_REQUESTED";
      seatId: string;
    }
  | {
      type: "RAISE_STAT_REQUESTED";
      seatId: string;
      stat: Stat;
    };

export type HostCommand =
  | {
      type: "KICK_SEAT";
      targetSeatId: string;
    }
  | {
      type: "RESTART_SESSION";
    };

export interface PhoneSessionAuth {
  roomCode: string;
  seatId: string;
  seatToken: string;
  displayName: string;
}

export interface CharacterCatalogEntry extends PrivateCharacter {}
