import type { ReactElement } from "react";
import type { PhonePatchPayload } from "../shared/types.js";

export type PhoneTurnFlowStepId = "move" | "arrival" | "action" | "end";

export interface PhoneTurnFlowStep {
  id: PhoneTurnFlowStepId;
  label: string;
  detail: string;
  state: "complete" | "current" | "upcoming";
}

export interface PhoneTurnFlowPresentation {
  currentStep: PhoneTurnFlowStepId;
  contextLabel: string;
  commandTab: "move" | "battle" | "shop" | "action";
  commandLabel: string;
  steps: PhoneTurnFlowStep[];
}

function hasEnemyArrival(patch: PhonePatchPayload): boolean {
  // Hazards also carry the shared `battle` test data. The encounter's category
  // determines the command surface, not the presence of that math container.
  if (patch.pendingEnemyRoll) return true;
  if (patch.encounter) {
    return patch.encounter.cardType === "enemy" || patch.encounter.presentationType === "enemy"
      || patch.encounter.presentationType === "nemesis";
  }
  if (patch.activeResolution?.card) {
    return ["enemy", "nemesis"].includes(patch.activeResolution.card.type);
  }
  return Boolean(
    patch.activeResolution?.battle?.enemyName || patch.battlePresentation?.test.opposed
  );
}

function getArrivalContext(patch: PhonePatchPayload): { label: string; detail: string } {
  if (hasEnemyArrival(patch)) {
    return { label: "Battle", detail: "Enemy encounter" };
  }

  if (patch.encounter?.presentationType === "event" || patch.activeResolution?.card?.type === "event") {
    return { label: "Threat", detail: "Resolve the arrival effect" };
  }

  if (
    patch.pendingTileChallenge ||
    patch.pendingTileChallengePrivate ||
    patch.encounter?.cardType === "hazard" ||
    patch.encounter?.presentationType === "hazard" ||
    patch.activeResolution?.card?.type === "hazard" ||
    patch.activeResolution?.source === "anomaly"
  ) {
    return { label: "Challenge", detail: "Hazard or anomaly" };
  }

  return { label: "Threat", detail: "Resolve arrival rules" };
}

function getCurrentStep(patch: PhonePatchPayload): PhoneTurnFlowStepId {
  if (patch.status === "ended" || patch.phase === "broadcast") return "end";
  if (patch.activeResolution?.source === "movement") return "move";

  if (
    patch.pendingEnemyRoll ||
    patch.encounter ||
    patch.pendingTileChallenge ||
    patch.pendingTileChallengePrivate ||
    patch.cooperativeAssistance ||
    patch.pendingCooperativeTest ||
    patch.cooperativeAssistanceEligibility ||
    patch.activeResolution?.battle ||
    patch.activeResolution?.card
  ) {
    return "arrival";
  }

  if (
    patch.phase === "navigation" ||
    patch.movementPlanner?.active
  ) {
    return "move";
  }

  if (
    patch.phase === "sector" ||
    patch.activeResolution
  ) {
    return "arrival";
  }

  return "action";
}

export function buildPhoneTurnFlow(patch: PhonePatchPayload): PhoneTurnFlowPresentation {
  const currentStep = getCurrentStep(patch);
  const arrival = getArrivalContext(patch);
  const actionContext = patch.shopEncounter ? "Shop" : "Sector options";
  const endContext = patch.status === "ended" ? "Session complete" : "Experience and handoff";
  const orderedSteps: Array<Omit<PhoneTurnFlowStep, "state">> = [
    { id: "move", label: "Move", detail: "Roll and travel" },
    { id: "arrival", label: "Arrival", detail: arrival.label },
    { id: "action", label: "Action", detail: actionContext },
    { id: "end", label: "End", detail: patch.status === "ended" ? "Complete" : "Experience" }
  ];
  const currentIndex = orderedSteps.findIndex((step) => step.id === currentStep);
  const commandLabel =
    currentStep === "arrival"
      ? "Arrival"
      : currentStep === "end"
        ? "End Turn"
        : currentStep === "action" && patch.shopEncounter
          ? "Shop"
          : currentStep === "action"
            ? "Action"
            : "Move";
  const commandTab =
    currentStep === "move"
      ? "move"
      : currentStep === "arrival" && hasEnemyArrival(patch)
        ? "battle"
        : currentStep === "action" && patch.shopEncounter
          ? "shop"
          : "action";
  const contextLabel =
    currentStep === "arrival"
      ? arrival.label
      : currentStep === "action"
        ? actionContext
        : currentStep === "end"
          ? endContext
          : "Roll and choose a route";

  return {
    currentStep,
    contextLabel,
    commandTab,
    commandLabel,
    steps: orderedSteps.map((step, index) => ({
      ...step,
      state: index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming"
    }))
  };
}

export function PhoneTurnFlow({ patch }: { patch: PhonePatchPayload }): ReactElement {
  const presentation = buildPhoneTurnFlow(patch);
  const currentLabel = presentation.steps.find((step) => step.state === "current")?.label ?? "Turn";

  return (
    <section
      className="phone-turn-flow"
      aria-label={`Turn flow. Current step ${currentLabel}: ${presentation.contextLabel}`}
      aria-live="polite"
      data-current-step={presentation.currentStep}
    >
      <ol className="phone-turn-flow__steps">
        {presentation.steps.map((step, index) => (
          <li
            key={step.id}
            className={`phone-turn-flow__step is-${step.state}`}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            <span aria-hidden="true">{step.state === "complete" ? "\u2713" : index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
