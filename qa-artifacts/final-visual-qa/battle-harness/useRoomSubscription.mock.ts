import { useEffect, useState } from "react";
import type { PublicPatchPayload, StatePatch } from "/src/client/shared/types.ts";

const patchKey = "__ASHEN_HARNESS_PATCH__";
const patchEvent = "ashen-harness-patch";

function getPatch(): StatePatch<PublicPatchPayload> | null {
  return (window as unknown as Record<string, StatePatch<PublicPatchPayload> | null>)[patchKey] ?? null;
}

export function setHarnessPatch(next: StatePatch<PublicPatchPayload>): void {
  (window as unknown as Record<string, StatePatch<PublicPatchPayload> | null>)[patchKey] = next;
  window.dispatchEvent(new Event(patchEvent));
}

export function useRoomSubscription() {
  const [current, setCurrent] = useState(getPatch);
  useEffect(() => {
    const listener = () => setCurrent(getPatch());
    window.addEventListener(patchEvent, listener);
    return () => window.removeEventListener(patchEvent, listener);
  }, []);
  return {
    patch: current,
    error: null,
    sendIntent: () => undefined,
    status: "open" as const,
    debugEvents: [],
    clearDebugEvents: () => undefined
  };
}
