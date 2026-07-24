import { useEffect, useMemo, useState, type ReactElement } from "react";
import type {
  PublicPatchPayload,
  PublicPlayer,
  PublicSeat,
  ResultDelta,
  StatePatch
} from "../shared/types.js";

export type HostMotionCueKind =
  | "turn"
  | "movement"
  | "arrival"
  | "encounter"
  | "battle"
  | "reward"
  | "penalty"
  | "waiting"
  | "shop"
  | "final";

export interface HostMotionCueModel {
  id: string;
  kind: HostMotionCueKind;
  eyebrow: string;
  title: string;
  detail: string;
  next: string;
  actor: string;
  location: string | null;
  progress: readonly [string, string, string, string];
  activeProgressIndex: number;
  delta: {
    label: string;
    value: string | null;
    reason: string | null;
    tone: "reward" | "penalty" | "neutral";
  } | null;
}

interface BuildHostMotionCueModelInput {
  patch: StatePatch<PublicPatchPayload> | null;
  activeSeat: PublicSeat | null;
  activePlayer: PublicPlayer | null;
  currentStepCopy: string;
  movementPresenting: boolean;
  synchronized: boolean;
}

function latestPublicDelta(deltas: ResultDelta[] | undefined): ResultDelta | null {
  return [...(deltas ?? [])].reverse().find((delta) => delta.visibility === "public") ?? null;
}

function deltaTone(delta: ResultDelta): "reward" | "penalty" | "neutral" {
  if (delta.severity === "reward" || delta.sign === "gain") return "reward";
  if (delta.severity === "loss" || delta.severity === "danger" || delta.sign === "loss") return "penalty";
  return "neutral";
}

function safeRequiredActionCopy(patch: PublicPatchPayload, fallback: string): string {
  const action = patch.requiredAction;
  if (!action) return fallback;
  if (action.privacy === "owner") {
    return action.hostInstruction ?? action.waitingInstruction ?? "Awaiting an operative decision.";
  }
  return action.hostInstruction ?? action.activeInstruction ?? action.detail ?? fallback;
}

export function buildHostMotionCueModel({
  patch,
  activeSeat,
  activePlayer,
  currentStepCopy,
  movementPresenting,
  synchronized
}: BuildHostMotionCueModelInput): HostMotionCueModel | null {
  if (!patch || patch.payload.status === "ended") return null;
  // The route HUD and movement journey already own the full-screen public
  // narrative while movement is focused. Rendering a second cue would repeat
  // the same authoritative state and compete with route progress.
  if (movementPresenting) return null;

  const payload = patch.payload;
  const actor = activeSeat?.displayName ?? activePlayer?.character.name ?? "Table";
  const location = activePlayer
    ? payload.sectors.find((sector) => sector.id === activePlayer.sectorId)?.name ?? null
    : null;
  const delta = latestPublicDelta(payload.publicResultDeltas);
  const deltaPresentation = delta
    ? {
        label: delta.publicText,
        value: delta.value === undefined ? null : String(delta.value),
        reason: delta.reason ?? delta.source ?? null,
        tone: deltaTone(delta)
      }
    : null;

  if (!synchronized) {
    return {
      id: `network:${patch.sessionId}`,
      kind: "waiting",
      eyebrow: "Command link",
      title: "Restoring authoritative state",
      detail: "The last safe board position remains visible.",
      next: "Play resumes when the current server revision arrives.",
      actor,
      location,
      progress: ["Last state", "Reconnect", "Synchronize", "Resume"],
      activeProgressIndex: 1,
      delta: null
    };
  }

  const handoff = payload.requiredAction?.handoff;
  if (handoff) {
    return {
      id: `handoff:${handoff.id}`,
      kind: "turn",
      eyebrow: handoff.roundWrapped ? "New round" : "Turn handoff",
      title: handoff.toDisplayName ?? "Table resolving",
      detail: `${handoff.fromDisplayName} completed their turn.`,
      next: payload.requiredAction?.hostInstruction ?? "The next required action is shown on the active phone.",
      actor: handoff.toDisplayName ?? actor,
      location,
      progress: ["Result", "Complete", "Handoff", "Next action"],
      activeProgressIndex: 2,
      delta: null
    };
  }

  const battle = payload.battlePresentation;
  if (battle) {
    const resultVisible = battle.outcome !== null || battle.stage === "result" || battle.stage === "complete";
    const consequence = battle.publicConsequence ?? battle.publicRewardSummary;
    return {
      id: `battle:${battle.id}:${battle.revision}:${battle.stage}`,
      kind: resultVisible ? battle.outcome === "success" ? "reward" : "penalty" : "battle",
      eyebrow: resultVisible ? "Combat result" : "Combat",
      title: battle.encounter.name,
      detail: resultVisible
        ? `${battle.actorDisplayName}: ${battle.outcome ?? "resolved"}${consequence ? ` — ${consequence}` : ""}`
        : battle.waiting?.privateDecision
          ? `Awaiting ${battle.waiting.actorDisplayName}'s private decision.`
          : battle.waiting?.publicAction ?? `${battle.actorDisplayName} is resolving ${battle.test.label}.`,
      next: safeRequiredActionCopy(payload, resultVisible ? "Hold the result until the server advances." : "Follow the battle on the active phone."),
      actor: battle.actorDisplayName,
      location,
      progress: ["Encounter", "Dice", "Calculation", "Result"],
      activeProgressIndex: resultVisible ? 3 : battle.stage === "rolling" || battle.stage === "resolving" ? 2 : 1,
      delta: resultVisible ? deltaPresentation : null
    };
  }

  const resolution = payload.activeResolution;
  if (resolution && !payload.tileArrival) {
    const resultVisible = resolution.stage === "outcome_summary" || resolution.stage === "awaiting_continue";
    const title = resolution.card?.title ?? payload.encounter?.title ?? "Encounter";
    return {
      id: `resolution:${resolution.id}:${resolution.stage}`,
      kind: resultVisible ? deltaPresentation?.tone === "reward" ? "reward" : "penalty" : "encounter",
      eyebrow: resultVisible ? "Resolution" : "Encounter revealed",
      title,
      detail: resultVisible
        ? resolution.outcome?.text ?? currentStepCopy
        : resolution.card?.flavor ?? "The active operative is resolving this encounter.",
      next: safeRequiredActionCopy(payload, resultVisible ? "Continue from the active phone." : "Resolve on the active phone."),
      actor,
      location,
      progress: ["Arrival", "Reveal", "Resolve", "Result"],
      activeProgressIndex: resultVisible ? 3 : resolution.stage === "dice_roll" || resolution.stage === "roll_result" ? 2 : 1,
      delta: resultVisible ? deltaPresentation : null
    };
  }

  if (payload.tileArrival && !payload.movementPlanner?.active) {
    const currentRule = payload.tileArrival.rules.find((rule) => rule.id === payload.tileArrival?.currentRuleId)
      ?? payload.tileArrival.rules.find((rule) => rule.status === "current")
      ?? null;
    return {
      id: `arrival:${payload.tileArrival.arrivalId}:${currentRule?.id ?? "settled"}`,
      kind: "arrival",
      eyebrow: "Arrival",
      title: payload.tileArrival.tileName,
      detail: currentRule
        ? `${currentRule.label} — ${currentRule.detail}`
        : payload.tileArrival.lore,
      next: payload.tileArrival.canEndTurn
        ? "Mandatory arrival effects are complete."
        : payload.tileArrival.blockedReason ?? "Resolve the current arrival rule.",
      actor,
      location: payload.tileArrival.tileName,
      progress: ["Movement", "Arrival", "Resolve", "Turn actions"],
      activeProgressIndex: payload.tileArrival.canEndTurn ? 3 : 2,
      delta: deltaPresentation
    };
  }

  const planner = payload.movementPlanner;
  if (planner?.active) {
    const destination = planner.selectedDestinationId
      ? planner.destinations.find((entry) => entry.sectorId === planner.selectedDestinationId) ?? null
      : null;
    return {
      id: `movement:${planner.rollResolutionId ?? planner.movementRevision ?? patch.sequence}:${destination?.sectorId ?? "choose"}:plan`,
      kind: "movement",
      eyebrow: "Movement",
      title: destination ? destination.name : `${actor} rolled ${planner.movementValue ?? "—"}`,
      detail: destination
        ? `${destination.distance} steps along the authoritative route.`
        : "Legal destinations are marked on the board.",
      next: "Choose a destination on the active phone.",
      actor,
      location: destination?.name ?? planner.currentSectorName ?? location,
      progress: ["Roll", "Choose", "Travel", "Arrive"],
      activeProgressIndex: destination ? 1 : 0,
      delta: null
    };
  }

  if (payload.shopEncounter) {
    return {
      id: `shop:${payload.shopEncounter.sectorId}:${payload.shopEncounter.presentation?.stage ?? payload.shopEncounter.status}`,
      kind: "shop",
      eyebrow: "Service",
      title: payload.shopEncounter.shopName,
      detail: payload.shopEncounter.status === "locked"
        ? "Trade is blocked until the public threat is cleared."
        : safeRequiredActionCopy(payload, "The active operative is using this service."),
      next: "Transactions remain private until a public result is created.",
      actor,
      location: payload.shopEncounter.sectorName,
      progress: ["Enter", "Browse", "Resolve", "Return"],
      activeProgressIndex: payload.shopEncounter.status === "locked" ? 0 : 1,
      delta: deltaPresentation
    };
  }

  const finalStage = payload.matchProgress?.finalStage;
  if (finalStage) {
    return {
      id: `final:${finalStage.id}`,
      kind: "final",
      eyebrow: "Final stage",
      title: finalStage.title,
      detail: finalStage.publicInstruction,
      next: safeRequiredActionCopy(payload, "Resolve the final objective."),
      actor,
      location: finalStage.locationName,
      progress: ["Pressure", "Threshold", "Final stage", "Outcome"],
      activeProgressIndex: 2,
      delta: deltaPresentation
    };
  }

  const required = payload.requiredAction;
  const waiting = required?.waiting === true || required?.privacy === "owner";
  return {
    id: `turn:${required?.id ?? `${activeSeat?.seatId ?? "table"}:${patch.phase}`}`,
    kind: waiting ? "waiting" : "turn",
    eyebrow: waiting ? "Operative decision" : "Active operative",
    title: required?.actorDisplayName ?? actor,
    detail: safeRequiredActionCopy(payload, currentStepCopy),
    next: waiting ? "The TV will update when the server receives the decision." : required?.label ?? currentStepCopy,
    actor,
    location,
    progress: ["Turn start", "Required action", "Result", "Handoff"],
    activeProgressIndex: required?.transitionStage === "result-visible" || required?.transitionStage === "continue-available" ? 2 : 1,
    delta: deltaPresentation
  };
}

function hasBeenPresented(id: string): boolean {
  if (typeof window === "undefined") return true;
  return window.sessionStorage.getItem(`ashenreach:host-motion:${id}`) === "settled";
}

export function HostMotionCue(props: BuildHostMotionCueModelInput): ReactElement | null {
  const model = useMemo(
    () => buildHostMotionCueModel(props),
    [
      props.activePlayer,
      props.activeSeat,
      props.currentStepCopy,
      props.movementPresenting,
      props.patch,
      props.synchronized
    ]
  );
  const [enteringId, setEnteringId] = useState<string | null>(() => model && !hasBeenPresented(model.id) ? model.id : null);

  useEffect(() => {
    if (!model || hasBeenPresented(model.id)) {
      setEnteringId(null);
      return;
    }
    window.sessionStorage.setItem(`ashenreach:host-motion:${model.id}`, "settled");
    setEnteringId(model.id);
  }, [model?.id]);

  if (!model) return null;
  const entering = enteringId === model.id;

  return (
    <section
      className={`host-motion-cue host-motion-cue--${model.kind}${entering ? " host-motion-cue--entering" : " host-motion-cue--settled"}`}
      data-testid="host-motion-cue"
      data-motion-id={model.id}
      aria-label="Current table presentation"
      role={entering ? "status" : "region"}
      aria-live={entering ? "polite" : "off"}
    >
      <div className="host-motion-cue__signal" aria-hidden="true"><i /><i /><i /></div>
      <header className="host-motion-cue__identity">
        <span>{model.eyebrow}</span>
        <strong>{model.title}</strong>
        <small>{model.actor}{model.location ? ` · ${model.location}` : ""}</small>
      </header>
      <div className="host-motion-cue__copy">
        <p>{model.detail}</p>
        <b>{model.next}</b>
      </div>
      {model.delta ? (
        <div className={`host-motion-cue__delta host-motion-cue__delta--${model.delta.tone}`}>
          <span>{model.delta.tone === "reward" ? "Reward" : model.delta.tone === "penalty" ? "Consequence" : "Change"}</span>
          <strong>{model.delta.label}</strong>
          {model.delta.value ? <b>{model.delta.value}</b> : null}
          {model.delta.reason ? <small>{model.delta.reason}</small> : null}
        </div>
      ) : null}
      <ol className="host-motion-cue__progress" aria-label="Presentation sequence">
        {model.progress.map((label, index) => (
          <li key={label} className={index === model.activeProgressIndex ? "is-current" : index < model.activeProgressIndex ? "is-complete" : ""}>
            <i aria-hidden="true" />
            <span>{label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
