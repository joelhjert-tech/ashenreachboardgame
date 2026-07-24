// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useActiveRoomBackGuard, usePhoneBackDismissal } from "../useActiveRoomBackGuard.js";

function GuardHarness({
  active = true,
  onLeave,
  detailOpen = false
}: {
  active?: boolean;
  onLeave: () => Promise<void>;
  detailOpen?: boolean;
}) {
  const guard = useActiveRoomBackGuard({ active, roomKey: "ROOM1:seat-1", onLeave });
  usePhoneBackDismissal(detailOpen, () => true);
  return (
    <>
      <button type="button" onClick={guard.requestLeave}>Request leave</button>
      {guard.confirmationOpen ? (
        <div role="dialog">
          <button type="button" onClick={guard.stayInGame}>Stay in Game</button>
          <button type="button" onClick={() => void guard.confirmLeave()}>Leave Room</button>
        </div>
      ) : null}
    </>
  );
}

function NestedDismissalHarness({
  onParentDismiss,
  onChildDismiss
}: {
  onParentDismiss: () => void;
  onChildDismiss: () => void;
}) {
  usePhoneBackDismissal(true, () => {
    onParentDismiss();
    return true;
  });
  return <ChildDismissalHarness onDismiss={onChildDismiss} />;
}

function ChildDismissalHarness({ onDismiss }: { onDismiss: () => void }) {
  usePhoneBackDismissal(true, () => {
    onDismiss();
    return true;
  });
  return null;
}

describe("active room browser Back guard", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => cleanup());

  it("opens one confirmation on popstate and preserves the room after Stay", () => {
    const onLeave = vi.fn(async () => undefined);
    const initialLength = window.history.length;
    const view = render(<GuardHarness onLeave={onLeave} />);
    expect(window.history.length).toBe(initialLength + 1);

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(onLeave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /stay in game/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const lengthAfterHandledBack = window.history.length;
    view.rerender(<GuardHarness onLeave={onLeave} />);
    expect(window.history.length).toBe(lengthAfterHandledBack);
  });

  it("uses the canonical leave callback only after confirmation", async () => {
    const onLeave = vi.fn(async () => undefined);
    render(<GuardHarness onLeave={onLeave} />);
    fireEvent.click(screen.getByRole("button", { name: /request leave/i }));
    expect(onLeave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /leave room/i }));
    await waitFor(() => expect(onLeave).toHaveBeenCalledTimes(1));
  });

  it("lets an open in-app detail consume Back before the leave dialog", () => {
    render(<GuardHarness onLeave={vi.fn(async () => undefined)} detailOpen />);
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lets the deepest active detail consume Back without dismissing its parent state", () => {
    const onParentDismiss = vi.fn();
    const onChildDismiss = vi.fn();
    render(<NestedDismissalHarness onParentDismiss={onParentDismiss} onChildDismiss={onChildDismiss} />);

    act(() => window.dispatchEvent(new Event("ashenreach:phone-back-dismiss", { cancelable: true })));

    expect(onChildDismiss).toHaveBeenCalledTimes(1);
    expect(onParentDismiss).not.toHaveBeenCalled();
  });

  it("uses Back to close an open confirmation before offering it again", () => {
    render(<GuardHarness onLeave={vi.fn(async () => undefined)} />);
    fireEvent.click(screen.getByRole("button", { name: /request leave/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("exits browser fullscreen before offering to leave the active room", async () => {
    const fullscreenElement = document.documentElement;
    const exitFullscreen = vi.fn(async () => {
      Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
    });
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: fullscreenElement });
    Object.defineProperty(document, "exitFullscreen", { configurable: true, value: exitFullscreen });

    render(<GuardHarness onLeave={vi.fn(async () => undefined)} />);
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));

    await waitFor(() => expect(exitFullscreen).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not guard browser Back outside an active room", () => {
    const initialLength = window.history.length;
    render(<GuardHarness active={false} onLeave={vi.fn(async () => undefined)} />);
    expect(window.history.length).toBe(initialLength);
    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
