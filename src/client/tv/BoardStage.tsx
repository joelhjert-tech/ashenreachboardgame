import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { getContainedImageRect, type BoardRect } from "./boardGeometry.js";

interface BoardStageRenderContext {
  imageRect: BoardRect;
}

interface BoardStageProps {
  imageAlt: string;
  imageSrc: string;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>, imageRect: BoardRect) => void;
  children: (context: BoardStageRenderContext) => ReactNode;
}

interface StageGeometry {
  containerWidth: number;
  containerHeight: number;
  imageNaturalWidth: number;
  imageNaturalHeight: number;
}

export function BoardStage({ imageAlt, imageSrc, onPointerDown, children }: BoardStageProps): ReactElement {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [geometry, setGeometry] = useState<StageGeometry>({
    containerWidth: 0,
    containerHeight: 0,
    imageNaturalWidth: 0,
    imageNaturalHeight: 0
  });

  useEffect(() => {
    const stage = stageRef.current;

    if (!stage || typeof window === "undefined") {
      return;
    }

    let naturalWidth = 0;
    let naturalHeight = 0;

    const updateGeometry = () => {
      setGeometry({
        containerWidth: stage.clientWidth,
        containerHeight: stage.clientHeight,
        imageNaturalWidth: naturalWidth,
        imageNaturalHeight: naturalHeight
      });
    };

    const image = new window.Image();
    image.addEventListener("load", () => {
      naturalWidth = image.naturalWidth;
      naturalHeight = image.naturalHeight;
      updateGeometry();
    });
    image.src = imageSrc;

    const Observer = window.ResizeObserver;
    const observer = Observer ? new Observer(() => updateGeometry()) : null;

    observer?.observe(stage);
    updateGeometry();

    return () => {
      observer?.disconnect();
    };
  }, [imageSrc]);

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
      onPointerDown={(event) => {
        onPointerDown?.(event, imageRect);
      }}
    >
      <img className="board-image" src={imageSrc} alt={imageAlt} />
      <div className="board-overlay">{children({ imageRect })}</div>
    </div>
  );
}
