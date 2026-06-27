import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { CombatDiceAnimation } from "../shared/CombatDiceAnimation.js";

interface ThreeBattleDiceAnimationProps {
  attackValue: number | null;
  defenseValue: number | null;
  modifierValue: number | null;
  attackDieFace: number | null;
  defenseDieFace: number | null;
  modifierDieFace?: number | null;
  attackSuccess?: boolean;
  defenseSuccess?: boolean;
}

type ThreeModule = typeof import("three");

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

function normalizeDieValue(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 1;
  }

  return Math.min(6, Math.max(1, Math.abs(value) % 6 || 6));
}

function formatModifier(value: number | null): string {
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
  die.userData.texture = texture;
  return die;
}

function disposeDie(die: import("three").Mesh): void {
  die.geometry.dispose();
  const material = die.material;
  const materials = Array.isArray(material) ? material : [material];

  materials.forEach((entry) => {
    const maybeMapped = entry as import("three").Material & { map?: import("three").Texture | null };
    maybeMapped.map?.dispose();
    entry.dispose();
  });
}

export function ThreeBattleDiceAnimation({
  attackValue,
  defenseValue,
  modifierValue,
  attackDieFace,
  defenseDieFace,
  modifierDieFace,
  attackSuccess = false,
  defenseSuccess = false
}: ThreeBattleDiceAnimationProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(() => {
    if (prefersReducedMotion()) {
      return "reduced-motion";
    }

    return supportsWebGl() ? null : "webgl-unavailable";
  });
  const dice = useMemo(
    () => [
      { key: "attack", value: normalizeDieValue(attackDieFace ?? attackValue), accent: "#e45d3d", x: -1.45 },
      { key: "defense", value: normalizeDieValue(defenseDieFace ?? defenseValue), accent: "#6bbcff", x: 0 },
      { key: "modifier", value: normalizeDieValue(modifierDieFace ?? modifierValue), accent: "#78e08a", x: 1.45 }
    ],
    [attackDieFace, attackValue, defenseDieFace, defenseValue, modifierDieFace, modifierValue]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container) {
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

        const dieMeshes = dice.map((die) => createDieMesh(THREE, die.value, die.accent, die.x));
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
  }, [dice]);

  if (fallbackReason) {
    return (
      <CombatDiceAnimation
        attackValue={attackValue}
        defenseValue={defenseValue}
        modifierValue={modifierValue}
        attackDieFace={attackDieFace}
        defenseDieFace={defenseDieFace}
        modifierDieFace={modifierDieFace}
        attackSuccess={attackSuccess}
        defenseSuccess={defenseSuccess}
        hasModifier={modifierValue !== 0}
        compact
      />
    );
  }

  const tokenClass = attackSuccess
    ? "combat-result-token-attack"
    : defenseSuccess
      ? "combat-result-token-defense"
      : "combat-result-token-mod";

  return (
    <div className="combat-dice-animation combat-dice-animation-compact three-battle-dice" data-testid="three-battle-dice">
      <div className="three-battle-dice-canvas-wrap" ref={containerRef}>
        <canvas ref={canvasRef} aria-label="Three dimensional battle dice" />
      </div>
      <div className={`combat-result-token ${tokenClass}`} data-testid="combat-result-token">
        <span aria-hidden="true">{attackSuccess ? "A" : defenseSuccess ? "D" : "*"}</span>
        <strong>
          A {attackValue ?? "-"} / D {defenseValue ?? "-"} / {formatModifier(modifierValue)}
        </strong>
      </div>
    </div>
  );
}
