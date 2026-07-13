import type { ResultDelta, ResultDeltaSeverity } from "./types.js";

export interface ResultDeltaPresentation {
  label: string;
  detail: string;
  tone: ResultDeltaSeverity;
  sign: ResultDelta["sign"];
  private: boolean;
}

function valuePrefix(delta: ResultDelta): string {
  if (typeof delta.value === "number") {
    if (delta.sign === "gain") {
      return `+${delta.value}`;
    }

    if (delta.sign === "loss") {
      return `-${delta.value}`;
    }

    return `${delta.value}`;
  }

  return typeof delta.value === "string" && delta.value.length > 0 ? delta.value : "";
}

export function formatResultDelta(delta: ResultDelta, options: { publicOnly?: boolean } = {}): ResultDeltaPresentation {
  const value = valuePrefix(delta);
  const label = value
    ? typeof delta.value === "number"
      ? `${value} ${delta.label}`
      : `${delta.label}: ${value}`
    : delta.label;

  return {
    label,
    detail: options.publicOnly || delta.visibility === "public"
      ? delta.publicText
      : delta.privateText ?? delta.publicText,
    tone: delta.severity,
    sign: delta.sign,
    private: delta.visibility === "ownerPrivate"
  };
}

export function publicResultDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  return (deltas ?? []).filter((delta) => delta.type !== "heat" && delta.visibility === "public");
}

export function ownerVisibleResultDeltas(deltas: ResultDelta[] | null | undefined): ResultDelta[] {
  return (deltas ?? []).filter((delta) => delta.type !== "heat" && delta.visibility !== "hidden");
}
