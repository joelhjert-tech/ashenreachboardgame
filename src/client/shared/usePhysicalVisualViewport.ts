import { useSyncExternalStore } from "react";

export interface PhysicalVisualViewportSnapshot {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
  keyboardConstrained: boolean;
  revision: number;
}
const listeners = new Set<() => void>();
let listening = false;
let frame: number | null = null;
let revision = 0;

function readSnapshot(): PhysicalVisualViewportSnapshot {
  if (typeof window === "undefined") {
    return { width: 384, height: 722, offsetTop: 0, offsetLeft: 0, keyboardConstrained: false, revision: 0 };
  }

  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const offsetTop = viewport?.offsetTop ?? 0;
  const offsetLeft = viewport?.offsetLeft ?? 0;
  const keyboardConstrained = height < Math.min(480, window.screen.height * 0.55);

  return { width, height, offsetTop, offsetLeft, keyboardConstrained, revision };
}

let snapshot = readSnapshot();

function applyViewportVariables(next: PhysicalVisualViewportSnapshot): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--physical-visual-viewport-height", `${next.height}px`);
  root.style.setProperty("--physical-visual-viewport-offset-top", `${next.offsetTop}px`);
  root.style.setProperty("--physical-visual-viewport-offset-left", `${next.offsetLeft}px`);
  root.dataset.keyboardConstrained = next.keyboardConstrained ? "true" : "false";
}

function publish(): void {
  frame = null;
  revision += 1;
  snapshot = readSnapshot();
  applyViewportVariables(snapshot);
  listeners.forEach((listener) => listener());
}

function schedulePublish(): void {
  if (frame !== null || typeof window === "undefined") return;
  frame = window.requestAnimationFrame(publish);
}

function start(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  snapshot = readSnapshot();
  applyViewportVariables(snapshot);
  window.addEventListener("resize", schedulePublish, { passive: true });
  window.visualViewport?.addEventListener("resize", schedulePublish, { passive: true });
  window.visualViewport?.addEventListener("scroll", schedulePublish, { passive: true });
}

function stop(): void {
  if (!listening || typeof window === "undefined") return;
  listening = false;
  window.removeEventListener("resize", schedulePublish);
  window.visualViewport?.removeEventListener("resize", schedulePublish);
  window.visualViewport?.removeEventListener("scroll", schedulePublish);
  if (frame !== null) window.cancelAnimationFrame(frame);
  frame = null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

function getSnapshot(): PhysicalVisualViewportSnapshot {
  return snapshot;
}

export function usePhysicalVisualViewport(): PhysicalVisualViewportSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
