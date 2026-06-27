import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { getContainedImageRect, type BoardRect } from "./boardGeometry.js";

interface BoardStageRenderContext {
  imageRect: BoardRect;
}

interface BoardStageProps {
  imageAlt: string;
  imageSrc: string;
  imageMode?: "visible" | "geometry-only";
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>, imageRect: BoardRect) => void;
  children: (context: BoardStageRenderContext) => ReactNode;
}

interface StageGeometry {
  containerWidth: number;
  containerHeight: number;
  imageNaturalWidth: number;
  imageNaturalHeight: number;
}

export function BoardStage({ imageAlt, imageSrc, imageMode = "visible", onPointerDown, children }: BoardStageProps): ReactElement {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [geometry, setGeometry] = useState<StageGeometry>({
    containerWidth: 0,
    containerHeight: 0,
    imageNaturalWidth: 0,
    imageNaturalHeight: 0
  });

  const updateGeometry = useCallback(() => {
    const stage = stageRef.current;
    const image = imageRef.current;

    if (!stage || !image) {
      return;
    }

    const containerWidth = stage.clientWidth;
    const containerHeight = stage.clientHeight;
    const imageNaturalWidth = image.naturalWidth || (imageMode === "geometry-only" ? 1600 : 0);
    const imageNaturalHeight = image.naturalHeight || (imageMode === "geometry-only" ? 900 : 0);

    if (containerWidth === 0 || containerHeight === 0 || imageNaturalWidth === 0 || imageNaturalHeight === 0) {
      return;
    }

    const nextImageRect = getContainedImageRect(containerWidth, containerHeight, imageNaturalWidth, imageNaturalHeight);

    if (nextImageRect.width === 0 || nextImageRect.height === 0) {
      return;
    }

    setGeometry((current) => {
      if (
        current.containerWidth === containerWidth &&
        current.containerHeight === containerHeight &&
        current.imageNaturalWidth === imageNaturalWidth &&
        current.imageNaturalHeight === imageNaturalHeight
      ) {
        return current;
      }

      return {
        containerWidth,
        containerHeight,
        imageNaturalWidth,
        imageNaturalHeight
      };
    });
  }, [imageMode]);

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage || typeof window === "undefined") {
      return;
    }

    const Observer = window.ResizeObserver;
    const observer = Observer ? new Observer(() => updateGeometry()) : null;
    const raf = window.requestAnimationFrame(updateGeometry);

    observer?.observe(stage);
    window.addEventListener("load", updateGeometry);
    updateGeometry();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("load", updateGeometry);
      observer?.disconnect();
    };
  }, [imageSrc, updateGeometry]);

  const imageRect = useMemo(
    () =>
      getContainedImageRect(
        geometry.containerWidth,
        geometry.containerHeight,
        geometry.imageNaturalWidth,
        geometry.imageNaturalHeight
      ),
    [geometry.containerHeight, geometry.containerWidth, geometry.imageNaturalHeight, geometry.imageNaturalWidth]
  );

  return (
    <div
      ref={stageRef}
      className="board-stage"
      data-testid="sector-map"
      onPointerDown={
        onPointerDown
          ? (event) => {
              onPointerDown(event, imageRect);
            }
          : undefined
      }
    >
      <img
        ref={imageRef}
        className={`board-image board-image-${imageMode}`}
        src={imageSrc}
        alt={imageMode === "geometry-only" ? "" : imageAlt}
        aria-hidden={imageMode === "geometry-only" ? "true" : undefined}
        onLoad={updateGeometry}
      />
      <div className="board-overlay">{children({ imageRect })}</div>
    </div>
  );
}
