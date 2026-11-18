// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PhonePatchPayload } from "../../shared/types.js";
import { buildPhoneTurnFlow, PhoneTurnFlow } from "../PhoneTurnFlow.js";

function patch(overrides: Partial<PhonePatchPayload> = {}): PhonePatchPayload {
  return {
    status: "active",
    phase: "action",
    pendingEnemyRoll: null,
    encounter: null,
    ...overrides
  } as PhonePatchPayload;
}

describe("PhoneTurnFlow", () => {
  it("presents navigation as the Move step", () => {
    const presentation = buildPhoneTurnFlow(patch({ phase: "navigation" }));

    expect(presentation.currentStep).toBe("move");
    expect(presentation.commandLabel).toBe("Move");
    expect(presentation.steps[0]?.state).toBe("current");
  });

  it("presents an enemy encounter as Arrival with Battle context", () => {
    const encounter = {
      id: "enemy-1",
      title: "Ash Hound",
      cardType: "enemy" as const,
      presentationType: "enemy" as const,
      flavor: "It hunts by heat.",
      difficulty: 4,
      stat: "forge" as const
    };
    const presentation = buildPhoneTurnFlow(patch({ phase: "resolution", encounter }));

    expect(presentation.currentStep).toBe("arrival");
    expect(presentation.contextLabel).toBe("Battle");
    expect(presentation.commandTab).toBe("battle");
    expect(presentation.commandLabel).toBe("Arrival");
  });

  it("presents a hazard as Arrival with Challenge context", () => {
    const encounter = {
      id: "hazard-1",
      title: "Cinder Vent",
      cardType: "hazard" as const,
      presentationType: "hazard" as const,
      flavor: "Pressure rises.",
      difficulty: 3,
      stat: "signal" as const
    };
    const presentation = buildPhoneTurnFlow(patch({ phase: "resolution", encounter }));

    expect(presentation.currentStep).toBe("arrival");
    expect(presentation.contextLabel).toBe("Challenge");
    expect(presentation.commandTab).toBe("action");
  });

  it("presents an event as an Arrival threat instead of an enemy battle", () => {
    const event = {
      id: "event-1",
      title: "Signal Eclipse",
      cardType: "hazard" as const,
      presentationType: "event" as const,
      flavor: "The relay light folds inward.",
      difficulty: 2,
      stat: "signal" as const
    };
    const presentation = buildPhoneTurnFlow(patch({ phase: "resolution", encounter: event }));

    expect(presentation.currentStep).toBe("arrival");
    expect(presentation.contextLabel).toBe("Threat");
    expect(presentation.commandTab).toBe("action");
  });

  it("keeps a hazard on Challenge even when its resolution carries shared battle math", () => {
    const resolution = { id: "hazard-roll", playerId: "seat-1", source: "threat" as const, stage: "battle_setup" as const,
      card: { id: "hazard-1", title: "Grave-Silt Press", type: "hazard" },
      battle: { stat: "command" as const, difficulty: 5, modifiers: [] } };
    expect(buildPhoneTurnFlow(patch({ activeResolution: resolution }))).toMatchObject({
      currentStep: "arrival", contextLabel: "Challenge", commandTab: "action"
    });
  });

  it("keeps the movement result current until acknowledged even with an arrival encounter queued", () => {
    expect(buildPhoneTurnFlow(patch({
      activeResolution: { id: "movement", playerId: "seat-1", source: "movement", stage: "roll_result" },
      encounter: { id: "enemy", title: "Waiting enemy", cardType: "enemy", flavor: "", difficulty: 5, stat: "grit" }
    }))).toMatchObject({ currentStep: "move", commandTab: "move" });
  });

  it("keeps Shop inside the Action step", () => {
    const presentation = buildPhoneTurnFlow(patch({ shopEncounter: {} as PhonePatchPayload["shopEncounter"] }));

    expect(presentation.currentStep).toBe("action");
    expect(presentation.contextLabel).toBe("Shop");
    expect(presentation.commandLabel).toBe("Shop");
  });

  it("presents broadcast as End Turn with Experience context", () => {
    const current = patch({ phase: "broadcast" });
    const presentation = buildPhoneTurnFlow(current);

    expect(presentation.currentStep).toBe("end");
    expect(presentation.contextLabel).toBe("Experience and handoff");
    expect(presentation.commandLabel).toBe("End Turn");

    render(<PhoneTurnFlow patch={current} />);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("End");
    expect(screen.getByRole("region", { name: /current step end: experience and handoff/i })).toBeVisible();
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Experience");
  });
});
