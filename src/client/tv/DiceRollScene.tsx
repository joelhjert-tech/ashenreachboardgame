import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { CombatDiceAnimation } from "../shared/CombatDiceAnimation.js";
import { getChallengeTheme } from "../../game/ui/challengeTheme.js";
import type { Stat } from "../shared/types.js";

type ThreeModule = typeof import("three");

export interface DiceRollSceneProps {
  attackValue: number | null;
  defenseValue: number | null;
  modifierValue?: number | null;
  attackDieFace?: number | null;
  defenseDieFace?: number | null;
  modifierDieFace?: number | null;
  attackSuccess?: boolean;
  defenseSuccess?: boolean;
  compact?: boolean;
  className?: string;
  testId?: string;
  challengeStat?: Stat;
}

declare global {
  interface Window {
    __ASHEN_REACH_THREE_DICE_DIAGNOSTICS__?: {
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

function isDieFace(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 6;
}

function formatModifier(value: number | null | undefined): string {
  if (!value) {
    return "+0";
  }

  return value > 0 ? `+${value}` : String(value);
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

function createDieTexture(THREE: ThreeModule, value: number, accent: string): import("three").CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create dice texture context");
  }

  const gradient = context.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.45, "#dce8ec");
  gradient.addColorStop(1, "#93a5ad");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  context.strokeStyle = accent;
  context.lineWidth = 14;
  context.strokeRect(13, 13, 230, 230);

  context.fillStyle = "#101820";
  context.font = "900 150px Georgia, serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(255,255,255,0.72)";
  context.shadowBlur = 12;
  context.fillText(String(value), 128, 134);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createDieMesh(THREE: ThreeModule, value: number, accent: string, x: number): import("three").Mesh {
  const texture = createDieTexture(THREE, value, accent);
  const geometry = new THREE.BoxGeometry(1.12, 1.12, 1.12);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.44,
    metalness: 0.06
  });
  const die = new THREE.Mesh(geometry, material);
  die.position.x = x;
  return die;
}

function disposeDie(die: import("three").Mesh): void {
  die.geometry.dispose();
  const materials = Array.isArray(die.material) ? die.material : [die.material];

  materials.forEach((entry) => {
    const maybeMapped = entry as import("three").Material & { map?: import("three").Texture | null };
    maybeMapped.map?.dispose();
    entry.dispose();
  });
}

export function DiceRollScene({
  attackValue,
  defenseValue,
  modifierValue = null,
  attackDieFace,
  defenseDieFace,
  modifierDieFace,
  attackSuccess = false,
  defenseSuccess = false,
  compact = false,
  className = "",
  testId = "host-dice-roll-scene",
  challengeStat = "grit"
}: DiceRollSceneProps): ReactElement {
  const challengeTheme = getChallengeTheme(challengeStat);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(() => {
    if (prefersReducedMotion()) {
      return "reduced-motion";
    }

    return supportsWebGl() ? null : "webgl-unavailable";
  });
  const dice = useMemo(
    () =>
      [
        isDieFace(attackDieFace) ? { key: "attack", value: attackDieFace, accent: challengeTheme.color, x: -1.45 } : null,
        isDieFace(defenseDieFace) ? { key: "defense", value: defenseDieFace, accent: "#6bbcff", x: 0 } : null,
        isDieFace(modifierDieFace) ? { key: "modifier", value: modifierDieFace, accent: "#78e08a", x: 1.45 } : null
      ].filter((die): die is { key: string; value: number; accent: string; x: number } => Boolean(die)),
    [attackDieFace, challengeTheme.color, defenseDieFace, modifierDieFace]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container || fallbackReason || dice.length === 0) {
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
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        renderer.setPixelRatio(dpr);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0, 0.25, 6.2);
        camera.lookAt(0, 0, 0);

        const ambient = new THREE.AmbientLight(0xdde8ff, 1.2);
        const key = new THREE.DirectionalLight(0xffe2bf, 2.2);
        key.position.set(2.2, 2.8, 3.6);
        const rim = new THREE.DirectionalLight(0x7cc8ff, 1.3);
        rim.position.set(-3, 1.4, 2.2);
        scene.add(ambient, key, rim);

        const table = new THREE.Mesh(
          new THREE.CylinderGeometry(3.65, 3.9, 0.18, 48),
          new THREE.MeshStandardMaterial({
            color: 0x101720,
            roughness: 0.78,
            metalness: 0.36,
            transparent: true,
            opacity: 0.72
          })
        );
        table.position.y = -0.78;
        scene.add(table);

        const dieMeshes = dice.map((die) => createDieMesh(THREE, die.value, die.accent, dice.length === 2 ? die.x * 0.55 : die.x));
        dieMeshes.forEach((die, index) => {
          die.rotation.set(0.7 + index * 0.4, -0.45 + index * 0.35, 0.2 - index * 0.18);
          scene.add(die);
        });

        const resize = () => {
          const rect = container.getBoundingClientRect();
          const width = Math.max(1, Math.floor(rect.width));
          const height = Math.max(1, Math.floor(rect.height));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };

        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        const start = performance.now();
        const duration = 1500;

        const render = (now: number) => {
          if (cancelled) {
            return;
          }

          const progress = Math.min(1, (now - start) / duration);
          const tumble = 1 - Math.pow(progress, 3);
          const settle = 1 - Math.pow(1 - progress, 3);
          const impact = progress > 0.72 ? Math.sin((progress - 0.72) * Math.PI * 7) * (1 - progress) * 0.05 : 0;

          camera.position.x = impact;
          camera.position.y = 0.25 + impact * 0.45;
          camera.lookAt(0, 0, 0);

          dieMeshes.forEach((die, index) => {
            const offset = index * 0.38;
            die.rotation.x = 0.16 + tumble * (Math.PI * 4.8 + offset);
            die.rotation.y = -0.22 + tumble * (Math.PI * 3.4 + offset);
            die.rotation.z = 0.08 + Math.sin(progress * Math.PI * 2 + offset) * 0.22 * tumble;
            die.position.y = Math.sin(progress * Math.PI * 2.2 + offset) * 0.12 * tumble + settle * 0.02;
            die.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.05);
          });

          renderer.render(scene, camera);
          window.__ASHEN_REACH_THREE_DICE_DIAGNOSTICS__ = {
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
          dieMeshes.forEach((die) => {
            scene.remove(die);
            disposeDie(die);
          });
          scene.remove(table);
          table.geometry.dispose();
          const tableMaterial = Array.isArray(table.material) ? table.material : [table.material];
          tableMaterial.forEach((material) => material.dispose());
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
  }, [dice, fallbackReason]);

  const tokenClass = attackSuccess
    ? "combat-result-token-attack"
    : defenseSuccess
      ? "combat-result-token-defense"
      : "combat-result-token-mod";
  const rootClass = [
    "dice-roll-scene",
    `dice-roll-scene-${challengeStat}`,
    compact ? "dice-roll-scene-compact" : "",
    fallbackReason || dice.length === 0 ? "dice-roll-scene-fallback" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} data-testid={testId} data-fallback={fallbackReason ?? (dice.length === 0 ? "missing-dice-faces" : undefined)}>
      {fallbackReason || dice.length === 0 ? (
        <CombatDiceAnimation
          attackValue={attackValue}
          defenseValue={defenseValue}
          modifierValue={modifierValue}
          attackDieFace={attackDieFace}
          defenseDieFace={defenseDieFace}
          modifierDieFace={modifierDieFace}
          attackSuccess={attackSuccess}
          defenseSuccess={defenseSuccess}
          hasModifier={Boolean(modifierValue)}
          compact={compact}
          challengeStat={challengeStat}
        />
      ) : (
        <>
          <div className="dice-roll-scene-canvas-wrap" ref={containerRef}>
            <canvas ref={canvasRef} aria-label="Three dimensional dice roll" />
          </div>
          <div className={`combat-result-token ${tokenClass}`} data-testid="combat-result-token">
            <span aria-hidden="true">{attackSuccess ? "A" : defenseSuccess ? "D" : "*"}</span>
            <strong>
              A {attackValue ?? "-"} / D {defenseValue ?? "-"} / {formatModifier(modifierValue)}
            </strong>
          </div>
          <p className="dice-roll-scene-readout">
            Dice {dice.map((die) => die.value).join(" / ")}
          </p>
        </>
      )}
    </div>
  );
}
