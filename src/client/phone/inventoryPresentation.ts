import type { ActiveResolution, Follower, GearItem, GearSlot, PhonePatchPayload, PhoneSelfState, Stat } from "../shared/types.js";

export type InventoryTimingWindow =
  | "beforeBattleRoll"
  | "afterBattleRoll"
  | "beforeTakingDamage"
  | "startOfTurn"
  | "movement"
  | "anyTime";

export type InventoryGroupLabel = "Weapons" | "Armor" | "Relics" | "Consumables" | "Followers" | "Quest Items";

export type InventoryUsabilityStatus = "Usable now" | "Ready but not usable now" | "Passive" | "Locked / condition not met";

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
    | { type: "USE_GEAR"; gearId: string }
    | { type: "USE_FOLLOWER"; followerId: string }
    | null;
  statBonus?: { stat: Stat; amount: number } | null;
  useLimit?: GearItem["useLimit"] | Follower["useLimit"];
  charges?: number | null;
  artCardId?: string | null;
  fallbackLabel: string;
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
  "Relics",
  "Consumables",
  "Followers",
  "Quest Items"
];

const statLabelById: Record<Stat, string> = {
  command: "Command",
  grit: "Grit",
  signal: "Signal",
  guile: "Guile",
  forge: "Forge"
};

function toTitleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatTimingWindow(window: InventoryTimingWindow): string {
  switch (window) {
    case "beforeBattleRoll":
      return "Before battle roll";
    case "afterBattleRoll":
      return "After battle roll";
    case "beforeTakingDamage":
      return "Before taking damage";
    case "startOfTurn":
      return "Start of turn";
    case "movement":
      return "Movement";
    case "anyTime":
      return "Any time";
  }
}

function getEquippedGearBonus(self: PhoneSelfState, stat: Stat): number {
  const equippedIds = new Set(Object.values(self.character.equippedGear).filter((value): value is string => Boolean(value)));

  return self.character.heldGear.reduce((sum, item) => {
    if (!equippedIds.has(item.id) || item.statBonus.stat !== stat) {
      return sum;
    }

    return sum + item.statBonus.amount;
  }, 0);
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

  if (patch.phase === "start") {
    return "startOfTurn";
  }

  return "anyTime";
}

function serverAcceptsCardUse(patch: PhonePatchPayload): boolean {
  return patch.phase === "action";
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function uniqueWindows(windows: InventoryTimingWindow[]): InventoryTimingWindow[] {
  return [...new Set(windows)];
}

function inferGearTimingWindows(item: GearItem): InventoryTimingWindow[] {
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

  if (item.category === "consumable") {
    return "Consumables";
  }

  if (item.category === "contractObject") {
    return "Quest Items";
  }

  return "Relics";
}

function getGearLockReason(item: GearItem, self: PhoneSelfState): string | null {
  const text = `${item.activeText ?? ""}`.toLowerCase();

  if (item.useLimit === "charge" && (item.charges ?? 0) <= 0) {
    return "No charges remain.";
  }

  if (hasAny(text, ["heal"]) && self.character.wounds <= 0 && !hasAny(text, ["prevent", "braced"])) {
    return "No wounds to heal.";
  }

  if ((item.heatCost ?? 0) > self.character.heat) {
    return `Needs ${item.heatCost} heat.`;
  }

  if (item.linkedFollowerRole && !(self.character.followers ?? []).some((follower) => follower.role === item.linkedFollowerRole)) {
    return `Needs a ${toTitleCase(item.linkedFollowerRole)} follower.`;
  }

  return null;
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

function buildGearCard(item: GearItem, patch: PhonePatchPayload, self: PhoneSelfState): InventoryCardViewModel {
  const timingWindows = inferGearTimingWindows(item);
  const active = Boolean(item.activeText || item.useLimit);
  const currentTimingWindow = getCurrentTimingWindow(patch);
  const status = getStatus({
    timingWindows,
    currentTimingWindow,
    lockedReason: getGearLockReason(item, self),
    active,
    canServerAccept: serverAcceptsCardUse(patch)
  });

  return {
    id: item.id,
    source: "gear",
    group: getGearGroup(item),
    name: item.name,
    effectText: item.activeText ?? `Passive +${item.statBonus.amount} ${statLabelById[item.statBonus.stat]}.`,
    timingText: timingWindows.length > 0 ? timingWindows.map(formatTimingWindow).join(", ") : "Passive",
    timingWindows,
    ...status,
    useIntent: status.canUseNow ? { type: "USE_GEAR", gearId: item.id } : null,
    statBonus: item.statBonus,
    useLimit: item.useLimit,
    charges: item.charges ?? null,
    artCardId: `artifact-${item.id}`,
    fallbackLabel: getFallbackLabel(item.name)
  };
}

function buildFollowerCard(follower: Follower, patch: PhonePatchPayload): InventoryCardViewModel {
  const timingWindows = inferFollowerTimingWindows(follower);
  const active = Boolean(follower.useLimit);
  const status = getStatus({
    timingWindows,
    currentTimingWindow: getCurrentTimingWindow(patch),
    lockedReason: null,
    active,
    canServerAccept: serverAcceptsCardUse(patch)
  });

  return {
    id: follower.id,
    source: "follower",
    group: "Followers",
    name: follower.name,
    effectText: follower.text,
    timingText: timingWindows.length > 0 ? timingWindows.map(formatTimingWindow).join(", ") : "Passive",
    timingWindows,
    ...status,
    useIntent: status.canUseNow ? { type: "USE_FOLLOWER", followerId: follower.id } : null,
    useLimit: follower.useLimit,
    charges: null,
    artCardId: null,
    fallbackLabel: getFallbackLabel(follower.name)
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
  const playerBattleValue = self.character.stats[stat] + getEquippedGearBonus(self, stat);
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
  return toTitleCase(slot);
}

export { statLabelById };
