import { useEffect, useRef, useState } from "react";

const pendingFreshResultScopes = new Set<string>();

export function useAuthoritativeResultCollapse(resultKey: string | null, delayMs = 100, scopeKey?: string): {
  collapsed: boolean;
  expand: () => void;
  collapse: () => void;
} {
  const firstRender = useRef(true);
  const previousKey = useRef<string | null>(resultKey);
  const freshResultOnMount = useRef(Boolean(
    resultKey &&
    scopeKey &&
    pendingFreshResultScopes.delete(scopeKey)
  ));
  const [collapsed, setCollapsed] = useState(Boolean(resultKey) && !freshResultOnMount.current);

  useEffect(() => {
    if (!resultKey) {
      if (scopeKey) pendingFreshResultScopes.add(scopeKey);
      previousKey.current = null;
      firstRender.current = false;
      setCollapsed(false);
      return;
    }
    if (freshResultOnMount.current) {
      firstRender.current = false;
      previousKey.current = resultKey;
      const timer = window.setTimeout(() => {
        freshResultOnMount.current = false;
        setCollapsed(true);
      }, delayMs);
      return () => window.clearTimeout(timer);
    }
    if (firstRender.current) {
      firstRender.current = false;
      previousKey.current = resultKey;
      setCollapsed(true);
      return;
    }
    if (previousKey.current === resultKey) return;
    if (scopeKey) pendingFreshResultScopes.delete(scopeKey);
    previousKey.current = resultKey;
    setCollapsed(false);
    const timer = window.setTimeout(() => setCollapsed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, resultKey, scopeKey]);

  return {
    collapsed,
    expand: () => setCollapsed(false),
    collapse: () => setCollapsed(true)
  };
}
