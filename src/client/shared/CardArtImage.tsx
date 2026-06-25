import { useEffect, useState, type ImgHTMLAttributes, type ReactElement } from "react";
import type { CardImageType } from "../../game/assets/design/cardImageCatalog.js";
import { getCardArtPath, getCardFallbackArtPath } from "./assetPaths.js";

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

  return (
    <img
      {...props}
      src={src}
      onError={(event) => {
        if (src !== fallbackPath) {
          setSrc(fallbackPath);
        }

        onError?.(event);
      }}
    />
  );
}
