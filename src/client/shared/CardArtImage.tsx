import { useEffect, useState, type ImgHTMLAttributes, type ReactElement } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { getCardArtPath, getCardFallbackArtPath } from "./assetPaths.js";
import { ArtworkFrame, type ArtworkFallback } from "./ArtworkFrame.js";
import { getPhoneOptimizedImagePath } from "./phoneImagePaths.js";

interface CardArtImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  cardId: string | null | undefined;
  cardType: CardImageType;
  quality?: "phone" | "full";
}

export function CardArtImage({ cardId, cardType, quality = "phone", onError, ...props }: CardArtImageProps): ReactElement {
  const fallbackPath = getCardFallbackArtPath(cardType);
  const originalPath = cardId ? getCardArtPath(cardType, cardId) : fallbackPath;
  const candidates = quality === "phone" && originalPath !== fallbackPath
    ? [getPhoneOptimizedImagePath(originalPath), originalPath, fallbackPath]
    : [originalPath, fallbackPath];
  const uniqueCandidates = candidates.filter((candidate, index) => candidates.indexOf(candidate) === index);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const src = uniqueCandidates[candidateIndex] ?? fallbackPath;

  useEffect(() => {
    setCandidateIndex(0);
  }, [originalPath, quality]);

  const fallbackByType: Partial<Record<CardImageType, ArtworkFallback>> = {
    threat: "enemy",
    anomaly: "encounter",
    equipment: "item",
    follower: "operative",
    artifact: "artifact",
    contract: "mission"
  };
  const { className, alt = "", loading, ...imageProps } = props;

  return <ArtworkFrame
    {...imageProps}
    src={src}
    alt={alt}
    fit="contain"
    aspectRatio="card"
    fallback={fallbackByType[cardType] ?? "card"}
    loading={loading ?? "lazy"}
    imageClassName={className}
    onError={(event) => {
      if (candidateIndex < uniqueCandidates.length - 1) {
        setCandidateIndex(candidateIndex + 1);
        return;
      }
      onError?.(event);
    }}
  />;
}
