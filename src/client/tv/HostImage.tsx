import type { ReactElement } from "react";
import {
  ArtworkFrame,
  type ArtworkFallback,
  type ArtworkFit,
  type ArtworkFrameProps,
  type ArtworkRatio
} from "../shared/ArtworkFrame.js";
import "./HostImage.css";

export type HostImageFit = ArtworkFit;
export type HostImageRatio = Exclude<ArtworkRatio, "hero">;
export type HostImageFallback = "card" | "portrait" | "map" | "icon";

export interface HostImageProps extends Omit<ArtworkFrameProps, "aspectRatio" | "fallback"> {
  aspectRatio?: HostImageRatio;
  fallback?: HostImageFallback;
}

const fallbackMap: Record<HostImageFallback, ArtworkFallback> = {
  card: "card",
  portrait: "operative",
  map: "map",
  icon: "icon"
};

export function HostImage({ fallback = "card", ...props }: HostImageProps): ReactElement {
  return <ArtworkFrame {...props} fallback={fallbackMap[fallback]} />;
}
