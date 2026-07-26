// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRoomSubscription } from "../useRoomSubscription.js";

type Subscription = ReturnType<typeof useRoomSubscription>;

class TestWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: TestWebSocket[] = [];

  readonly url: string;
  readyState = TestWebSocket.CONNECTING;
  readonly sent: string[] = [];
  private listeners = new Map<string, Array<(event: Event & Record<string, unknown>) => void>>();

  constructor(url: string | URL) {
    this.url = String(url);
    TestWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean): void {
    const callback = typeof listener === "function"
      ? listener as (event: Event & Record<string, unknown>) => void
      : (event: Event & Record<string, unknown>) => listener.handleEvent(event);
    const wrapped = typeof options === "object" && options.once
      ? (event: Event & Record<string, unknown>) => {
          this.removeEventListener(type, wrapped as EventListener);
          callback(event);
        }
      : callback;
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), wrapped]);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback = typeof listener === "function" ? listener : listener.handleEvent.bind(listener);
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== callback));
  }

  send(value: string): void {
    this.sent.push(value);
  }

  close(code = 1000, reason = ""): void {
    this.readyState = TestWebSocket.CLOSED;
    this.emit("close", { code, reason, wasClean: true });
  }

  open(): void {
    this.readyState = TestWebSocket.OPEN;
    this.emit("open", {});
  }

  private emit(type: string, detail: Record<string, unknown>): void {
    const event = Object.assign(new Event(type), detail);
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
  }
}

let latestSubscription: Subscription | null = null;

function Harness(): ReactElement {
  latestSubscription = useRoomSubscription({ view: "tv", enabled: true });
  return <span>{latestSubscription.status}</span>;
}

describe("useRoomSubscription submission recovery", () => {
  beforeEach(() => {
    latestSubscription = null;
    TestWebSocket.instances = [];
    vi.stubGlobal("WebSocket", TestWebSocket);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("reports a dropped send, never retries it, and reconnects only when explicitly requested", () => {
    render(<Harness />);
    const first = TestWebSocket.instances[0]!;
    const intent = { type: "MOVEMENT_ROLL_REQUESTED", seatId: "seat-1" } as const;

    expect(latestSubscription?.sendIntent(intent)).toBe(false);
    expect(first.sent).toHaveLength(0);

    act(() => first.open());
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(latestSubscription?.sendIntent(intent)).toBe(true);
    expect(first.sent).toEqual([JSON.stringify(intent)]);

    act(() => latestSubscription?.resynchronize?.());
    expect(TestWebSocket.instances).toHaveLength(2);
    expect(first.readyState).toBe(TestWebSocket.CLOSED);
    expect(first.sent).toHaveLength(1);
  });
});
