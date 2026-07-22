import { useRef, type ReactElement, type ReactNode } from "react";
import type { RequiredActionProjection } from "../shared/types.js";
import { LiveStatus } from "../shared/LiveStatus.js";
import { presentationStatus } from "../shared/presentationSystem.js";
import { useFocusOnRevision } from "../shared/useFocusOnRevision.js";

export type RequiredActionStatus = "available" | "submitting" | "resolving" | "blocked";

interface PhoneRequiredActionShellProps {
  projection: RequiredActionProjection;
  status: RequiredActionStatus;
  statusLabel?: string;
  atRequiredTab: boolean;
  compact?: boolean;
  recoveryMessage?: string | null;
  onReturnToAction?: () => void;
  children?: ReactNode;
}

function stateLabel(projection: RequiredActionProjection, status: RequiredActionStatus): string {
  if (status === "submitting") return presentationStatus.submitting;
  if (status === "resolving") return presentationStatus.resolving;
  if (!projection.canAct || projection.waiting) return presentationStatus.waiting;
  if (status === "blocked") return presentationStatus.blocked;
  if (projection.transitionStage === "continue-available") return presentationStatus.resultReady;
  if (projection.transitionStage === "end-turn-available") return presentationStatus.turnReady;
  return presentationStatus.yourTurn;
}

export function PhoneRequiredActionShell({
  projection,
  status,
  statusLabel,
  atRequiredTab,
  compact = false,
  recoveryMessage = null,
  onReturnToAction,
  children
}: PhoneRequiredActionShellProps): ReactElement {
  const shellRef = useRef<HTMLElement | null>(null);
  const waiting = !projection.canAct || projection.waiting;
  const busy = status === "submitting" || status === "resolving";
  const canReturn = Boolean(projection.requiredTab && !atRequiredTab && onReturnToAction);
  const announcedStatus = statusLabel ?? stateLabel(projection, status);
  const stateOnlyHeader = atRequiredTab && !compact && !waiting;

  useFocusOnRevision(shellRef, projection.id, atRequiredTab && !waiting && !busy && status === "available");

  return (
    <section
      ref={shellRef}
      className={`phone-required-action-shell${compact ? " phone-required-action-shell--compact" : ""}${waiting ? " is-waiting" : ""}${busy ? " is-busy" : ""}`}
      data-testid="phone-required-action-shell"
      data-action-status={status}
      aria-busy={busy}
      data-transition-stage={projection.transitionStage ?? "required-action"}
    >
      <header className={`phone-required-action-shell__header${stateOnlyHeader ? " phone-required-action-shell__header--state-only" : ""}`}>
        <span className="phone-required-action-shell__state">{stateLabel(projection, status)}</span>
        {!stateOnlyHeader ? <strong>{waiting && projection.actorDisplayName ? `${projection.actorDisplayName} is acting` : projection.label}</strong> : null}
        {!stateOnlyHeader ? <p>{waiting ? (projection.waitingInstruction ?? projection.detail) : (projection.activeInstruction ?? projection.detail)}</p> : null}
        {busy && !waiting ? <span className="phone-required-action-shell__progress">{announcedStatus}</span> : null}
      </header>
      <LiveStatus
        message={waiting ? (projection.waitingInstruction ?? projection.detail) : busy ? announcedStatus : null}
        revision={`${projection.id}:${status}`}
      />

      {canReturn ? (
        <button type="button" className="phone-required-action-shell__return" onClick={onReturnToAction}>
          Return to {projection.requiredTab}
        </button>
      ) : null}


      {recoveryMessage ? (
        <p className="phone-required-action-shell__recovery" role="alert">
          {recoveryMessage}
        </p>
      ) : null}

      {!waiting && children ? (
        <fieldset className="phone-required-action-shell__content" disabled={busy}>
          <legend className="visually-hidden">Current required action controls</legend>
          {children}
        </fieldset>
      ) : null}
    </section>
  );
}
