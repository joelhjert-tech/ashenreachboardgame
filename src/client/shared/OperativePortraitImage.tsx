import { useEffect, useState, type ImgHTMLAttributes, type ReactElement } from "react";
import { getCharacterPortraitPath } from "./assetPaths.js";
import { ArtworkFrame } from "./ArtworkFrame.js";
import { getPhoneOptimizedImagePath } from "./phoneImagePaths.js";

interface OperativePortraitImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  characterId: string;
  alt: string;
  className?: string;
  priority?: boolean;
  quality?: "phone" | "full";
}

export function OperativePortraitImage({ characterId, alt, className = "", priority = false, quality = "phone", onError, ...props }: OperativePortraitImageProps): ReactElement {
  const originalPath = getCharacterPortraitPath(characterId);
  const candidates = quality === "phone" ? [getPhoneOptimizedImagePath(originalPath), originalPath] : [originalPath];
  const [candidateIndex, setCandidateIndex] = useState(0);
  const src = candidates[candidateIndex] ?? originalPath;
  useEffect(() => setCandidateIndex(0), [originalPath, quality]);

  return (
    <ArtworkFrame
      {...props}
      src={src}
      alt={alt}
      fit="cover"
      aspectRatio="portrait"
      focalPoint="center top"
      fallback="operative"
      priority={priority}
      className={className}
      imageClassName={className}
      onError={(event) => {
        if (candidateIndex < candidates.length - 1) {
          setCandidateIndex(candidateIndex + 1);
          return;
        }
        onError?.(event);
      }}
    />
  );
}
