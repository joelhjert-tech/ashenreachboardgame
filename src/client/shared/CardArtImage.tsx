import { useEffect, useState, type ImgHTMLAttributes, type ReactElement } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { getCardArtPath, getCardFallbackArtPath } from "./assetPaths.js";
import { ArtworkFrame, type ArtworkFallback } from "./ArtworkFrame.js";

interface CardArtImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  cardId: string | null | undefined;
  cardType: CardImageType;
}

export function CardArtImage({ cardId, cardType, onError, ...props }: CardArtImageProps): ReactElement {
  const fallbackPath = getCardFallbackArtPath(cardType);
  const preferredPath = cardId ? getCardArtPath(cardType, cardId) : fallbackPath;
  const [src, setSrc] = useState(preferredPath);

  useEffect(() => {
    setSrc(preferredPath);
  }, [preferredPath]);

  const fallbackByType: Partial<Record<CardImageType, ArtworkFallback>> = {
    threat: "enemy",
    anomaly: "encounter",
    equipment: "item",
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
      if (src !== fallbackPath) setSrc(fallbackPath);
      onError?.(event);
    }}
  />;
}
