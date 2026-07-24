import { useCallback, useEffect, useRef, useState } from "react";

export const phoneBackDismissEvent = "ashenreach:phone-back-dismiss";
const guardKey = "ashenreachActiveRoomGuard";

interface GuardHistoryState extends Record<string, unknown> {
  [guardKey]?: string;
}

export interface ActiveRoomBackGuard {
  confirmationOpen: boolean;
  leaveSubmitting: boolean;
  leaveError: string | null;
  requestLeave: () => void;
  stayInGame: () => void;
  confirmLeave: () => Promise<void>;
}

function stateWithGuard(roomKey: string): GuardHistoryState {
  const current = history.state && typeof history.state === "object" ? history.state as Record<string, unknown> : {};
  return { ...current, [guardKey]: roomKey };
}

export function usePhoneBackDismissal(active: boolean, dismiss: () => boolean | void): void {
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const handleDismiss = (event: Event) => {
      if (event.defaultPrevented) return;
      if (dismissRef.current() !== false) event.preventDefault();
    };
    window.addEventListener(phoneBackDismissEvent, handleDismiss);
    return () => window.removeEventListener(phoneBackDismissEvent, handleDismiss);
  }, [active]);
}

export function useActiveRoomBackGuard({
  active,
  roomKey,
  onLeave
}: {
  active: boolean;
  roomKey: string | null;
  onLeave: () => Promise<void>;
}): ActiveRoomBackGuard {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const activeRef = useRef(active);
  const roomKeyRef = useRef(roomKey);
  const bypassRef = useRef(false);
  const leaveSubmittingRef = useRef(false);
  const confirmationOpenRef = useRef(false);
  const focusReturnRef = useRef<HTMLElement | null>(null);
  activeRef.current = active;
  roomKeyRef.current = roomKey;
  confirmationOpenRef.current = confirmationOpen;

  const requestLeave = useCallback(() => {
    if (!roomKeyRef.current) return;
    focusReturnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLeaveError(null);
    setConfirmationOpen(true);
  }, []);

  const stayInGame = useCallback(() => {
    setLeaveError(null);
    setConfirmationOpen(false);
    window.requestAnimationFrame(() => focusReturnRef.current?.focus());
  }, []);

  const confirmLeave = useCallback(async () => {
    if (!roomKeyRef.current || leaveSubmittingRef.current) return;
    leaveSubmittingRef.current = true;
    setLeaveSubmitting(true);
    setLeaveError(null);
    try {
      await onLeave();
      bypassRef.current = true;
      setConfirmationOpen(false);
      if (history.state?.[guardKey] === roomKeyRef.current) history.back();
    } catch (error) {
      setLeaveError(error instanceof Error ? error.message : "Could not leave the room.");
    } finally {
      leaveSubmittingRef.current = false;
      setLeaveSubmitting(false);
    }
  }, [onLeave]);

  useEffect(() => {
    if (active || !roomKey || typeof window === "undefined") return;
    if (history.state?.[guardKey] !== roomKey) return;
    bypassRef.current = true;
    history.back();
  }, [active, roomKey]);

  useEffect(() => {
    if (!active || !roomKey || typeof window === "undefined") {
      setConfirmationOpen(false);
      return;
    }

    bypassRef.current = false;
    if (history.state?.[guardKey] !== roomKey) {
      history.pushState(stateWithGuard(roomKey), "", location.href);
    }

    const handlePopState = () => {
      if (bypassRef.current) {
        bypassRef.current = false;
        return;
      }
      if (!activeRef.current || !roomKeyRef.current) return;

      history.pushState(stateWithGuard(roomKeyRef.current), "", location.href);
      if (confirmationOpenRef.current) {
        stayInGame();
        return;
      }
      const detailDismiss = new Event(phoneBackDismissEvent, { cancelable: true });
      window.dispatchEvent(detailDismiss);
      if (detailDismiss.defaultPrevented) return;
      if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
        void document.exitFullscreen().catch(() => requestLeave());
        return;
      }
      requestLeave();
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!activeRef.current || bypassRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [active, requestLeave, roomKey, stayInGame]);

  return { confirmationOpen, leaveSubmitting, leaveError, requestLeave, stayInGame, confirmLeave };
}
