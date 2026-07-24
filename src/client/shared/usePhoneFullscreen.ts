import { useCallback, useEffect, useState } from "react";

export interface PhoneFullscreenController {
  active: boolean;
  supported: boolean;
  errorMessage: string | null;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  toggle: () => Promise<void>;
}

export function usePhoneFullscreen(): PhoneFullscreenController {
  const supported = typeof document !== "undefined" && typeof document.documentElement.requestFullscreen === "function";
  const [active, setActive] = useState(() => typeof document !== "undefined" && document.fullscreenElement !== null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    const handleChange = () => setActive(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [supported]);

  const enter = useCallback(async () => {
    if (!supported || document.fullscreenElement) return;
    try {
      setErrorMessage(null);
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      setErrorMessage("Full screen was refused by the browser. The game remains open normally.");
    }
  }, [supported]);

  const exit = useCallback(async () => {
    if (!supported || !document.fullscreenElement) return;
    try {
      setErrorMessage(null);
      await document.exitFullscreen();
    } catch {
      setErrorMessage("Full screen could not be closed by the page. Use the browser Back control once to exit full screen.");
    }
  }, [supported]);

  const toggle = useCallback(async () => {
    if (document.fullscreenElement) await exit();
    else await enter();
  }, [enter, exit]);

  return { active, supported, errorMessage, enter, exit, toggle };
}
