export type Stat = "command" | "grit" | "signal" | "guile" | "forge";
export type GearSlot = "weapon" | "armor" | "utility";
export type ThreatIcon = "red" | "blue" | "yellow";
export type PublicMovementThreatIcon = ThreatIcon | "green" | "gold" | "white";
export type GearTier = "starter" | "standard" | "advanced" | "artifact";
export type GearTimingWindow =
  | "beforeThreatDraw"
  | "beforeBattleRoll"
  | "afterBattleRoll"
  | "afterFailedTest"
  | "beforeTakingDamage"
  | "startOfTurn"
  | "movement"
  | "movementRouteConfirmation"
  | "beforeAnomalySignalTest"
  | "pendingScarConsequence"
  | "shop"
  | "action"
  | "anyTime";
export type GearCategory =
  | "passive"
  | "active"
  | "consumable"
  | "chargedRelic"
  | "dangerous"
  | "contractObject"
  | "followerLinked";
export type ShopCategory =
  | "forge-armoury"
  | "market"
  | "medicae-shrine"
  | "relic-dealer"
  | "contract-broker";
export type ShopFailureReason =
  | "notAtShop"
  | "shopBlockedByThreat"
  | "insufficientSalvage"
  | "itemUnavailable"
  | "inventoryFull"
  | "itemNotHeld"
  | "itemNotSellable"
  | "invalidItem";
export type Phase = "start" | "navigation" | "sector" | "action" | "resolution" | "broadcast";
export type SessionStatus = "lobby" | "active" | "ended";
export type SessionMode = "multiplayer" | "single-player";
export type GameMode = "standard" | "nemesis_relay";
export type InteractionMode = "co-op" | "rivalry" | "ruthless";
export type ScenarioDifficulty = "easy" | "easy-medium" | "medium" | "medium-hard" | "hard" | "brutal";
export type ScenarioMode = "coop" | "rivalry" | "hybrid";
export type ScenarioRewardType = "boon" | "gear" | "ability" | "tile-event" | "tactic" | "artifact";
export type CharacterComplexity = "beginner" | "standard" | "advanced" | "expert";

export interface CharacterPresentation {
  role: string;
  complexity: CharacterComplexity;
  playstyleSummary: string;
  recommendedForFirstGame: boolean;
  strengths: string[];
  weaknesses: string[];
  usefulStats: Stat[];
  signatureItemSummary: string;
  startingContractSummary: string;
}

export interface PublicSeat {
  seatId: string;
  characterId: string;
  characterSelected?: boolean;
  displayName: string | null;
  startingMissionSelected?: boolean;
  startingMissionTitle?: string | null;
  connected: boolean;
  ready: boolean;
  kicked: boolean;
}

export interface PublicPlayerCharacter {
  id: string;
  name: string;
  archetype: string;
  qaOnly?: boolean;
  presentation?: CharacterPresentation;
  status: "active" | "recalled";
  activeContract: { contractId: string; progress: number; completedTargetIds?: string[]; salvageSpent?: number } | null;
  stats: Record<Stat, number>;
  statUpgrades?: Partial<Record<Stat, number>>;
  trophies: number;
  trophyPile?: TrophyPileEntry[];
  salvage?: number;
  temporaryAllStatBoost?: { value: number; remainingEligibleResolutions: number };
  heat: number;
  wounds: number;
  scars: string[];
  afflictions?: PlayerAfflictionSummary;
  heldGearCount: number;
  followerCount?: number;
  companionBadges?: Array<{
    id: string;
    name: string;
    tier?: "standard" | "legendary" | "ultimate";
    ultimateCompanion?: boolean;
    exhausted?: boolean;
  }>;
  equippedGear: Record<GearSlot, string | null>;
}

export interface TrophyPileEntry {
  cardId: string;
  name: string;
  trophyValue: number;
  spentValue?: number;
  stat?: Stat;
  cardType?: string;
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
  shopCategories?: ShopCategory[];
  cost?: number;
  sellValue?: number;
  sellable?: boolean;
  tier?: GearTier;
  flavor?: string;
  timingWindows?: GearTimingWindow[];
  exhausted?: boolean;
  activeText?: string;
  useLimit?: "oncePerTurn" | "oncePerRound" | "discard" | "charge";
  charges?: number;
  currentCharges?: number;
  maxCharges?: number;
  startingCharges?: number;
  chargeCost?: number;
  rechargeRule?: "none";
  chargedEffect?: "personalGateOverride" | "movementAdjustment" | "saintSafeConduct" | "bonewayDetour" | "choirLightSignalBonus" | "staticIntercession" | "scarSinkPrayer" | "traceThePromise";
  maxUses?: number;
  heatCost?: number;
  linkedFollowerRole?: FollowerRole;
  effectModel?: "permanent" | "conditional" | "consumable" | "exhaust" | "charged";
  instanceId?: string;
  requiresEquipped?: boolean;
  conditionType?: "battle";
  activationTiming?: GearTimingWindow[];
  consumeOnUse?: boolean;
  consumableEffect?: "grantVeilHook" | "ignoreFailedMovementOrHazard" | "grantPaleCartelFixer" | "healWound" | "grantMarshalSeal";
  resetWindow?: "round";
  exhaustEffect?: "mirrorReroll" | "warbellCommand";
  activationCost?: { type: "salvage" | "wound"; amount: number };
}

export type FollowerRole = "scout" | "medic" | "gunner" | "ritualist" | "porter" | "guide" | "informant" | "companion";
export type FollowerTimingWindow = GearTimingWindow;

export interface Follower {
  id: string;
  instanceId?: string;
  name: string;
  role: FollowerRole;
  text: string;
  tier?: "standard" | "legendary" | "ultimate";
  tags?: string[];
  unique?: boolean;
  artifactTier?: boolean;
  ultimateCompanion?: boolean;
  timingWindows?: FollowerTimingWindow[];
  exhausted?: boolean;
  effectModel?: "exhaust";
  activationTiming?: FollowerTimingWindow[];
  resetWindow?: "round";
  exhaustEffect?: "recordEmberPupNote" | "recordOmenNote" | "recordRouteMemoryNote" | "fandiablosSupport";
  requiresEquipped?: boolean;
  artCardId?: string;
  acquisition?: string[];
  flavor?: string;
  imagePrompt?: string;
  useLimit?: "oncePerTurn" | "oncePerRound" | "discard";
  loyalty?: number;
  lossCondition?: "wound" | "heat" | "combatLoss" | "choice";
}

export interface ScarSummary {
  id: string;
  title: string;
  text: string;
  trigger: string;
  penalty: string;
  relief: string;
  upside?: string;
}

export interface AfflictionEffectPayloadSummary {
  cannotUseArmor?: boolean;
  cannotUseWeapons?: boolean;
  cannotEvadeEnemies?: boolean;
  canEvadeEnemies?: boolean;
  stat?: Stat;
  amount?: number;
  floor?: number;
  preventWoundOn?: number[];
  heal?: number;
  powerLimitModifier?: number;
  assetLimitModifier?: number;
  battleWeaponSlotModifier?: number;
  innateBattleBonus?: number;
  drawAffliction?: number;
  wound?: number;
}

export interface AfflictionSummary {
  id: string;
  name: string;
  severity: number;
  category: string;
  duration: "immediate" | "ongoing" | "oncePerTurn" | "oncePerBattle" | "reaction";
  trigger: string;
  rulesText: string;
  effectKind?: string;
  effectPayload?: AfflictionEffectPayloadSummary;
  isFaceupOngoing: boolean;
}

export interface PlayerAfflictionSummary {
  faceup: AfflictionSummary[];
  facedownCount: number;
}

export interface PrivateCharacter {
  id: string;
  name: string;
  archetype: string;
  qaOnly?: boolean;
  presentation?: CharacterPresentation;
  currentSpaceId: string;
  status: "active" | "recalled";
  stats: Record<Stat, number>;
  statUpgrades?: Partial<Record<Stat, number>>;
  trophies: number;
  trophyPile?: TrophyPileEntry[];
  salvage?: number;
  temporaryAllStatBoost?: { value: number; remainingEligibleResolutions: number };
  heat: number;
  wounds: number;
  scars: string[];
  afflictions?: PlayerAfflictionSummary;
  activeContract: { contractId: string; progress: number } | null;
  heldGear: GearItem[];
  equippedGear: Record<GearSlot, string | null>;
  followers?: Follower[];
  scarCards?: ScarSummary[];
  abilities: Array<{ id: string; name: string; text: string }>;
}

export interface PhoneSelfState {
  seatId: string;
  sectorId: string;
  hand: string[];
  notes: string[];
  noteResources?: Partial<Record<"vow", number>>;
  character: PrivateCharacter;
}

export interface PhoneObjectUseState {
  source: "gear" | "follower";
  id: string;
  usedThisTurn: boolean;
  usedThisRound: boolean;
  remainingUses?: number | null;
  maxUses?: number | null;
  disabledReason?: string | null;
  activeModifier?: {
    label: string;
    value: number;
    stat: Stat;
    mode: "battle" | "check";
  } | null;
}

export interface PrivateRivalryObjective {
  id: string;
  title: string;
  summary: string;
  progressLabel: string;
  progress: number;
  target: number;
  stakes: string;
}

export interface PrivateRivalryRevealState {
  state: "hidden" | "revealLocked" | "revealAvailable" | "revealed" | "completed" | "failed";
  available: boolean;
  label: string;
  hint: string;
  lockedReason?: string | null;
  publicTitle?: string;
  publicSummary?: string | null;
  revealedAtRound?: number | null;
}

export interface PrivateRivalryPayload {
  active: boolean;
  mode: Extract<InteractionMode, "rivalry" | "ruthless">;
  secrecy: "private";
  revealState: PrivateRivalryRevealState["state"];
  tableWarning: string;
  objective: PrivateRivalryObjective;
  scoring?: {
    pointsAwarded: number;
    completedAtRound: number | null;
    completedBySeatId: string | null;
    completionSummary: string | null;
  };
  recentPrivateNotes: string[];
  reveal: PrivateRivalryRevealState;
}

export interface PublicRivalryAgendaReveal {
  seatId: string;
  playerName: string;
  title: string;
  summary: string;
  revealedAtRound: number | null;
  createdAt: string | null;
}

export interface PublicRivalryAgendaCompletion {
  seatId: string;
  playerName: string;
  title: string;
  summary: string;
  pointsAwarded: number;
  createdAt: string | null;
}

export type ResultDeltaType =
  | "wound"
  | "heat"
  | "salvage"
  | "trophy"
  | "gearGained"
  | "gearLost"
  | "itemBought"
  | "itemSold"
  | "contractProgress"
  | "contractCompleted"
  | "scenarioProgress"
  | "scenarioPressure"
  | "agendaProgress"
  | "agendaCompleted"
  | "threatDefeated"
  | "threatRemains"
  | "sectorUnlocked"
  | "shopUnlocked"
  | "afflictionDrawn"
  | "afflictionFlipped"
  | "scarGained"
  | "recallTriggered"
  | "fateSpent"
  | "statUpgrade"
  | "modifierApplied";

export type ResultDeltaTargetScope = "personal" | "table" | "sector" | "scenario" | "privateAgenda";
export type ResultDeltaVisibility = "public" | "ownerPrivate" | "hidden";
export type ResultDeltaSeverity = "reward" | "loss" | "danger" | "scenario" | "private" | "neutral";
export type ResultDeltaSign = "gain" | "loss" | "neutral";

export interface ResultDelta {
  id: string;
  type: ResultDeltaType;
  label: string;
  value?: number | string;
  sign: ResultDeltaSign;
  targetScope: ResultDeltaTargetScope;
  targetSeatId?: string | null;
  visibility: ResultDeltaVisibility;
  reason?: string;
  source?: string;
  publicText: string;
  privateText?: string;
  severity: ResultDeltaSeverity;
}

export interface SectorNode {
  id: string;
  name: string;
  regionTier: string;
  neighbors: string[];
  danger: number;
  threatIcons?: ThreatIcon[];
  tileChallenges?: PublicTileChallenge[];
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
    | { type: "spaceTextResolved"; effectKey: string; label: string; target: number }
    | { type: "multiStopRoute"; ordered: boolean; targets: Array<{ id: string; type: "spaceId" | "tag"; value: string; label: string }> }
    | { type: "shopTransaction"; action: "buyEquipment" | "sellGear" | "repairGear" | "upgradeGear" | "trade"; requiredShopType?: string; requiredSectorId?: string; requiredCount: number; minimumSalvageSpent?: number; label: string };
  reward?: unknown;
}

export interface PublicTileChallenge {
  id: string;
  name: string;
  challengeType: "hazard" | "anomaly";
  sectorId: string;
  testStat: Stat;
  difficulty: number;
  trigger: "onArrival" | "onEnter" | "startOfTurnAtSector" | "scenarioPrompt";
  authoredOrder: number;
  recurring: true;
  tags: string[];
  lore: string;
  artCardId: string;
  successSummary: string;
  failureSummary: string;
}

export interface PublicPendingTileChallenge {
  challengeId: string;
  sectorId: string;
  seatId: string;
  challengeType: "hazard" | "anomaly";
  testStat: Stat;
  difficulty: number;
  authoredOrder: number;
  totalChallenges: number;
  rolled: boolean;
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

export type ResolutionStage =
  | "idle"
  | "card_reveal"
  | "battle_setup"
  | "dice_roll"
  | "roll_result"
  | "outcome_summary"
  | "awaiting_continue";

export interface ActiveResolution {
  id: string;
  playerId: string;
  source: "movement" | "threat" | "contract" | "anomaly" | "artifact" | "scenario";
  stage: ResolutionStage;
  card?: {
    id: string;
    title: string;
    type: string;
    flavor?: string | null;
    artType?: string;
  };
  battle?: {
    enemyName?: string;
    stat: Stat;
    difficulty: number;
    modifiers: Array<{ label: string; value: number }>;
  };
  roll?: {
    dice: number[];
    baseTotal: number;
    modifierTotal: number;
    finalTotal: number;
    target: number;
    success: boolean;
  };
  outcome?: {
    title: string;
    text: string;
    effects: string[];
  };
}

export type PublicShopStatus = "open" | "locked" | "exhausted" | "dangerous";

export interface PublicShopCost {
  salvage?: number;
  heat?: number;
  wounds?: number;
  trophies?: number;
  completedContracts?: number;
  scars?: number;
}

export interface PublicShopEncounterState {
  sectorId: string;
  sectorName: string;
  shopId: string;
  shopName: string;
  available?: boolean;
  blocked?: boolean;
  blockedReason?: ShopFailureReason;
  blockedReasonText?: string;
  shopType?: string;
  shopCategory?: ShopCategory;
  stockCategory?: ShopCategory;
  status: PublicShopStatus;
  activePlayer: {
    playerId: string;
    name: string;
    characterName: string;
    salvage: number;
    heat: number;
    wounds: {
      current: number;
      max: number;
    };
    trophies?: number;
    completedContracts?: number;
  };
  blockingThreats: Array<{
    cardId: string;
    name: string;
    type: "enemy" | "event" | "encounter" | "anomaly" | "hazard";
    deck?: "red" | "blue" | "yellow";
    challenge?: {
      stat: Stat;
      value: number;
    };
  }>;
  services: Array<{
    id: string;
    label: string;
    shopCategory?: ShopCategory;
    cost: PublicShopCost;
    risk?: string;
    enabled: boolean;
    disabledReason?: string;
  }>;
  revealedStock?: Array<{
    cardId: string;
    name: string;
    type: "gear" | "tactic" | "ability" | "boon" | "implant" | "artifact";
    shopCategories?: ShopCategory[];
    cost: {
      salvage?: number;
      heat?: number;
      completedContracts?: number;
    };
    summary: string;
    affordable: boolean;
    disabledReason?: string;
  }>;
  sellInventory?: Array<{
    gearId: string;
    name: string;
    type: "gear" | "artifact";
    category?: GearCategory;
    sellValue: number;
    summary: string;
    sellable: boolean;
    disabledReason?: ShopFailureReason | string;
  }>;
  recentOutcome?: {
    operativeName: string;
    shopName: string;
    action: string;
    gained?: string;
    costPaid?: PublicShopCost;
    remainingSalvage?: number;
    heatDelta?: number;
    woundDelta?: number;
    scarDelta?: number;
    discarded?: string[];
    sold?: string;
    salvageDelta?: number;
    summary: string;
  } | null;
}

export type PublicMoveStrategicTag = "safe" | "shop" | "locked" | "danger" | "reward" | "nemesis" | "gate";

export interface PublicMoveDestination {
  routeId?: string;
  defaultRouteId?: string;
  routeVariants?: Array<{ routeId: string; destinationId: string; sectorIds: string[]; sectorNames?: string[]; distance: number }>;
  sectorId: string;
  name: string;
  ring: "outer" | "middle" | "inner" | "core";
  distance: number;
  route: string[];
  routeNames?: string[];
  tags: string[];
  threatIcons: PublicMovementThreatIcon[];
  ruleText: string;
  loreText?: string;
  shop?: {
    shopId: string;
    shopName: string;
    status: PublicShopStatus;
    servicesPreview: string[];
  };
  faceUpThreats: Array<{
    instanceId: string;
    cardId: string;
    name: string;
    type: string;
    deck?: "red" | "blue" | "yellow" | "scenario";
    challenge?: {
      stat: Stat;
      value: number;
    };
    blocksShop: boolean;
    blocksSectorText: boolean;
  }>;
  occupants: Array<{
    playerId: string;
    name: string;
    characterName: string;
  }>;
  nemesisPresent?: boolean;
  scenarioMarkers?: string[];
  strategicTags: PublicMoveStrategicTag[];
  disabledReason?: string;
  voidKeyPrompt?: { instanceId: string; currentCharges: number; maxCharges: number; chargeCost: 1 };
  routeStarPrompt?: { instanceId: string; currentCharges: number; maxCharges: number; chargeCost: 1 };
}

export interface PublicMovementPlannerState {
  active: boolean;
  movementValue: number;
  originalMovementValue?: number;
  movementAdjustment?: -1 | 1 | null;
  compassPrompt?: { instanceId: string; currentCharges: number; maxCharges: number; canDecrease: boolean; canIncrease: boolean } | null;
  currentSectorId: string;
  currentSectorName: string;
  selectedDestinationId?: string | null;
  selectedRouteId?: string | null;
  routeStarCommitted?: boolean;
  movementRevision?: number;
  destinations: PublicMoveDestination[];
}

export interface PublicSectorExplorationThreat {
  instanceId: string;
  cardId: string;
  name: string;
  type: string;
  lane?: ThreatIcon | "scenario";
  blocksShop: boolean;
  blocksSectorText: boolean;
}

export interface PublicSectorExplorationSummary {
  sectorId: string;
  sectorName: string;
  printedThreatIcons: ThreatIcon[];
  unresolvedThreats: PublicSectorExplorationThreat[];
  drawCountsDue: Record<ThreatIcon, number>;
  sectorTextLocked: boolean;
  shopLocked: boolean;
  lockedReason: string | null;
  sectorTextTitle: string | null;
  shopName: string | null;
  explanationLines: string[];
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

export interface NemesisChampionSummary {
  id: string;
  name: string;
  type: string;
  boundPlayerId: string;
  sectorId: string;
  sectorName: string;
  strength: number;
  craft?: number;
  tech?: number;
  will?: number;
  health: number;
  maxHealth: number;
  trophies: number;
  movementProfile: "center_path" | "hunt_wounded" | "slow_brute" | "anomaly_shortcut";
  combatProfile: "strength" | "craft" | "tech" | "will" | "choice";
  specialRuleId: string;
  defeated: boolean;
  distanceToNexus: number;
  warning: boolean;
}

export interface NemesisNexusCountdownSummary {
  nemesisId: string;
  remainingTurns: number;
}

export interface ActiveScenarioSummary {
  id: string;
  name: string;
  theme: string;
  sheetArtPath?: string | null;
  difficulty: ScenarioDifficulty;
  mode?: ScenarioMode;
  pressureSummary: string;
  pressureTrack?: {
    name: string;
    start: number;
    max: number;
    tickTiming: string;
    collapseRule: string;
  };
  boardHooks?: {
    redThreat?: string;
    blueThreat?: string;
    yellowThreat?: string;
    shop?: string;
    shrine?: string;
    salvage?: string;
    anomaly?: string;
  };
  progressSources?: string[];
  finalGateRequirement?: string;
  scenarioRewards?: Array<{
    id: string;
    name: string;
    type: ScenarioRewardType;
    text: string;
    timing?: string;
  }>;
  nemesisName?: string;
  shopInteractions?: string[];
  tileEventHooks?: string[];
  modeScaling?: {
    singlePlayer?: string;
    multiplayer?: string;
  };
  publicDisplay?: {
    modeLabel: string;
    objective: string;
    privacy: string;
  };
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
  sheetArtPath?: string | null;
  difficulty: ScenarioDifficulty;
  mode?: ScenarioMode;
  publicDisplay?: ActiveScenarioSummary["publicDisplay"];
  pressureRule: string;
  expectedDuration: string;
  pressureTrack?: ActiveScenarioSummary["pressureTrack"];
  finalGateRequirement?: string;
  scenarioRewards?: ActiveScenarioSummary["scenarioRewards"];
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

export interface ScenarioPressureTrackState {
  name: string;
  current: number;
  max: number;
  modifier: number;
  difficultyBonus: number;
  failureAtMax: boolean;
  tickTiming: string;
  collapseRule: string;
}

export interface ScenarioObjectiveProgressState {
  label: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface ScenarioModeSpecificPublicState {
  kind: "single" | "co-op" | "rivalry" | "ruthless";
  label: string;
  summary: string;
  privateAgenda: "none" | "phone-only";
}

export interface ScenarioPressureState {
  scenarioId: string;
  scenarioName: string;
  mode: "single" | "co-op" | "rivalry" | "ruthless";
  scenarioStatus: "active" | "completed" | "failed";
  pressureTrack: ScenarioPressureTrackState;
  collapseTrack: ScenarioPressureTrackState;
  objectiveProgress: ScenarioObjectiveProgressState;
  publicSummary: string;
  modeSpecific: ScenarioModeSpecificPublicState;
}

export interface PublicPatchPayload {
  status: SessionStatus;
  sessionMode: SessionMode;
  gameMode?: GameMode;
  interactionMode?: InteractionMode;
  setupHostSeatId?: string | null;
  lobbyConfigured?: boolean;
  hostPhoneConnected?: boolean;
  winnerSeatId: string | null;
  activeScenario: ActiveScenarioSummary | null;
  scenarioTelemetry: ScenarioTelemetryItem[];
  scenarioPressure?: ScenarioPressureState | null;
  scenarioProgress: Record<string, number>;
  nemesisChampions?: NemesisChampionSummary[];
  nemesisNexusCountdowns?: NemesisNexusCountdownSummary[];
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
  pendingTileChallenge?: PublicPendingTileChallenge | null;
  pendingEncounterDecision?: { seatId: string; sourceCardId: string; sourceTitle: string; status: "waiting" } | null;
  outcomeSummary: OutcomeSummary | null;
  rivalryAgendaCompletion?: PublicRivalryAgendaCompletion | null;
  rivalryAgendaReveal?: PublicRivalryAgendaReveal | null;
  publicResultDeltas?: ResultDelta[];
  activeResolution?: ActiveResolution | null;
  shopEncounter?: PublicShopEncounterState | null;
  movementPlanner?: PublicMovementPlannerState | null;
  sectorExplorationSummary?: PublicSectorExplorationSummary | null;
  recentAbilityTriggers: AbilityTriggerSummary[];
  nemesis: ActiveNemesisSummary | null;
}

export interface PhonePatchPayload extends PublicPatchPayload {
  phase: Phase;
  self: PhoneSelfState | null;
  selfIsSetupHost?: boolean;
  objectUseStates?: PhoneObjectUseState[];
  startingContractOptions?: ContractCard[];
  selectedStartingContract?: ContractCard | null;
  activeContractCard?: ContractCard | null;
  canReady?: boolean;
  readyDisabledReason?: string | null;
  privateRivalry?: PrivateRivalryPayload | null;
  playerResultDeltas?: ResultDelta[];
  soloReroll?: {
    available: boolean;
    charges: number;
  };
  boundNemesis?: NemesisChampionSummary | null;
  crownKeyFragments?: number;
  eligibleNemesisAssistSeatIds?: string[];
  pendingTileChallengePrivate?: (PublicPendingTileChallenge & { id: string; staticIntercessionReactionId?: string; pendingFailureEffects?: Array<{ effectId: string; summary: string }> }) | null;
  pendingScarConsequence?: {
    reactionId: string;
    scarCardId: string;
    scarTitle: string;
    triggerType: string;
    sourceEventId: string;
    scarInstanceId: string;
    pendingEffects: Array<{ effectId: string; summary: string }>;
    rulesText: string;
  } | null;
  pendingEncounterDecisionPrivate?: {
    decisionId: string;
    decisionVersion: number;
    sourceTitle: string;
    prompt: string;
    mode: "required" | "optional";
    salvageCost: number;
    currentSalvage: number;
    options: Array<{ optionId: string; label: string; enabled: boolean; disabledReason?: string }>;
  } | null;
  oathchainPrompt?: {
    instanceId: string;
    contractId: string;
    contractSignature: string;
    currentCharges: number;
    maxCharges: number;
    chargeCost: 1;
    preview: string;
  } | null;
  activeOathchainReveal?: {
    revealId: string;
    contractId: string;
    contractName: string;
    objectiveProgress: string;
    revealedTargets: Array<{ kind: "threat" | "sector" | "routeStop" | "shopAction" | "tileChallenge"; id: string; label: string; sectorId?: string; detail: string }>;
    expiresAtTurnEnd: true;
  } | null;
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
      type: "MOVEMENT_DESTINATION_PREVIEWED";
      seatId: string;
      toSectorId: string | null;
      routeId?: string;
      movementRevision?: number;
    }
  | {
      type: "MOVE_REQUESTED";
      seatId: string;
      toSectorId: string;
      voidKeyInstanceId?: string;
      routeId?: string;
      movementRevision?: number;
    }
  | { type: "SELECT_ROUTE_STAR_VARIANT"; seatId: string; instanceId: string; destinationId: string; routeId: string; movementRevision: number }
  | {
      type: "MOVEMENT_ROLL_REQUESTED";
      seatId: string;
    }
  | { type: "ADJUST_MOVEMENT_REQUESTED"; seatId: string; instanceId: string; adjustment: -1 | 1 }
  | { type: "ACTIVATE_GATE_SAINT"; seatId: string; instanceId: string }
  | { type: "USE_MARROW_DETOUR"; seatId: string; instanceId: string; reactionId: string; toSectorId: string }
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
      type: "SOLO_REROLL_REQUESTED";
      seatId: string;
    }
  | {
      type: "CONTINUE_RESOLUTION";
      seatId: string;
    }
  | { type: "ENCOUNTER_DECISION_REQUESTED"; seatId: string; decisionId: string; decisionVersion: number; optionId: string }
  | {
      type: "CONTINUE_SCAR_CONSEQUENCE";
      seatId: string;
      reactionId: string;
    }
  | {
      type: "SET_READY";
      seatId: string;
      ready: boolean;
    }
  | {
      type: "SELECT_STARTING_CONTRACT";
      seatId: string;
      contractId: string;
    }
  | {
      type: "SELECT_CHARACTER";
      seatId: string;
      characterId: string;
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
      instanceId?: string;
      pendingTileChallengeId?: string;
      staticIntercessionReactionId?: string;
      pendingTileChallengeEffectId?: string;
      scarConsequenceReactionId?: string;
      scarInstanceId?: string;
      pendingScarEffectId?: string;
      contractSignature?: string;
    }
  | {
      type: "USE_FOLLOWER";
      seatId: string;
      followerId: string;
      escalate?: boolean;
    }
  | {
      type: "USE_CHARACTER_ABILITY";
      seatId: string;
      abilityId: string;
    }
  | {
      type: "TABLE_INTERACTION";
      seatId: string;
      targetSeatId: string;
      interactionKind: "trade" | "aid" | "duel" | "interfere";
    }
  | {
      type: "SHOP_SERVICE_REQUESTED";
      seatId: string;
      serviceId: string;
    }
  | {
      type: "SHOP_PURCHASE_REQUESTED";
      seatId: string;
      cardId: string;
    }
  | {
      type: "SHOP_SELL_REQUESTED";
      seatId: string;
      gearId: string;
    }
  | {
      type: "SHOP_SKIP_REQUESTED";
      seatId: string;
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
      type: "RIVALRY_AGENDA_REVEAL_REQUESTED";
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
    }
  | {
      type: "NEMESIS_COMBAT_REQUESTED";
      seatId: string;
      nemesisId: string;
      stat?: Stat;
      assistSeatIds?: string[];
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
  isHostPhone?: boolean;
  lastConnectedAt?: string;
}

export interface CharacterCatalogEntry extends PrivateCharacter {}
