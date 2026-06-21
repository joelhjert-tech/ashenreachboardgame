export type BoardRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function getContainedImageRect(
  containerWidth: number,
  containerHeight: number,
  imageNaturalWidth: number,
  imageNaturalHeight: number
): BoardRect {
  if (containerWidth <= 0 || containerHeight <= 0 || imageNaturalWidth <= 0 || imageNaturalHeight <= 0) {
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0
    };
  }

  const imageRatio = imageNaturalWidth / imageNaturalHeight;
  const containerRatio = containerWidth / containerHeight;

  let width: number;
  let height: number;

  if (containerRatio > imageRatio) {
    height = containerHeight;
    width = height * imageRatio;
  } else {
    width = containerWidth;
    height = width / imageRatio;
  }

  return {
    left: (containerWidth - width) / 2,
    top: (containerHeight - height) / 2,
    width,
    height
  };
}

export function pointerToBoardCoordinate(pointerX: number, pointerY: number, rect: BoardRect): { x: number; y: number } | null {
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const isInsideX = pointerX >= rect.left && pointerX <= rect.left + rect.width;
  const isInsideY = pointerY >= rect.top && pointerY <= rect.top + rect.height;

  if (!isInsideX || !isInsideY) {
    return null;
  }

  return {
    x: clamp01((pointerX - rect.left) / rect.width),
    y: clamp01((pointerY - rect.top) / rect.height)
  };
}
