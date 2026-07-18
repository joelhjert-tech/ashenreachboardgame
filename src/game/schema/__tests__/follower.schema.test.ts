import { describe, expect, it } from "vitest";
import { followerSchema } from "../follower.schema.js";

const base = { id: "test-follower", name: "Test Follower", role: "scout", text: "Test support." } as const;

describe("follower exhaust model schema", () => {
  it("accepts a complete round-exhaust model", () => {
    expect(followerSchema.safeParse({
      ...base, effectModel: "exhaust", activationTiming: ["movement"], resetWindow: "round",
      exhaustEffect: "recordRouteMemoryNote", requiresEquipped: false, useLimit: "oncePerRound"
    }).success).toBe(true);
  });

  it("rejects missing timing, reset, effect, and consumable behavior", () => {
    expect(followerSchema.safeParse({ ...base, effectModel: "exhaust", resetWindow: "round", exhaustEffect: "recordOmenNote" }).success).toBe(false);
    expect(followerSchema.safeParse({ ...base, effectModel: "exhaust", activationTiming: ["movement"], exhaustEffect: "recordOmenNote" }).success).toBe(false);
    expect(followerSchema.safeParse({ ...base, effectModel: "exhaust", activationTiming: ["movement"], resetWindow: "round" }).success).toBe(false);
    expect(followerSchema.safeParse({ ...base, effectModel: "exhaust", activationTiming: ["movement"], resetWindow: "round", exhaustEffect: "recordOmenNote", useLimit: "discard" }).success).toBe(false);
  });
});
