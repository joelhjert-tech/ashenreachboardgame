import { z } from "zod";

export const followerRoleSchema = z.enum([
  "scout",
  "medic",
  "gunner",
  "ritualist",
  "porter",
  "guide",
  "informant",
  "companion"
]);
export const followerUseLimitSchema = z.enum(["oncePerTurn", "oncePerRound", "discard"]);
export const followerLossConditionSchema = z.enum(["wound", "combatLoss", "choice"]);
export const legacyFollowerLossConditionSchema = z.enum(["wound", "heat", "combatLoss", "choice"]);
export const followerTierSchema = z.enum(["standard", "legendary", "ultimate"]);
export const followerEffectModelSchema = z.enum(["exhaust"]);
export const followerResetWindowSchema = z.enum(["round"]);
export const followerExhaustEffectSchema = z.enum(["recordEmberPupNote", "recordOmenNote", "recordRouteMemoryNote", "fandiablosSupport"]);
export const followerTimingWindowSchema = z.enum([
  "beforeThreatDraw",
  "beforeBattleRoll",
  "afterBattleRoll",
  "beforeTakingDamage",
  "startOfTurn",
  "movement",
  "shop",
  "anyTime"
]);

const followerFields = {
  id: z.string().min(1),
  instanceId: z.string().min(1).optional(),
  name: z.string().min(1),
  role: followerRoleSchema,
  text: z.string().min(1),
  tier: followerTierSchema.optional(),
  tags: z.array(z.string().min(1)).optional(),
  unique: z.boolean().optional(),
  artifactTier: z.boolean().optional(),
  ultimateCompanion: z.boolean().optional(),
  timingWindows: z.array(followerTimingWindowSchema).optional(),
  exhausted: z.boolean().optional(),
  effectModel: followerEffectModelSchema.optional(),
  activationTiming: z.array(followerTimingWindowSchema).min(1).optional(),
  resetWindow: followerResetWindowSchema.optional(),
  exhaustEffect: followerExhaustEffectSchema.optional(),
  requiresEquipped: z.boolean().optional(),
  artCardId: z.string().min(1).optional(),
  acquisition: z.array(z.string().min(1)).optional(),
  flavor: z.string().min(1).optional(),
  imagePrompt: z.string().min(1).optional(),
  passiveEffect: z.unknown().optional(),
  activeEffect: z.unknown().optional(),
  useLimit: followerUseLimitSchema.optional(),
  loyalty: z.number().int().min(0).max(5).optional(),
  lossCondition: followerLossConditionSchema.optional()
};

function validateFollowerLifecycle(
  follower: {
    effectModel?: "exhaust";
    activationTiming?: unknown[];
    resetWindow?: "round";
    exhaustEffect?: string;
    useLimit?: "oncePerTurn" | "oncePerRound" | "discard";
  },
  context: z.RefinementCtx
): void {
  if (follower.effectModel !== "exhaust") return;
  if (!follower.activationTiming?.length) context.addIssue({ code: z.ZodIssueCode.custom, message: "exhaust followers require activation timing", path: ["activationTiming"] });
  if (!follower.resetWindow) context.addIssue({ code: z.ZodIssueCode.custom, message: "exhaust followers require a reset window", path: ["resetWindow"] });
  if (!follower.exhaustEffect) context.addIssue({ code: z.ZodIssueCode.custom, message: "exhaust followers require a typed effect", path: ["exhaustEffect"] });
  if (follower.useLimit === "discard") context.addIssue({ code: z.ZodIssueCode.custom, message: "exhaust followers cannot be consumable", path: ["useLimit"] });
}

export const followerSchema = z.object(followerFields).strict().superRefine((follower, context) => {
  if (follower.tags?.some((tag) => tag.toLowerCase() === "heat")) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "current followers cannot use the retired Heat resource tag", path: ["tags"] });
  }
  validateFollowerLifecycle(follower, context);
});

export const legacyCompatibleFollowerSchema = z.object({
  ...followerFields,
  lossCondition: legacyFollowerLossConditionSchema.optional()
}).strict().superRefine(validateFollowerLifecycle);

export function normalizeLegacyFollowerMetadata(
  follower: z.infer<typeof legacyCompatibleFollowerSchema>
): z.infer<typeof followerSchema> {
  const {
    lossCondition: legacyLossCondition,
    tags: legacyTags,
    ...current
  } = follower;
  const normalized = {
    ...current,
    ...(legacyTags
      ? { tags: legacyTags.filter((tag) => tag.toLowerCase() !== "heat") }
      : {}),
    ...(legacyLossCondition && legacyLossCondition !== "heat"
      ? { lossCondition: legacyLossCondition }
      : {})
  };
  return followerSchema.parse(normalized);
}

export type FollowerRole = z.infer<typeof followerRoleSchema>;
export type FollowerTimingWindow = z.infer<typeof followerTimingWindowSchema>;
export type Follower = z.infer<typeof followerSchema>;
export type LegacyCompatibleFollower = z.infer<typeof legacyCompatibleFollowerSchema>;
