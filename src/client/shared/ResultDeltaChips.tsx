import type { ReactElement } from "react";
import { formatResultDelta } from "./resultDeltas.js";
import type { ResultDelta } from "./types.js";

export function ResultDeltaChip({
  delta,
  publicOnly = false
}: {
  delta: ResultDelta;
  publicOnly?: boolean;
}): ReactElement {
  const presentation = formatResultDelta(delta, { publicOnly });

  return (
    <span
      className={`result-delta-chip result-delta-${presentation.tone} result-delta-sign-${presentation.sign}${presentation.private ? " result-delta-private" : ""}`}
      title={presentation.detail}
      data-testid={`result-delta-${delta.type}`}
    >
      {presentation.private ? <i>Private</i> : null}
      {presentation.label}
    </span>
  );
}

export function ResultDeltaRow({
  deltas,
  publicOnly = false,
  className = "",
  emptyText = null
}: {
  deltas: ResultDelta[] | null | undefined;
  publicOnly?: boolean;
  className?: string;
  emptyText?: string | null;
}): ReactElement | null {
  const visibleDeltas = (deltas ?? [])
    .filter((delta) => delta.type !== "heat")
    .filter((delta) => !publicOnly || delta.visibility === "public")
    .slice(0, 8);

  if (visibleDeltas.length === 0) {
    return emptyText ? <p className={`result-delta-empty ${className}`.trim()}>{emptyText}</p> : null;
  }

  return (
    <div className={`result-delta-row ${className}`.trim()} aria-label="Result changes" data-testid="result-delta-row">
      {visibleDeltas.map((delta) => (
        <ResultDeltaChip key={delta.id} delta={delta} publicOnly={publicOnly} />
      ))}
    </div>
  );
}
