import type {
  GameAction,
  LegacyCompatibleGameAction,
  LegacyCompatibleShopServiceCost,
  LegacyCompatibleShopServiceResult,
  ShopServiceCost,
  ShopServiceResult
} from "../engine/actions.js";
import { normalizeLegacyEncounterEffect } from "../rules/legacyHeatCompatibility.js";

export interface LegacyCompatibilityEventRecord {
  type: "LEGACY_COMPATIBILITY_EVENT";
  legacyType: "HEAT_THRESHOLD_REACHED" | "STABILIZE_RESOLVED";
  seatId: string;
  createdAt: string;
}

export type NormalizedLegacyEvent = GameAction | LegacyCompatibilityEventRecord;

function normalizeCost(cost: LegacyCompatibleShopServiceCost): ShopServiceCost {
  const { heat: _retiredHeatCost, ...current } = cost;
  return current;
}

function normalizeResult(result: LegacyCompatibleShopServiceResult): ShopServiceResult {
  const { heatDelta: _retiredHeatDelta, ...current } = result;
  return current;
}

export function normalizeLegacyGameAction(
  action: LegacyCompatibleGameAction
): NormalizedLegacyEvent {
  if (action.type === "HEAT_THRESHOLD_REACHED") {
    return {
      type: "LEGACY_COMPATIBILITY_EVENT",
      legacyType: action.type,
      seatId: action.seatId,
      createdAt: action.createdAt
    };
  }

  if (action.type === "STABILIZE_RESOLVED" && action.cost.kind === "heat") {
    return {
      type: "LEGACY_COMPATIBILITY_EVENT",
      legacyType: action.type,
      seatId: action.seatId,
      createdAt: action.createdAt
    };
  }

  switch (action.type) {
    case "MOVEMENT_RESOLVED":
    case "CHECK_ROLLED":
    case "SOLO_REROLL_RESOLVED":
    case "USE_GEAR":
    case "USE_FOLLOWER":
      return {
        ...action,
        effect: action.effect ? normalizeLegacyEncounterEffect(action.effect) : null
      } as GameAction;
    case "ENCOUNTER_DRAWN":
      return {
        ...action,
        revealEffect: action.revealEffect
          ? normalizeLegacyEncounterEffect(action.revealEffect)
          : action.revealEffect
      } as GameAction;
    case "COMBAT_RESOLVED":
    case "RESOLUTION_APPLIED":
      return {
        ...action,
        effect: normalizeLegacyEncounterEffect(action.effect)
      } as GameAction;
    case "TABLE_INTERACTION":
      return {
        ...action,
        effect: action.effect ? normalizeLegacyEncounterEffect(action.effect) : null,
        targetEffect: action.targetEffect
          ? normalizeLegacyEncounterEffect(action.targetEffect)
          : action.targetEffect
      } as GameAction;
    case "SPACE_TEXT_RESOLVED":
    case "SCENARIO_PROGRESS_ADVANCED":
    case "SCENARIO_CONFRONTATION_PROGRESS_GAINED":
      return {
        ...action,
        effect: action.effect
          ? normalizeLegacyEncounterEffect(action.effect)
          : action.effect
      } as GameAction;
    case "SHOP_SERVICE_RESOLVED":
      return {
        ...action,
        cost: normalizeCost(action.cost),
        result: normalizeResult(action.result)
      } as GameAction;
    case "SHOP_STOCK_REVEALED":
    case "SHOP_PURCHASE_RESOLVED":
      return {
        ...action,
        cost: normalizeCost(action.cost)
      } as GameAction;
    default:
      return action as GameAction;
  }
}

export function normalizeLegacyEventLog(events: unknown[]): unknown[] {
  return events.map((event) => {
    if (!event || typeof event !== "object" || !("type" in event)) return event;
    return normalizeLegacyGameAction(event as LegacyCompatibleGameAction);
  });
}
