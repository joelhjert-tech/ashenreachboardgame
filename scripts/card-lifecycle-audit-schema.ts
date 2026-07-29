import { z } from "zod";

export const cardLifecycleStatusSchema = z.enum([
  "complete",
  "partial",
  "unreachable",
  "compatibility-only",
  "development-only",
  "superseded",
  "unused"
]);

export const cardLifecycleAuditRecordSchema = z.object({
  family: z.enum([
    "Threat",
    "Anomaly",
    "Artifact",
    "Escalation",
    "Scar",
    "Affliction",
    "Contract",
    "Equipment",
    "Follower",
    "Tile Challenge",
    "Character",
    "Scenario"
  ]),
  scope: z.enum(["gameplay", "appendix"]),
  id: z.string().min(1),
  name: z.string().min(1),
  sourcePath: z.string().min(1),
  purpose: z.string().min(1),
  acquisitionOrTrigger: z.string().min(1),
  authoritativeResolver: z.string().min(1),
  outcome: z.string().min(1),
  repeatability: z.string().min(1),
  cleanup: z.string().min(1),
  visibility: z.string().min(1),
  reconnect: z.string().min(1),
  tests: z.array(z.string().min(1)).min(1),
  status: cardLifecycleStatusSchema,
  notes: z.string()
}).strict();

export const cardLifecycleAuditSchema = z.object({
  generatedAt: z.string().datetime(),
  recordCount: z.number().int().nonnegative(),
  gameplayRecordCount: z.number().int().nonnegative(),
  appendixRecordCount: z.number().int().nonnegative(),
  records: z.array(cardLifecycleAuditRecordSchema)
}).strict().superRefine((audit, context) => {
  if (audit.records.length !== audit.recordCount) {
    context.addIssue({
      code: "custom",
      path: ["records"],
      message: `Expected ${audit.recordCount} lifecycle records, received ${audit.records.length}`
    });
  }
  if (audit.gameplayRecordCount + audit.appendixRecordCount !== audit.recordCount) {
    context.addIssue({
      code: "custom",
      path: ["recordCount"],
      message: "Gameplay and appendix counts must equal the total lifecycle count"
    });
  }
});

export type CardLifecycleAuditRecord = z.infer<typeof cardLifecycleAuditRecordSchema>;
export type CardLifecycleAudit = z.infer<typeof cardLifecycleAuditSchema>;
