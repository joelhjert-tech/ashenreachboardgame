import type { ResultDelta, PublicShopCost } from "../../../client/shared/types.js";
import type {
  GameAction,
  LegacyCompatibleGameAction
} from "../../engine/actions.js";
import type {
  AuthoredEncounterEffect,
  EncounterEffect,
  LegacyCompatibleEncounterEffect
} from "../card.schema.js";
import type { Follower } from "../follower.schema.js";
import type { GearItem } from "../gear.schema.js";

// These assignments are compile-time boundary guards. They are included by
// the repository typecheck and intentionally do not run as Vitest tests.

// @ts-expect-error authored effects cannot encode retired Heat mechanics
export const authoredHeatEffect: AuthoredEncounterEffect = { type: "gain_heat", amount: 1 };

// @ts-expect-error current runtime effects cannot encode retired Heat mechanics
export const runtimeHeatEffect: EncounterEffect = { type: "lose_heat", amount: 1 };

export const legacyHeatEffect: LegacyCompatibleEncounterEffect = {
  type: "gain_heat_all",
  amount: 1
};

export const currentThresholdAction: GameAction = {
  // @ts-expect-error current actions cannot create the retired threshold event
  type: "HEAT_THRESHOLD_REACHED",
  seatId: "seat-1",
  threshold: 6,
  newHeatTotal: 6,
  createdAt: "legacy-event"
};

export const legacyThresholdAction: LegacyCompatibleGameAction = {
  type: "HEAT_THRESHOLD_REACHED",
  seatId: "seat-1",
  threshold: 6,
  newHeatTotal: 6,
  createdAt: "legacy-event"
};

export const currentHeatCostGear: GearItem = {
  id: "legacy-gear",
  name: "Legacy Gear",
  slot: "utility",
  statBonus: { stat: "signal", amount: 1 },
  // @ts-expect-error current gear cannot author a Heat cost
  heatCost: 1
};

export const currentHeatFollower: Follower = {
  id: "legacy-follower",
  name: "Legacy Follower",
  role: "guide",
  text: "Legacy fixture.",
  // @ts-expect-error current follower metadata cannot use Heat as a loss condition
  lossCondition: "heat"
};

// @ts-expect-error current result deltas cannot represent Heat
export const currentHeatResultType: ResultDelta["type"] = "heat";

// @ts-expect-error current shop costs cannot represent Heat
export const currentHeatShopCost: PublicShopCost = { heat: 1 };
