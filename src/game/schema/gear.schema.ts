import { z } from "zod";

export const gearSlotSchema = z.enum(["weapon", "armor", "utility"]);
export const equipmentSubtypeSchema = z.enum(["weapon", "armour", "tool", "medical", "supply", "utility"]);
export const gearBonusStatSchema = z.enum(["command", "grit", "signal", "guile", "forge"]);
export const gearTierSchema = z.enum(["starter", "standard", "advanced", "artifact"]);
export const gearTimingWindowSchema = z.enum([
  "beforeThreatDraw",
  "beforeBattleRoll",
  "afterBattleRoll",
  "afterFailedTest",
  "beforeTakingDamage",
  "startOfTurn",
  "movement",
  "shop",
  "action",
  "anyTime"
]);
export const gearCategorySchema = z.enum([
  "passive",
  "active",
  "consumable",
  "chargedRelic",
  "dangerous",
  "contractObject",
  "followerLinked"
]);
export const shopCategorySchema = z.enum([
  "forge-armoury",
  "market",
  "medicae-shrine",
  "relic-dealer",
  "contract-broker"
]);
export const gearUseLimitSchema = z.enum(["oncePerTurn", "oncePerRound", "discard", "charge"]);
export const gearEffectModelSchema = z.enum(["permanent", "conditional", "consumable", "exhaust"]);
export const gearExhaustEffectSchema = z.enum(["mirrorReroll", "warbellCommand"]);
export const gearConditionTypeSchema = z.enum(["battle"]);
export const consumableEffectSchema = z.enum(["grantVeilHook", "ignoreFailedMovementOrHazard", "grantPaleCartelFixer", "healWound", "grantMarshalSeal"]);

export const gearItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slot: gearSlotSchema,
  subtype: equipmentSubtypeSchema.optional(),
  category: gearCategorySchema.optional(),
  shopCategories: z.array(shopCategorySchema).min(1).optional(),
  statBonus: z.object({
    stat: gearBonusStatSchema,
    amount: z.number().int().positive()
  }),
  cost: z.number().int().min(0).optional(),
  sellValue: z.number().int().min(0).optional(),
  sellable: z.boolean().optional(),
  tier: gearTierSchema.optional(),
  progressionWeight: z.number().min(0).optional(),
  flavor: z.string().min(1).optional(),
  timingWindows: z.array(gearTimingWindowSchema).optional(),
  exhausted: z.boolean().optional(),
  instanceId: z.string().min(1).optional(),
  activeText: z.string().min(1).optional(),
  useLimit: gearUseLimitSchema.optional(),
  charges: z.number().int().min(0).optional(),
  maxUses: z.number().int().min(0).optional(),
  heatCost: z.number().int().min(0).optional(),
  linkedFollowerRole: z.string().min(1).optional(),
  startingEligible: z.boolean().optional(),
  normalShopCommon: z.boolean().optional(),
  allowedFallbackArt: z.boolean().optional(),
  qaOnly: z.boolean().optional(),
  effectModel: gearEffectModelSchema.optional(),
  requiresEquipped: z.boolean().optional(),
  conditionType: gearConditionTypeSchema.optional()
  ,activationTiming: z.array(gearTimingWindowSchema).min(1).optional()
  ,consumeOnUse: z.boolean().optional()
  ,consumableEffect: consumableEffectSchema.optional()
  ,resetWindow: z.enum(["round"]).optional()
  ,exhaustEffect: gearExhaustEffectSchema.optional()
  ,activationCost: z.object({ type: z.enum(["salvage", "wound"]), amount: z.number().int().positive() }).optional()
}).superRefine((item, context) => {
  if (item.tier !== "artifact" && (item.useLimit === "charge" || item.category === "chargedRelic")) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "normal Equipment cannot use Artifact charge mechanics", path: ["useLimit"] });
  }
  if (!item.effectModel) return;
  if (item.effectModel !== "consumable" && item.effectModel !== "exhaust" && item.requiresEquipped !== true) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: `${item.effectModel} passive items must require equipped state`, path: ["requiresEquipped"] });
  }
  if (item.effectModel === "conditional" && !item.conditionType) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "conditional passive items must define a condition", path: ["conditionType"] });
  }
  if (item.effectModel === "permanent" && item.conditionType) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "permanent passive items cannot define a condition", path: ["conditionType"] });
  }
  if (item.effectModel === "consumable") {
    if (!item.activationTiming?.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "consumables require explicit activation timing", path: ["activationTiming"] });
    if (item.consumeOnUse !== true) context.addIssue({ code: z.ZodIssueCode.custom, message: "consumables must consume on use", path: ["consumeOnUse"] });
    if (!item.consumableEffect) context.addIssue({ code: z.ZodIssueCode.custom, message: "consumables require a typed effect", path: ["consumableEffect"] });
    if (item.requiresEquipped === true || item.conditionType || item.useLimit === "charge") context.addIssue({ code: z.ZodIssueCode.custom, message: "consumables cannot declare passive or charged behavior", path: ["effectModel"] });
  }
  if (item.effectModel === "exhaust") {
    if (!item.activationTiming?.length || item.resetWindow !== "round" || !item.exhaustEffect || !item.activationCost) context.addIssue({ code: z.ZodIssueCode.custom, message: "exhaust items require timing, round reset, typed effect and cost", path: ["effectModel"] });
    if (item.consumeOnUse || item.useLimit === "charge" || item.useLimit === "discard") context.addIssue({ code: z.ZodIssueCode.custom, message: "exhaust items cannot be charged or consumed", path: ["useLimit"] });
  }
});

export type GearSlot = z.infer<typeof gearSlotSchema>;
export type EquipmentSubtype = z.infer<typeof equipmentSubtypeSchema>;
export type GearCategory = z.infer<typeof gearCategorySchema>;
export type ShopCategory = z.infer<typeof shopCategorySchema>;
export type GearTier = z.infer<typeof gearTierSchema>;
export type GearTimingWindow = z.infer<typeof gearTimingWindowSchema>;
export type GearItem = z.infer<typeof gearItemSchema>;
export type GearEffectModel = z.infer<typeof gearEffectModelSchema>;
export type GearConditionType = z.infer<typeof gearConditionTypeSchema>;
