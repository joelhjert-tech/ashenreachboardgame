import { z } from "zod";

export const followerRoleSchema = z.enum(["scout", "medic", "gunner", "ritualist", "porter", "guide", "informant"]);
export const followerUseLimitSchema = z.enum(["oncePerTurn", "oncePerRound", "discard"]);
export const followerLossConditionSchema = z.enum(["wound", "heat", "combatLoss", "choice"]);

export const followerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: followerRoleSchema,
  text: z.string().min(1),
  passiveEffect: z.unknown().optional(),
  activeEffect: z.unknown().optional(),
  useLimit: followerUseLimitSchema.optional(),
  loyalty: z.number().int().min(0).max(5).optional(),
  lossCondition: followerLossConditionSchema.optional()
});

export type FollowerRole = z.infer<typeof followerRoleSchema>;
export type Follower = z.infer<typeof followerSchema>;
