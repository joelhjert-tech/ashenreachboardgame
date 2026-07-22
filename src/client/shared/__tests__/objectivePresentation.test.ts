import { describe, expect, it } from "vitest";
import {
  buildOwnerContractPresentation,
  buildPrivateAgendaPresentation,
  buildSharedMissionPresentation,
  describeContractReward
} from "../objectivePresentation.js";
import type { ContractCard, PhonePatchPayload, PrivateRivalryPayload } from "../types.js";

const routeContract: ContractCard = {
  id: "test-route-contract",
  name: "The Quiet Circuit",
  factionGiver: "Glass Choir",
  text: "Carry the signal through three silent stations.",
  objective: {
    type: "multiStopRoute",
    ordered: true,
    targets: [
      { id: "first", type: "spaceId", value: "first-space", label: "Reach the First Relay" },
      { id: "second", type: "spaceId", value: "second-space", label: "Cross the Silent Span" },
      { id: "third", type: "spaceId", value: "third-space", label: "Seal the Last Relay" }
    ]
  },
  reward: { effects: [{ type: "gain_salvage", amount: 2 }] }
};

describe("objective presentation", () => {
  it("orders the current private Contract condition before remaining and completed history", () => {
    const presentation = buildOwnerContractPresentation(routeContract, {
      contractId: routeContract.id,
      progress: 1,
      completedTargetIds: ["first"]
    });

    expect(presentation.conditions.map((condition) => [condition.state, condition.label])).toEqual([
      ["current", "Cross the Silent Span"],
      ["remaining", "Seal the Last Relay"],
      ["completed", "Reach the First Relay"]
    ]);
    expect(presentation.reward).toBe("Gain 2 Salvage");
  });

  it("keeps a locked Agenda useful without requiring protected objective fields", () => {
    const presentation = buildPrivateAgendaPresentation({
      active: true,
      mode: "rivalry",
      secrecy: "private",
      revealState: "revealLocked",
      tableWarning: "Owner phone only.",
      recentPrivateNotes: [],
      reveal: {
        state: "revealLocked",
        available: false,
        label: "Locked",
        hint: "This Agenda reveals when its table condition is met.",
        lockedReason: "Reveal window has not opened."
      }
    } satisfies PrivateRivalryPayload);

    expect(presentation.objective).toBeNull();
    expect(presentation.stateLabel).toBe("Locked");
    expect(presentation.instruction).toContain("reveals when");
  });

  it("uses authoritative shared Mission progress and pressure without deriving from logs", () => {
    const patch = {
      activeScenario: {
        id: "scenario-test",
        name: "The Hollow Signal",
        theme: "A fractured relay calls through the dark.",
        progress: 1,
        threshold: 4,
        progressLabel: "Relays restored",
        victoryText: "Restore the relays.",
        finalGateRequirement: "Reach the Core.",
        progressSources: [],
        publicDisplay: { objective: "Restore every severed relay." }
      },
      scenarioPressure: {
        objectiveProgress: { current: 2, required: 4, label: "Relays restored" },
        collapseTrack: { current: 1, max: 6, label: "Signal collapse" },
        scenarioStatus: "active"
      }
    } as unknown as PhonePatchPayload;

    const presentation = buildSharedMissionPresentation(patch);
    expect(presentation?.progress).toMatchObject({ current: 2, required: 4, label: "Relays restored" });
    expect(presentation?.lossPressure).toMatchObject({ current: 1, required: 6, label: "Loss Pressure" });
  });

  it("uses the server-authored P14 warning, final stage, and change reasons", () => {
    const patch = {
      activeScenario: {
        id: "scenario-test",
        name: "The Hollow Signal",
        theme: "A fractured relay calls through the dark.",
        progress: 0,
        threshold: 4,
        progressLabel: "Relays restored",
        victoryText: "Restore the relays.",
        progressSources: []
      },
      matchProgress: {
        revision: 9,
        mode: "coop",
        stage: "final_stage",
        winProgress: { current: 3, required: 4, label: "Relays restored", changeId: "progress:9", change: 1, changeReason: "The third relay answered." },
        lossPressure: { current: 5, required: 6, label: "Loss Pressure", changeId: "pressure:9", change: 1, changeReason: "The chorus advanced." },
        thresholdWarning: { id: "critical:5:6", level: "critical", label: "Critical", detail: "Next Loss Pressure gain causes defeat.", remaining: 1, target: "loss" },
        finalStage: { id: "final:9", title: "Sever the Chorus", publicInstruction: "Reach the Cinder Gate.", locationName: "Cinder Gate", stageLabel: "Stage 1", progressLabel: "3 / 4" },
        publicResult: null,
        allowedCommands: []
      }
    } as unknown as PhonePatchPayload;

    const presentation = buildSharedMissionPresentation(patch);
    expect(presentation?.progress).toMatchObject({ current: 3, required: 4 });
    expect(presentation?.lossPressure).toMatchObject({ current: 5, required: 6 });
    expect(presentation?.thresholdWarning?.level).toBe("critical");
    expect(presentation?.finalStage?.title).toBe("Sever the Chorus");
    expect(presentation?.progressChange?.reason).toBe("The third relay answered.");
    expect(presentation?.pressureChange?.reason).toBe("The chorus advanced.");
  });

  it("normalizes legacy single-effect Contract rewards for presentation only", () => {
    expect(describeContractReward({ ...routeContract, reward: { type: "gain_trophy", amount: 1 } })).toBe("Gain 1 Trophy");
  });
});
