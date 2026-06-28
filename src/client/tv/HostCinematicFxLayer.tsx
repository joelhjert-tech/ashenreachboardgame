import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from "react";

type ThreeModule = typeof import("three");
type FxVariant = "battle" | "shop" | "map";
type FxTone = "neutral" | "victory" | "failure" | "danger" | "reward";

export interface MapFxPoint {
  id: string;
  x: number;
  y: number;
  tone: "active" | "red" | "blue" | "yellow" | "gold" | "anomaly";
  intensity?: number;
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

declare global {
  interface Window {
    __ASHEN_REACH_HOST_FX_DIAGNOSTICS__?: {
      variant: FxVariant;
      renderCalls: number;
      triangles: number;
      geometries: number;
      textures: number;
      dpr: number;
      canvasWidth: number;
      canvasHeight: number;
    };
  }
}

function supportsWebGl(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  if (typeof WebGLRenderingContext === "undefined" && typeof WebGL2RenderingContext === "undefined") {
    return false;
  }

  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function toneColor(tone: MapFxPoint["tone"] | FxTone): number {
  switch (tone) {
    case "victory":
    case "active":
      return 0x76c7ff;
    case "failure":
    case "danger":
    case "red":
      return 0xf05a3f;
    case "blue":
    case "anomaly":
      return 0x8f6cff;
    case "yellow":
    case "gold":
    case "reward":
      return 0xf0bd69;
    default:
      return 0xdcc28d;
  }
}

function createCircleMesh(
  THREE: ThreeModule,
  x: number,
  y: number,
  radius: number,
  color: number,
  opacity: number
): import("three").Mesh {
  const geometry = new THREE.CircleGeometry(radius, 48);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, 0);
  return mesh;
}

function createTrailMesh(THREE: ThreeModule, trail: MapFxTrail): import("three").Line {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(trail.fromX - 0.5, 0.5 - trail.fromY, 0),
    new THREE.Vector3(trail.toX - 0.5, 0.5 - trail.toY, 0)
  ]);
  const material = new THREE.LineBasicMaterial({
    color: 0xef664a,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  return new THREE.Line(geometry, material);
}

function disposeObject(object: import("three").Object3D): void {
  const maybeMesh = object as import("three").Mesh | import("three").Line;
  const geometry = maybeMesh.geometry as import("three").BufferGeometry | undefined;
  const material = maybeMesh.material as import("three").Material | import("three").Material[] | undefined;
  geometry?.dispose();
  const materials = Array.isArray(material) ? material : material ? [material] : [];
  materials.forEach((entry) => entry.dispose());
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(() => {
    if (prefersReducedMotion()) {
      return "reduced-motion";
    }

    return supportsWebGl() ? null : "webgl-unavailable";
  });
  const pointsSignature = useMemo(
    () => points.map((point) => `${point.id}:${point.x.toFixed(3)}:${point.y.toFixed(3)}:${point.tone}`).join("|"),
    [points]
  );
  const trailsSignature = useMemo(
    () =>
      trails
        .map((trail) => `${trail.id}:${trail.fromX.toFixed(3)}:${trail.fromY.toFixed(3)}:${trail.toX.toFixed(3)}:${trail.toY.toFixed(3)}`)
        .join("|"),
    [trails]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container || fallbackReason) {
      return;
    }

    if (prefersReducedMotion()) {
      setFallbackReason("reduced-motion");
      return;
    }

    if (!supportsWebGl()) {
      setFallbackReason("webgl-unavailable");
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let resizeObserver: ResizeObserver | null = null;
    let teardown: (() => void) | null = null;

    void import("three")
      .then((THREE) => {
        if (cancelled) {
          return;
        }

        const renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance"
        });
        const dpr = Math.min(window.devicePixelRatio || 1, 1.35);
        renderer.setPixelRatio(dpr);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -10, 10);
        camera.position.z = 2;

        const objects: import("three").Object3D[] = [];
        const baseColor = toneColor(tone);

        if (variant === "battle") {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.12, 0.006, 12, 72),
            new THREE.MeshBasicMaterial({
              color: baseColor,
              transparent: true,
              opacity: 0.72,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            })
          );
          const slashA = new THREE.Mesh(
            new THREE.BoxGeometry(0.018, 0.28, 0.001),
            new THREE.MeshBasicMaterial({ color: 0xf3d19a, transparent: true, opacity: 0.84, blending: THREE.AdditiveBlending })
          );
          const slashB = slashA.clone();
          slashA.rotation.z = 0.76;
          slashB.rotation.z = -0.76;
          [ring, slashA, slashB].forEach((entry) => {
            scene.add(entry);
            objects.push(entry);
          });
        }

        if (variant === "shop") {
          const count = Math.max(3, Math.min(5, stockCount || 3));
          Array.from({ length: count }, (_, index) => {
            const card = new THREE.Mesh(
              new THREE.PlaneGeometry(0.12, 0.17),
              new THREE.MeshBasicMaterial({
                color: riskActive && index === count - 1 ? 0xe66a3e : 0xe7c47c,
                transparent: true,
                opacity: 0.28,
                blending: THREE.AdditiveBlending,
                depthWrite: false
              })
            );
            card.position.x = (index - (count - 1) / 2) * 0.08;
            card.position.y = -0.04 + Math.abs(index - (count - 1) / 2) * 0.012;
            card.rotation.z = (index - (count - 1) / 2) * 0.08;
            scene.add(card);
            objects.push(card);
          });
        }

        if (variant === "map") {
          points.forEach((point) => {
            const radius = 0.014 + (point.intensity ?? 1) * 0.012;
            const mesh = createCircleMesh(THREE, point.x - 0.5, 0.5 - point.y, radius, toneColor(point.tone), point.tone === "active" ? 0.72 : 0.36);
            scene.add(mesh);
            objects.push(mesh);
          });

          trails.forEach((trail) => {
            const line = createTrailMesh(THREE, trail);
            scene.add(line);
            objects.push(line);
          });

          if (scanlineKey !== undefined) {
            const scanline = new THREE.Mesh(
              new THREE.PlaneGeometry(1.2, 0.026),
              new THREE.MeshBasicMaterial({
                color: 0xef5d3f,
                transparent: true,
                opacity: 0.18,
                blending: THREE.AdditiveBlending,
                depthWrite: false
              })
            );
            scanline.position.y = 0.44;
            scene.add(scanline);
            objects.push(scanline);
          }
        }

        const resize = () => {
          const rect = container.getBoundingClientRect();
          const width = Math.max(1, Math.floor(rect.width));
          const height = Math.max(1, Math.floor(rect.height));
          renderer.setSize(width, height, false);
          camera.updateProjectionMatrix();
        };

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        const start = performance.now();
        const render = (now: number) => {
          if (cancelled) {
            return;
          }

          const elapsed = (now - start) / 1000;
          objects.forEach((object, index) => {
            const pulse = 0.92 + Math.sin(elapsed * 2.8 + index * 0.7) * 0.08;
            object.scale.setScalar(pulse);

            if (variant !== "map") {
              object.rotation.z += 0.002 + index * 0.0005;
            }
          });

          if (burstActive && variant !== "map") {
            camera.zoom = 1 + Math.sin(Math.min(1, elapsed) * Math.PI) * 0.04;
            camera.updateProjectionMatrix();
          }

          renderer.render(scene, camera);
          window.__ASHEN_REACH_HOST_FX_DIAGNOSTICS__ = {
            variant,
            renderCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
            dpr,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
          };

          frameId = window.requestAnimationFrame(render);
        };

        frameId = window.requestAnimationFrame(render);

        teardown = () => {
          window.cancelAnimationFrame(frameId);
          resizeObserver?.disconnect();
          objects.forEach((object) => {
            scene.remove(object);
            disposeObject(object);
          });
          renderer.dispose();
        };
      })
      .catch(() => {
        if (!cancelled) {
          setFallbackReason("three-load-failed");
        }
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      teardown?.();
    };
  }, [burstActive, fallbackReason, points, pointsSignature, riskActive, scanlineKey, stockCount, tone, trails, trailsSignature, variant]);

  const rootClass = [
    "host-cinematic-fx-layer",
    `host-cinematic-fx-layer-${variant}`,
    `host-cinematic-fx-tone-${tone}`,
    riskActive ? "host-cinematic-fx-risk" : "",
    burstActive ? "host-cinematic-fx-burst" : "",
    fallbackReason ? "host-cinematic-fx-fallback" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} style={style} data-testid={testId} data-fallback={fallbackReason ?? undefined} aria-hidden="true">
      {fallbackReason ? (
        <div className="host-cinematic-fx-fallback-stage">
          {variant === "map" ? (
            <>
              {points.map((point) => (
                <span
                  key={point.id}
                  className={`host-map-fx-dot host-map-fx-dot-${point.tone}`}
                  style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
                />
              ))}
              {trails.map((trail) => (
                <i
                  key={trail.id}
                  className="host-map-fx-trail"
                  style={{
                    left: `${trail.fromX * 100}%`,
                    top: `${trail.fromY * 100}%`,
                    ["--trail-x" as string]: `${(trail.toX - trail.fromX) * 100}%`,
                    ["--trail-y" as string]: `${(trail.toY - trail.fromY) * 100}%`
                  }}
                />
              ))}
              {scanlineKey !== undefined && <b key={scanlineKey} className="host-map-fx-scanline" />}
            </>
          ) : (
            <>
              <span className="host-fx-ring" />
              <span className="host-fx-spark host-fx-spark-one" />
              <span className="host-fx-spark host-fx-spark-two" />
              {variant === "shop" && <span className="host-fx-floating-card" />}
            </>
          )}
        </div>
      ) : (
        <div ref={containerRef} className="host-cinematic-fx-canvas-wrap">
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  );
}
