import { describe, expect, it } from "vitest";
import type { BattlePresentation, PublicPatchPayload, PublicTileChallenge } from "../../shared/types.js";
import { buildSignalSectorResolutionModel } from "../signalSectorResolutionPresentation.js";

const challenge: PublicTileChallenge = {
  id: "ward-lock",
  name: "Ward Lock",
  challengeType: "hazard",
  sectorId: "scorched-road",
  testStat: "forge",
  difficulty: 8,
  trigger: "onArrival",
  authoredOrder: 0,
  recurring: true,
  tags: ["machine"],
  lore: "The rusted lock measures every tool against a vanished maker.",
  artCardId: "ward-lock",
  successSummary: "The seal opens.",
  failureSummary: "The mechanism answers with a wound."
};

function presentation(overrides: Partial<BattlePresentation> = {}): BattlePresentation {
  return {
    id: "resolution-1",
    revision: 4,
    stage: "result",
    actorSeatId: "seat-1",
    actorDisplayName: "Nera",
    encounter: {
      name: "Latchspire Raider",
      category: "Battle",
      imageKey: "latchspire-raider",
      publicSummary: "A raider bars the crossing."
    },
    test: { stat: "grit", label: "Grit", opposed: true },
    operative: {
      name: "Bjornis",
      baseValue: 4,
      modifiers: [{ label: "Relic blade", value: 1, kind: "equipment" }],
      rawDice: [5],
      diceTotal: 5,
      finalTotal: 10
    },
    opponent: {
      name: "Latchspire Raider",
      imageKey: "latchspire-raider",
      baseValue: 3,
      modifiers: [{ label: "Sector pressure", value: 1, kind: "scenario" }],
      rawDice: [4],
      diceTotal: 4,
      finalTotal: 8
    },
    outcome: "success",
    publicConsequence: "The raider is driven from the sector.",
    publicRewardSummary: "Gain 1 trophy.",
    waiting: null,
    restored: false,
    ...overrides
  };
}

function payload(overrides: Partial<PublicPatchPayload> = {}): PublicPatchPayload {
  return {
    seats: [{
      seatId: "seat-1",
      displayName: "Nera",
      connected: true,
      ready: true,
      kicked: false
    }],
    players: [{
      seatId: "seat-1",
      sectorId: "scorched-road",
      character: { id: "char_bjornis", name: "Bjornis" }
    }],
    sectors: [{
      id: "scorched-road",
      name: "Scorched Road",
      regionTier: "outer",
      neighbors: [],
      danger: 1,
      tileChallenges: [challenge],
      encounterDecks: { threat: [], anomaly: [], contract: [], artifact: [], escalation: [] }
    }],
    battlePresentation: presentation(),
    pendingTileChallenge: null,
    activeResolution: null,
    ...overrides
  } as unknown as PublicPatchPayload;
}

describe("buildSignalSectorResolutionModel", () => {
  it("preserves server-authored opposed battle arithmetic", () => {
    const model = buildSignalSectorResolutionModel(payload());

    expect(model).toMatchObject({
      mode: "battle",
      actorSeatId: "seat-1",
      stat: "grit",
      outcomeLabel: "SUCCESS",
      operativeImageKey: "char_bjornis",
      oppositionImageKey: "latchspire-raider",
      oppositionArtKind: "threat",
      oppositionFixed: false
    });
    expect(model?.operative).toMatchObject({
      baseValue: 4,
      rawDice: [5],
      diceTotal: 5,
      finalTotal: 10
    });
    expect(model?.opposition).toMatchObject({
      baseValue: 3,
      rawDice: [4],
      diceTotal: 4,
      finalTotal: 8
    });
  });

  it("makes the sector the opposition for a recurring tile challenge", () => {
    const fixedPresentation = presentation({
      encounter: { name: "Ward Lock", category: "Hazard", imageKey: "ward-lock" },
      test: { stat: "forge", label: "Forge", opposed: false },
      opponent: {
        name: "Ward Lock",
        baseValue: 8,
        modifiers: [],
        rawDice: [],
        diceTotal: 0,
        finalTotal: 8
      },
      publicRewardSummary: null,
      publicConsequence: "The seal opens."
    });
    const model = buildSignalSectorResolutionModel(payload({
      battlePresentation: fixedPresentation,
      pendingTileChallenge: {
        challengeId: "ward-lock",
        sectorId: "scorched-road",
        seatId: "seat-1",
        challengeType: "hazard",
        testStat: "forge",
        difficulty: 8,
        authoredOrder: 0,
        totalChallenges: 1,
        rolled: true
      }
    }));

    expect(model).toMatchObject({
      mode: "tile-challenge",
      title: "Ward Lock",
      publicSummary: challenge.lore,
      operativeImageKey: "char_bjornis",
      oppositionImageKey: "ward-lock",
      oppositionArtKind: "threat",
      oppositionFixed: true,
      outcomeCopy: "The seal opens."
    });
    expect(model?.opposition.finalTotal).toBe(8);
  });

  it("uses public waiting copy and never reads the private required-action detail", () => {
    const model = buildSignalSectorResolutionModel(payload({
      battlePresentation: presentation({
        stage: "choice_required",
        outcome: null,
        publicConsequence: null,
        publicRewardSummary: null,
        waiting: {
          actorDisplayName: "Nera",
          publicAction: "a reaction",
          privateDecision: true
        }
      }),
      requiredAction: {
        detail: "Secret Alpha or Secret Beta"
      } as PublicPatchPayload["requiredAction"]
    }));

    expect(model?.waitingCopy).toBe("Awaiting Nera's private decision.");
    expect(JSON.stringify(model)).not.toContain("Secret Alpha");
    expect(JSON.stringify(model)).not.toContain("Secret Beta");
  });

  it("returns no presentation when no authoritative resolution is active", () => {
    expect(buildSignalSectorResolutionModel(payload({
      battlePresentation: null,
      pendingTileChallenge: null
    }))).toBeNull();
  });
});
