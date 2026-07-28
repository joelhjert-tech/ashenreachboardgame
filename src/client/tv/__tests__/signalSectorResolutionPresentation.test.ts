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
      locationName: "Scorched Road",
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
      eyebrow: "Recurring hazard challenge",
      publicSummary: challenge.lore,
      operativeImageKey: "char_bjornis",
      oppositionImageKey: "ward-lock",
      oppositionArtKind: "threat",
      oppositionFixed: true,
      outcomeCopy: "The seal opens.",
      sequence: ["Hazard", "Test", "Totals", "Result"],
      opposition: {
        name: "Ward Lock",
        secondaryName: "Hazard",
        finalTotal: 8
      }
    });
    expect(model?.opposition.finalTotal).toBe(8);
  });

  it("promotes a live Hazard card test into the Trial Theatre category treatment", () => {
    const hazardPresentation = presentation({
      encounter: {
        name: "Mirror-Rot Interference",
        category: "Hazard",
        imageKey: "mirror-rot-interference",
        publicSummary: "Your reflection acts one second late."
      },
      test: { stat: "guile", label: "Guile", opposed: false },
      opponent: {
        name: "Mirror-Rot Interference",
        secondaryName: "Difficulty",
        imageKey: "mirror-rot-interference",
        baseValue: 11,
        modifiers: [],
        rawDice: [],
        diceTotal: null,
        finalTotal: 11
      },
      publicRewardSummary: null,
      publicConsequence: "The delayed reflection locks back into step."
    });
    const model = buildSignalSectorResolutionModel(payload({
      battlePresentation: hazardPresentation,
      pendingTileChallenge: null,
      activeResolution: {
        origin: { sourceDeck: "threat" }
      } as PublicPatchPayload["activeResolution"]
    }));

    expect(model).toMatchObject({
      mode: "sector-test",
      title: "Mirror-Rot Interference",
      eyebrow: "Hazard trial",
      stat: "guile",
      oppositionImageKey: "mirror-rot-interference",
      oppositionFixed: true,
      sequence: ["Hazard", "Test", "Totals", "Result"],
      opposition: {
        name: "Mirror-Rot Interference",
        secondaryName: "Hazard",
        finalTotal: 11
      }
    });
  });

  it("labels Anomaly challenges without presenting them as enemies", () => {
    const anomalyPresentation = presentation({
      encounter: {
        name: "Rift Whispers",
        category: "Anomaly",
        imageKey: "rift-whispers"
      },
      test: { stat: "signal", label: "Signal", opposed: false },
      opponent: {
        name: "Rift Whispers",
        secondaryName: "Difficulty",
        imageKey: "rift-whispers",
        baseValue: 8,
        modifiers: [],
        rawDice: [],
        diceTotal: null,
        finalTotal: 8
      }
    });
    const model = buildSignalSectorResolutionModel(payload({
      sectors: [{
        ...payload().sectors[0]!,
        tileChallenges: [{
          ...challenge,
          id: "rift-whispers",
          name: "Rift Whispers",
          challengeType: "anomaly",
          artCardId: "rift-whispers"
        }]
      }],
      battlePresentation: anomalyPresentation,
      pendingTileChallenge: {
        challengeId: "rift-whispers",
        sectorId: "scorched-road",
        seatId: "seat-1",
        challengeType: "anomaly",
        testStat: "signal",
        difficulty: 8,
        authoredOrder: 0,
        totalChallenges: 1,
        rolled: true
      }
    }));

    expect(model).toMatchObject({
      mode: "tile-challenge",
      eyebrow: "Recurring anomaly challenge",
      sequence: ["Anomaly", "Test", "Totals", "Result"],
      opposition: {
        secondaryName: "Anomaly"
      }
    });
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
    expect(model?.locationName).toBe("Scorched Road");
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
