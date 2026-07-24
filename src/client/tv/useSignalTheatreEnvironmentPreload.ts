import { useEffect } from "react";
import { getSignalTheatreEnvironment } from "./signalTheatreEnvironmentManifest.js";

const MAX_ENVIRONMENT_CACHE_SIZE = 49;
const preloadedEnvironmentPaths = new Set<string>();

export function getSignalTheatreEnvironmentPreloadPaths(
  route: readonly string[],
  currentStep: number
): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();

  for (let index = Math.max(0, currentStep + 1); index < route.length && paths.length < 2; index += 1) {
    const path = getSignalTheatreEnvironment(route[index])?.path;
    if (!path || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }

  return paths;
}

function rememberPreloadedPath(path: string): boolean {
  if (preloadedEnvironmentPaths.has(path)) return false;
  preloadedEnvironmentPaths.add(path);
  while (preloadedEnvironmentPaths.size > MAX_ENVIRONMENT_CACHE_SIZE) {
    const oldest = preloadedEnvironmentPaths.values().next().value as string | undefined;
    if (!oldest) break;
    preloadedEnvironmentPaths.delete(oldest);
  }
  return true;
}

export function resetSignalTheatreEnvironmentPreloadCacheForTests(): void {
  preloadedEnvironmentPaths.clear();
}

export function useSignalTheatreEnvironmentPreload(
  route: readonly string[],
  currentStep: number
): void {
  useEffect(() => {
    if (typeof Image === "undefined") return;

    for (const path of getSignalTheatreEnvironmentPreloadPaths(route, currentStep)) {
      if (!rememberPreloadedPath(path)) continue;
      const image = new Image();
      image.decoding = "async";
      image.src = path;
      void image.decode?.().catch(() => undefined);
    }
  }, [currentStep, route]);
}
