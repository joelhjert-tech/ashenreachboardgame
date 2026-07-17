import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import {
  getCharacterStatBreakdown,
  getEquippedGearItem
} from "../../game/engine/gear.js";
import type { ActiveResolution, Follower, GearItem, GearSlot, PhoneObjectUseState, PhonePatchPayload, PhoneSelfState, Stat } from "../shared/types.js";
import { getGearCardArtId, getGearCardArtType } from "../shared/assetPaths.js";
import { gearSlotLabelById, statLabelById } from "../shared/statLabels.js";

export type InventoryTimingWindow =
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

export type InventoryGroupLabel =
  | "Weapons"
  | "Armor"
  | "Equipment"
  | "Consumables"
  | "Followers"
  | "Artifacts / Relics"
  | "Quest Items";

export type InventoryUsabilityStatus = "Usable now" | "Ready but not usable now" | "Passive" | "Locked / condition not met" | "Suppressed";

export interface InventoryPassiveBonusPresentation {
  stat: Stat;
  amount: number;
  state: "active" | "unequipped" | "conditional" | "suppressed";
  text: string;
}

export interface InventoryActiveAbilityPresentation {
  text: string;
  timingText: string;
  availableNow: boolean;
  contextualControl: boolean;
}

export interface InventoryChargePresentation {
  current: number;
  maximum: number;
  cost: number;
  depleted: boolean;
}

export interface InventoryExhaustPresentation {
  status: "Ready" | "Exhausted";
  resetText: string;
}

export interface InventoryCardViewModel {
  id: string;
  source: "gear" | "follower";
  group: InventoryGroupLabel;
  name: string;
  effectText: string;
  timingText: string;
  timingWindows: InventoryTimingWindow[];
  status: InventoryUsabilityStatus;
  statusReason: string;
  canUseNow: boolean;
  useIntent:
    | { type: "USE_GEAR"; gearId: string; instanceId?: string; contractSignature?: string }
    | { type: "USE_FOLLOWER"; followerId: string; escalate?: boolean }
    | null;
  statBonus?: { stat: Stat; amount: number } | null;
  useLimit?: GearItem["useLimit"] | Follower["useLimit"];
  charges?: number | null;
  maxUses?: number | null;
  artCardType?: CardImageType | null;
  artCardId?: string | null;
  fallbackLabel: string;
  passiveBonus?: InventoryPassiveBonusPresentation | null;
  activeAbility?: InventoryActiveAbilityPresentation | null;
  chargeState?: InventoryChargePresentation | null;
  exhaustState?: InventoryExhaustPresentation | null;
  activationCostText?: string;
}

export interface InventoryGroupViewModel {
  group: InventoryGroupLabel;
  items: InventoryCardViewModel[];
}

export interface BattleAssistViewModel {
  isBattleWindow: boolean;
  enemyName: string;
  enemyBattleValue: number;
  enemyType: string;
  playerBattleStat: Stat;
  playerBattleValue: number;
  phaseLabel: "before roll" | "after roll" | "damage" | "outcome";
  currentTimingWindow: InventoryTimingWindow;
  usableCards: InventoryCardViewModel[];
}

const inventoryGroupOrder: InventoryGroupLabel[] = [
  "Weapons",
  "Armor",
  "Equipment",
  "Consumables",
  "Followers",
  "Artifacts / Relics",
  "Quest Items"
];
function toTitleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatTimingWindow(window: InventoryTimingWindow): string {
  switch (window) {
    case "beforeThreatDraw":
      return "Before threat draw";
    case "beforeBattleRoll":
      return "Before battle roll";
    case "afterBattleRoll":
      return "After battle roll";
    case "afterFailedTest":
      return "After failed movement or hazard test";
    case "beforeTakingDamage":
      return "Before taking damage";
    case "startOfTurn":
      return "Start of turn";
    case "movement":
      return "Movement";
    case "movementRouteConfirmation":
      return "Movement route confirmation";
    case "beforeAnomalySignalTest":
      return "Before an anomaly Signal test";
    case "pendingScarConsequence":
      return "Pending Scar consequence";
    case "shop":
      return "Shop";
    case "action":
      return "Action window";
    case "anyTime":
      return "Any time";
  }
}

function getEquippedGearBonus(
  self: PhoneSelfState,
  stat: Stat,
  mode: "resting" | "battle" = "resting",
  suppressedInstanceIds?: ReadonlySet<string>
): number {
  const breakdown = getCharacterStatBreakdown(self.character, stat, { mode, suppressedInstanceIds });
  return breakdown.equipped.concat(breakdown.companions).reduce((sum, source) => sum + source.value, 0);
}

function getActiveSeatId(patch: PhonePatchPayload): string | null {
  return patch.turnOrder[patch.activeSeatIndex] ?? null;
}

function getBattleResolution(patch: PhonePatchPayload): ActiveResolution | null {
  const resolution = patch.activeResolution ?? null;

  if (!resolution?.battle) {
    return null;
  }

  return resolution;
}

function getBattleStat(patch: PhonePatchPayload): Stat {
  return getBattleResolution(patch)?.battle?.stat ?? patch.encounter?.stat ?? patch.pendingEnemyRoll?.stat ?? "grit";
}

function getBattlePhase(patch: PhonePatchPayload): BattleAssistViewModel["phaseLabel"] {
  const resolution = getBattleResolution(patch);

  if (resolution?.outcome && (resolution.stage === "outcome_summary" || resolution.stage === "awaiting_continue")) {
    return "outcome";
  }

  if (resolution?.roll) {
    return resolution.roll.success ? "after roll" : "damage";
  }

  return "before roll";
}

export function getCurrentTimingWindow(patch: PhonePatchPayload): InventoryTimingWindow {
  const phaseLabel = getBattlePhase(patch);
  const hasBattle = Boolean(getBattleResolution(patch)?.battle || patch.encounter?.cardType === "enemy" || patch.pendingEnemyRoll);

  if (hasBattle) {
    if (phaseLabel === "damage") {
      return "beforeTakingDamage";
    }

    if (phaseLabel === "after roll" || phaseLabel === "outcome") {
      return "afterBattleRoll";
    }

    return "beforeBattleRoll";
  }

  if (patch.phase === "navigation") {
    return "movement";
  }

  if (patch.phase === "sector") {
    return "beforeThreatDraw";
  }

  if (patch.phase === "start") {
    return "startOfTurn";
  }

  return patch.phase === "action" ? "action" : "anyTime";
}

function serverAcceptsCardUse(patch: PhonePatchPayload): boolean {
  return patch.phase === "action" || patch.phase === "sector" || (patch.phase === "resolution" && patch.activeResolution?.roll?.success === false);
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function uniqueWindows(windows: InventoryTimingWindow[]): InventoryTimingWindow[] {
  return [...new Set(windows)];
}

function inferGearTimingWindows(item: GearItem): InventoryTimingWindow[] {
  if (item.activationTiming?.length) return item.activationTiming;
  if (!item.activeText && !item.useLimit) {
    return [];
  }

  const text = `${item.name} ${item.category ?? ""} ${item.activeText ?? ""} ${item.useLimit ?? ""}`.toLowerCase();
  const windows: InventoryTimingWindow[] = [];

  if (item.slot === "weapon" || hasAny(text, ["combat", "battle", "fight", "pressure"])) {
    windows.push("beforeBattleRoll");
  }

  if (hasAny(text, ["reroll", "failed", "after", "check"])) {
    windows.push("afterBattleRoll");
  }

  if (hasAny(text, ["prevent", "damage", "braced", "armor"])) {
    windows.push("beforeTakingDamage");
  }

  if (hasAny(text, ["wound", "heal"])) {
    windows.push("anyTime");
  }

  if (hasAny(text, ["movement", "move", "route"])) {
    windows.push("movement");
  }

  if (hasAny(text, ["start of turn", "turn start"])) {
    windows.push("startOfTurn");
  }

  if (windows.length === 0 || item.category === "active" || item.category === "chargedRelic" || item.category === "consumable") {
    windows.push("anyTime");
  }

  return uniqueWindows(windows);
}

function inferFollowerTimingWindows(follower: Follower): InventoryTimingWindow[] {
  if (follower.timingWindows?.length) {
    return uniqueWindows(follower.timingWindows);
  }

  if (!follower.useLimit) {
    return [];
  }

  const text = `${follower.name} ${follower.role} ${follower.text} ${follower.useLimit}`.toLowerCase();
  const windows: InventoryTimingWindow[] = [];

  if (hasAny(text, ["combat", "battle", "before rolling", "difficulty", "pressure"]) || follower.role === "gunner") {
    windows.push("beforeBattleRoll");
  }

  if (hasAny(text, ["failed", "reroll", "after"])) {
    windows.push("afterBattleRoll");
  }

  if (hasAny(text, ["wound", "damage", "heal", "prevent"]) || follower.role === "medic") {
    windows.push("beforeTakingDamage", "anyTime");
  }

  if (hasAny(text, ["movement", "move", "route"]) || follower.role === "scout" || follower.role === "guide") {
    windows.push("movement");
  }

  if (hasAny(text, ["threat draw", "drawing threats", "warning barks", "reveal one local threat"])) {
    windows.push("beforeThreatDraw");
  }

  if (windows.length === 0) {
    windows.push("anyTime");
  }

  return uniqueWindows(windows);
}

function getGearGroup(item: GearItem): InventoryGroupLabel {
  if (item.slot === "weapon") {
    return "Weapons";
  }

  if (item.slot === "armor") {
    return "Armor";
  }

  if (item.category === "contractObject") {
    return "Quest Items";
  }

  if (item.category === "chargedRelic" || item.tier === "artifact") {
    return "Artifacts / Relics";
  }

  if (item.category === "consumable") {
    return "Consumables";
  }

  return "Equipment";
}

function getGearLockReason(item: GearItem, self: PhoneSelfState): string | null {
  const text = `${item.activeText ?? ""}`.toLowerCase();

  if (item.useLimit === "charge" && (item.currentCharges ?? item.charges ?? 0) <= 0) {
    return "No charges remain.";
  }
  if (item.effectModel === "exhaust" && item.requiresEquipped && !isExactItemEquipped(item, self)) return "Equip this Artifact before using it.";

  if (hasAny(text, ["heal"]) && self.character.wounds <= 0 && !hasAny(text, ["prevent", "braced"])) {
    return "No wounds to heal.";
  }

  if (item.linkedFollowerRole && !(self.character.followers ?? []).some((follower) => follower.role === item.linkedFollowerRole)) {
    return `Needs a ${toTitleCase(item.linkedFollowerRole)} follower.`;
  }

  return null;
}

function getObjectUseState(
  patch: PhonePatchPayload,
  source: PhoneObjectUseState["source"],
  id: string,
  instanceId?: string
): PhoneObjectUseState | null {
  return patch.objectUseStates?.find((state) => state.source === source && state.id === id && (!instanceId || state.instanceId === instanceId)) ?? null;
}

function isBattleRollTiming(timingWindows: InventoryTimingWindow[], currentTimingWindow: InventoryTimingWindow): boolean {
  return currentTimingWindow === "beforeBattleRoll" && timingWindows.includes("beforeBattleRoll");
}

function getStatMismatchReason(item: GearItem, timingWindows: InventoryTimingWindow[], currentTimingWindow: InventoryTimingWindow, patch: PhonePatchPayload): string | null {
  if (!item.statBonus || !isBattleRollTiming(timingWindows, currentTimingWindow)) {
    return null;
  }

  const battleStat = getBattleStat(patch);

  if (item.statBonus.stat === battleStat) {
    return null;
  }

  return `Usable only in ${statLabelById[item.statBonus.stat]} battles. This encounter uses ${statLabelById[battleStat]}.`;
}

function getStatus({
  timingWindows,
  currentTimingWindow,
  lockedReason,
  active,
  canServerAccept
}: {
  timingWindows: InventoryTimingWindow[];
  currentTimingWindow: InventoryTimingWindow;
  lockedReason: string | null;
  active: boolean;
  canServerAccept: boolean;
}): Pick<InventoryCardViewModel, "status" | "statusReason" | "canUseNow"> {
  if (!active) {
    return {
      status: "Passive",
      statusReason: "Always on while held or equipped.",
      canUseNow: false
    };
  }

  if (lockedReason) {
    return {
      status: "Locked / condition not met",
      statusReason: lockedReason,
      canUseNow: false
    };
  }

  if ((timingWindows.includes(currentTimingWindow) || timingWindows.includes("anyTime")) && canServerAccept) {
    return {
      status: "Usable now",
      statusReason: "Available in this timing window.",
      canUseNow: true
    };
  }

  return {
    status: "Ready but not usable now",
    statusReason: canServerAccept ? `Use during ${timingWindows.map(formatTimingWindow).join(", ")}.` : "Wait for an action window.",
    canUseNow: false
  };
}

function getFallbackLabel(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPassiveGearBonus(item: GearItem): string {
  const amount = item.statBonus.amount >= 0 ? `+${item.statBonus.amount}` : String(item.statBonus.amount);
  const stat = statLabelById[item.statBonus.stat];
  return `${amount} ${stat}`;
}

function formatConditionalGearBonus(item: GearItem): string | null {
  return item.effectModel === "conditional" && item.conditionType === "battle"
    ? `${formatPassiveGearBonus(item)} in battles`
    : null;
}

function isExactItemEquipped(item: GearItem, self: PhoneSelfState): boolean {
  const equipped = getEquippedGearItem(self.character, item.slot);
  if (!equipped) return false;
  if (item.instanceId || equipped.instanceId) return Boolean(item.instanceId && equipped.instanceId === item.instanceId);
  return equipped.id === item.id;
}

function buildGearCard(item: GearItem, patch: PhonePatchPayload, self: PhoneSelfState): InventoryCardViewModel {
  const timingWindows = inferGearTimingWindows(item);
  const hasActiveAbility =
    item.effectModel === "consumable" ||
    item.effectModel === "charged" ||
    item.effectModel === "exhaust" ||
    Boolean(item.activeText && item.useLimit);
  const inventoryOwnsControl =
    item.effectModel === "consumable" ||
    item.effectModel === "exhaust" ||
    item.chargedEffect === "traceThePromise" ||
    (!item.effectModel && Boolean(item.activeText || item.useLimit));
  const isEquipped = isExactItemEquipped(item, self);
  const useState = getObjectUseState(patch, "gear", item.id, item.instanceId);
  const currentTimingWindow = timingWindows.includes("action") && patch.phase === "action" ? "action" : getCurrentTimingWindow(patch);
  const oathchainPrompt = item.chargedEffect === "traceThePromise" ? patch.oathchainPrompt : null;
  const suppression = item.instanceId ? patch.equipmentSuppressions?.find((entry) => entry.itemInstanceId === item.instanceId) : null;
  const lockedReason =
    suppression
      ? `${item.name} is temporarily suppressed.`
      : useState?.disabledReason ??
        getGearLockReason(item, self) ??
        (item.chargedEffect === "traceThePromise" && !oathchainPrompt
          ? "Trace the Promise requires your action phase, an active Contract, and a visible valid target."
          : null) ??
        getStatMismatchReason(item, timingWindows, currentTimingWindow, patch);
  const activeStatus = hasActiveAbility
    ? getStatus({
        timingWindows,
        currentTimingWindow,
        lockedReason,
        active: true,
        canServerAccept: serverAcceptsCardUse(patch)
      })
    : null;
  const status = suppression
    ? {
        status: "Suppressed" as const,
        statusReason: `${item.name} is temporarily suppressed. Its equipped bonus and active ability are unavailable.`,
        canUseNow: false
      }
    : activeStatus
    ? {
        ...activeStatus,
        canUseNow: activeStatus.canUseNow && inventoryOwnsControl,
        statusReason:
          activeStatus.canUseNow && !inventoryOwnsControl
            ? `Use this ability from the ${timingWindows.map(formatTimingWindow).join(", ").toLowerCase()} prompt.`
            : activeStatus.statusReason
      }
    : isEquipped
      ? {
          status: "Passive" as const,
          statusReason: item.effectModel === "conditional"
            ? `${formatConditionalGearBonus(item)}. Applied automatically only in that context.`
            : `${formatPassiveGearBonus(item)}. Always active while equipped.`,
          canUseNow: false
        }
      : {
          status: "Ready but not usable now" as const,
          statusReason: `Equip to apply ${formatConditionalGearBonus(item) ?? formatPassiveGearBonus(item)}.`,
          canUseNow: false
        };
  const remainingUses = useState?.remainingUses ?? item.currentCharges ?? item.charges ?? null;
  const maxUses = useState?.maxUses ?? item.maxCharges ?? item.maxUses ?? (item.useLimit === "charge" ? item.charges ?? null : null);
  const chargeState = item.useLimit === "charge" || item.effectModel === "charged"
    ? {
        current: Math.max(0, remainingUses ?? 0),
        maximum: Math.max(1, maxUses ?? item.maxCharges ?? item.startingCharges ?? 1),
        cost: item.chargeCost ?? 1,
        depleted: (remainingUses ?? 0) <= 0
      }
    : null;
  const passiveState: InventoryPassiveBonusPresentation["state"] = suppression
    ? "suppressed"
    : !isEquipped
      ? "unequipped"
      : item.effectModel === "conditional"
        ? "conditional"
        : "active";
  const passiveBonus = item.effectModel === "consumable"
    ? null
    : {
        stat: item.statBonus.stat,
        amount: item.statBonus.amount,
        state: passiveState,
        text:
          passiveState === "suppressed"
            ? `${formatPassiveGearBonus(item)} · SUPPRESSED`
            : passiveState === "unequipped"
              ? `Equip to apply ${formatPassiveGearBonus(item)}`
              : passiveState === "conditional"
                ? `${formatPassiveGearBonus(item)} in battles`
                : `${formatPassiveGearBonus(item)} · ALWAYS ACTIVE`
      };
  const activeAbility = hasActiveAbility
    ? {
        text: item.activeText ?? "Resolve this item's authored active effect.",
        timingText: timingWindows.length > 0 ? timingWindows.map(formatTimingWindow).join(", ") : "Authoritative prompt",
        availableNow: Boolean(activeStatus?.canUseNow && !suppression && !chargeState?.depleted),
        contextualControl: !inventoryOwnsControl
      }
    : null;

  return {
    id: item.id,
    source: "gear",
    group: getGearGroup(item),
    name: item.name,
    effectText: item.effectModel === "consumable" ? `One Use — ${item.activeText ?? "Consume to resolve its effect."}` : item.activeText ?? `Passive ${formatPassiveGearBonus(item)}.`,
    timingText: timingWindows.length > 0 ? timingWindows.map(formatTimingWindow).join(", ") : "Passive",
    timingWindows,
    ...status,
    useIntent: status.canUseNow && inventoryOwnsControl ? { type: "USE_GEAR", gearId: item.id, instanceId: oathchainPrompt?.instanceId ?? item.instanceId, contractSignature: oathchainPrompt?.contractSignature } : null,
    statBonus: item.effectModel === "consumable" ? null : item.statBonus,
    useLimit: item.useLimit,
    charges: remainingUses,
    maxUses,
    artCardType: getGearCardArtType(item),
    artCardId: getGearCardArtId(item),
    fallbackLabel: getFallbackLabel(item.name),
    passiveBonus,
    activeAbility,
    chargeState,
    exhaustState: item.effectModel === "exhaust"
      ? {
          status: item.exhausted ? "Exhausted" : "Ready",
          resetText: "Refreshes next round"
        }
      : null,
    activationCostText: item.rechargeRule === "none"
      ? "No Recharge"
      : item.activationCost
      ? `Cost: ${item.activationCost.amount} ${item.activationCost.type === "salvage" ? "Salvage" : "Wound"}`
      : undefined
  };
}

function buildFollowerCard(follower: Follower, patch: PhonePatchPayload): InventoryCardViewModel {
  const timingWindows = inferFollowerTimingWindows(follower);
  const active = Boolean(follower.useLimit);
  const useState = getObjectUseState(patch, "follower", follower.id);
  const status = getStatus({
    timingWindows,
    currentTimingWindow: getCurrentTimingWindow(patch),
    lockedReason: useState?.disabledReason ?? null,
    active,
    canServerAccept: follower.effectModel === "exhaust" ? ["action", "sector", "navigation", "resolution"].includes(patch.phase) : serverAcceptsCardUse(patch)
  });
  const remainingUses = useState?.remainingUses ?? null;
  const maxUses = useState?.maxUses ?? (follower.useLimit ? 1 : null);

  return {
    id: follower.id,
    source: "follower",
    group: "Followers",
    name: follower.name,
    effectText: `${follower.text}${follower.id === "fandiablos" && patch.self?.character.temporaryAllStatBoost ? ` Too Many Dogs: +${patch.self.character.temporaryAllStatBoost.value} all stats for ${patch.self.character.temporaryAllStatBoost.remainingEligibleResolutions} more battle/hazard resolution(s).` : ""}`,
    timingText: `${timingWindows.length > 0 ? timingWindows.map(formatTimingWindow).join(", ") : "Passive"}${follower.effectModel === "exhaust" ? ". Refreshes next round" : ""}`,
    timingWindows,
    ...status,
    useIntent: status.canUseNow ? { type: "USE_FOLLOWER", followerId: follower.id } : null,
    useLimit: follower.useLimit,
    charges: follower.effectModel === "exhaust" ? null : remainingUses,
    maxUses: follower.effectModel === "exhaust" ? null : maxUses,
    exhaustState: follower.effectModel === "exhaust"
      ? {
          status: follower.exhausted ? "Exhausted" : "Ready",
          resetText: "Refreshes next round"
        }
      : null,
    artCardType: follower.artCardId ? "artifact" : null,
    artCardId: follower.artCardId ?? null,
    fallbackLabel: getFallbackLabel(follower.name),
    activationCostText: follower.id === "fandiablos" ? "Cost: 1 Wound (or 2 Wounds for +2 all stats on next 2 battles/hazards)" : undefined
  };
}

export function getInventoryCards(patch: PhonePatchPayload): InventoryCardViewModel[] {
  const self = patch.self;

  if (!self) {
    return [];
  }

  return [
    ...self.character.heldGear.map((item) => buildGearCard(item, patch, self)),
    ...(self.character.followers ?? []).map((follower) => buildFollowerCard(follower, patch))
  ];
}

export function getInventoryGroups(patch: PhonePatchPayload): InventoryGroupViewModel[] {
  const cards = getInventoryCards(patch);

  return inventoryGroupOrder.map((group) => ({
    group,
    items: cards.filter((item) => item.group === group)
  }));
}

export function getBattleAssistViewModel(patch: PhonePatchPayload): BattleAssistViewModel | null {
  const self = patch.self;

  if (!self) {
    return null;
  }

  const resolution = getBattleResolution(patch);
  const encounter = patch.encounter;
  const activeSeatId = getActiveSeatId(patch);
  const battleBelongsToSelf =
    resolution?.playerId === self.seatId ||
    (activeSeatId === self.seatId && encounter?.cardType === "enemy") ||
    patch.pendingEnemyRoll?.fighterSeatId === self.seatId;
  const hasBattleWindow = battleBelongsToSelf && Boolean(resolution?.battle || encounter?.cardType === "enemy" || patch.pendingEnemyRoll);

  if (!hasBattleWindow) {
    return null;
  }

  const stat = getBattleStat(patch);
  const enemyBattleValue = resolution?.battle?.difficulty ?? encounter?.difficulty ?? 0;
  const suppressedInstanceIds = new Set(
    (patch.equipmentSuppressions ?? [])
      .filter((suppression) => suppression.active)
      .map((suppression) => suppression.itemInstanceId)
  );
  const playerBattleValue = self.character.stats[stat] + getEquippedGearBonus(self, stat, "battle", suppressedInstanceIds);
  const currentTimingWindow = getCurrentTimingWindow(patch);
  const usableCards = getInventoryCards(patch).filter(
    (card) =>
      card.canUseNow &&
      (card.timingWindows.includes(currentTimingWindow) ||
        card.timingWindows.includes("anyTime"))
  );

  return {
    isBattleWindow: true,
    enemyName:
      resolution?.battle?.enemyName ??
      encounter?.enemyName ??
      encounter?.title ??
      patch.pendingEnemyRoll?.encounterTitle ??
      "Enemy",
    enemyBattleValue,
    enemyType: encounter?.cardType ? toTitleCase(encounter.cardType) : resolution?.card?.type ? toTitleCase(resolution.card.type) : "Enemy",
    playerBattleStat: stat,
    playerBattleValue,
    phaseLabel: getBattlePhase(patch),
    currentTimingWindow,
    usableCards
  };
}

export function getSlotLabel(slot: GearSlot): string {
  return gearSlotLabelById[slot];
}

export { statLabelById };
