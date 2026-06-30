import type { CSSProperties, ReactElement } from "react";

type FxVariant = "battle" | "shop" | "map";
type FxTone = "neutral" | "victory" | "failure" | "danger" | "reward";

export interface MapFxPoint {
  id: string;
  x: number;
  y: number;
  tone: "active" | "red" | "blue" | "yellow" | "gold" | "anomaly";
  intensity?: number;
  width?: number;
  height?: number;
}

export interface MapFxTrail {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface HostCinematicFxLayerProps {
  variant: FxVariant;
  tone?: FxTone;
  points?: MapFxPoint[];
  trails?: MapFxTrail[];
  scanlineKey?: string | number;
  stockCount?: number;
  riskActive?: boolean;
  burstActive?: boolean;
  className?: string;
  style?: CSSProperties;
  testId?: string;
}

function renderMapFx(points: MapFxPoint[], trails: MapFxTrail[], scanlineKey: string | number | undefined): ReactElement {
  return (
    <>
      <svg className="host-map-fx-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <filter id="host-map-route-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="0.9" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {trails.map((trail) => (
          <line
            key={trail.id}
            className="host-map-fx-svg-trail"
            x1={trail.fromX * 100}
            y1={trail.fromY * 100}
            x2={trail.toX * 100}
            y2={trail.toY * 100}
            pathLength={1}
          />
        ))}
      </svg>
      {points.map((point) => (
        <span
          key={point.id}
          className={`host-map-fx-dot host-map-fx-dot-${point.tone}`}
          style={{
            left: `${point.x * 100}%`,
            top: `${point.y * 100}%`,
            ["--map-fx-width" as string]: point.width ? `${point.width * 100}%` : undefined,
            ["--map-fx-height" as string]: point.height ? `${point.height * 100}%` : undefined,
            ["--map-fx-intensity" as string]: point.intensity ? String(point.intensity) : undefined
          }}
        />
      ))}
      {scanlineKey !== undefined && <b key={scanlineKey} className="host-map-fx-scanline" />}
    </>
  );
}

function renderEncounterFx(variant: FxVariant, stockCount: number, riskActive: boolean): ReactElement {
  const count = Math.max(3, Math.min(5, stockCount || 3));

  return (
    <>
      <span className="host-fx-ring" />
      <span className="host-fx-spark host-fx-spark-one" />
      <span className="host-fx-spark host-fx-spark-two" />
      {variant === "shop" &&
        Array.from({ length: count }, (_, index) => (
          <span
            key={`shop-card-${index}`}
            className={`host-fx-floating-card${riskActive && index === count - 1 ? " host-fx-floating-card-risk" : ""}`}
            style={{ ["--shop-card-index" as string]: String(index - (count - 1) / 2) }}
          />
        ))}
    </>
  );
}

export function HostCinematicFxLayer({
  variant,
  tone = "neutral",
  points = [],
  trails = [],
  scanlineKey,
  stockCount = 0,
  riskActive = false,
  burstActive = false,
  className = "",
  style,
  testId = `host-${variant}-fx-layer`
}: HostCinematicFxLayerProps): ReactElement {
  const rootClass = [
    "host-cinematic-fx-layer",
    `host-cinematic-fx-layer-${variant}`,
    `host-cinematic-fx-tone-${tone}`,
    riskActive ? "host-cinematic-fx-risk" : "",
    burstActive ? "host-cinematic-fx-burst" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} style={style} data-testid={testId} data-fallback="dom-animation" aria-hidden="true">
      <div className="host-cinematic-fx-fallback-stage">
        {variant === "map" ? renderMapFx(points, trails, scanlineKey) : renderEncounterFx(variant, stockCount, riskActive)}
      </div>
    </div>
  );
}
