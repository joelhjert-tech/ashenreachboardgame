import type { ImgHTMLAttributes, ReactElement } from "react";
import { getCharacterPortraitPath } from "./assetPaths.js";
import { ArtworkFrame } from "./ArtworkFrame.js";

interface OperativePortraitImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  characterId: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export function OperativePortraitImage({ characterId, alt, className = "", priority = false, ...props }: OperativePortraitImageProps): ReactElement {
  return (
    <ArtworkFrame
      {...props}
      src={getCharacterPortraitPath(characterId)}
      alt={alt}
      fit="cover"
      aspectRatio="portrait"
      focalPoint="center top"
      fallback="operative"
      priority={priority}
      className={className}
      imageClassName={className}
    />
  );
}
