import { useEffect, useState } from "react";

const query = "(prefers-reduced-motion: reduce)";

function readPreference(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return reduced;
}
