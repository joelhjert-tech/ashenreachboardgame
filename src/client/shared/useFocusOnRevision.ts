import { useEffect, useRef, type RefObject } from "react";

export function useFocusOnRevision<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  revision: string | number | null | undefined,
  enabled: boolean,
  selector: string | null = "button:not([disabled])"
): void {
  const focusedRevision = useRef<string | number | null | undefined>(undefined);

  useEffect(() => {
    if (!enabled || revision === null || revision === undefined || focusedRevision.current === revision) return;
    if (selector === null) {
      const target = containerRef.current;
      if (target && !target.hidden && target.getAttribute("aria-hidden") !== "true") {
        target.focus({ preventScroll: true });
        focusedRevision.current = revision;
      }
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const target = containerRef.current?.querySelector<HTMLElement>(selector);
      if (target && !target.hidden && target.getAttribute("aria-hidden") !== "true") {
        target.focus({ preventScroll: true });
        focusedRevision.current = revision;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [containerRef, enabled, revision, selector]);
}
