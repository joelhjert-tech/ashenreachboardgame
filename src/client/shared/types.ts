export type Stat = "command" | "grit" | "signal" | "guile" | "forge";
export type GearSlot = "weapon" | "armor" | "utility";
export type Phase = "start" | "navigation" | "sector" | "action" | "resolution" | "broadcast";
export type SessionStatus = "lobby" | "active" | "ended";

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
  heat: number;
  wounds: number;
  scars: string[];
  heldGearCount: number;
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
}

export interface PrivateCharacter {
  id: string;
  name: string;
  archetype: string;
  currentSpaceId: string;
  status: "active" | "recalled";
  stats: Record<Stat, number>;
  heat: number;
  wounds: number;
  scars: string[];
  activeContract: { contractId: string; progress: number } | null;
  heldGear: GearItem[];
  equippedGear: Record<GearSlot, string | null>;
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
  objective: { type: "defeatCount"; target: number };
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

export interface PublicPatchPayload {
  status: SessionStatus;
  winnerSeatId: string | null;
  seats: PublicSeat[];
  sectors: SectorNode[];
  players: PublicPlayer[];
  activeSeatIndex: number;
  turnOrder: string[];
  escalationLevel: number;
  availableContracts: ContractCard[];
  encounter: EncounterCard | null;
  pendingEnemyRoll: PendingEnemyRoll | null;
  outcomeSummary: OutcomeSummary | null;
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
      type: "ACCEPT_CONTRACT";
      seatId: string;
      contractId: string;
    }
  | {
      type: "COMPLETE_CONTRACT";
      seatId: string;
      contractId: string;
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
