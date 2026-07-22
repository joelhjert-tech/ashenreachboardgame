import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactElement } from "react";

export type ArtworkFit = "contain" | "cover";
export type ArtworkRatio = "card" | "portrait" | "square" | "map-tile" | "wide" | "hero" | "natural";
export type ArtworkFallback = "card" | "operative" | "enemy" | "encounter" | "item" | "artifact" | "mission" | "scenario" | "shop" | "map" | "icon";

export interface ArtworkFrameProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  fit?: ArtworkFit;
  aspectRatio?: ArtworkRatio;
  focalPoint?: string;
  fallback?: ArtworkFallback;
  loading?: "eager" | "lazy";
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}

const fallbackLabels: Record<ArtworkFallback, string> = {
  card: "Card art unavailable",
  operative: "Operative portrait unavailable",
  enemy: "Enemy portrait unavailable",
  encounter: "Encounter art unavailable",
  item: "Item art unavailable",
  artifact: "Artifact art unavailable",
  mission: "Mission art unavailable",
  scenario: "Scenario art unavailable",
  shop: "Shop art unavailable",
  map: "Map art unavailable",
  icon: "Icon unavailable"
};

export function ArtworkFrame({
  src,
  alt,
  fit = "contain",
  aspectRatio = "natural",
  focalPoint = "center",
  fallback = "card",
  loading = "lazy",
  priority = false,
  className,
  imageClassName,
  onLoad,
  onError,
  ...imageProps
}: ArtworkFrameProps): ReactElement {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(src ? "loading" : "failed");
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setStatus("failed");
      return;
    }
    const image = imageRef.current;
    setStatus(image?.complete ? image.naturalWidth > 0 ? "ready" : "failed" : "loading");
  }, [src]);

  const visibleFallback = fallbackLabels[fallback];
  // Preserve the authored description as the accessible replacement for the
  // missing image. Visible fallback copy stays generic and never exposes a
  // content identifier or filesystem path.
  const accessibleFallback = alt.trim() || visibleFallback;

  return (
    <span
      className={`artwork-frame host-image-frame artwork-frame--${fit} host-image-frame--${fit} artwork-frame--${aspectRatio} host-image-frame--${aspectRatio} artwork-frame--${status} host-image-frame--${status}${className ? ` ${className}` : ""}`}
      data-artwork-fit={fit}
      data-artwork-ratio={aspectRatio}
      data-artwork-status={status}
      data-host-image-fit={fit}
      data-host-image-ratio={aspectRatio}
    >
      {src ? (
        <img
          ref={imageRef}
          {...imageProps}
          className={imageClassName}
          src={src}
          alt={status === "failed" ? "" : alt}
          aria-hidden={status === "failed" ? "true" : imageProps["aria-hidden"]}
          loading={priority ? "eager" : loading}
          fetchPriority={priority ? "high" : imageProps.fetchPriority}
          style={{ ...imageProps.style, objectPosition: focalPoint }}
          onLoad={(event) => {
            setStatus("ready");
            onLoad?.(event);
          }}
          onError={(event) => {
            setStatus("failed");
            onError?.(event);
          }}
        />
      ) : null}
      {status === "loading" ? <span className="artwork-frame__loading" aria-hidden="true" /> : null}
      {status === "failed" ? (
        <span
          className={`artwork-frame__fallback host-image-fallback host-image-fallback--${fallback}`}
          role={alt.trim() ? "img" : undefined}
          aria-label={alt.trim() ? accessibleFallback : undefined}
          aria-hidden={alt.trim() ? undefined : "true"}
        >
          <span aria-hidden="true">AR</span>
          <strong>{visibleFallback}</strong>
        </span>
      ) : null}
    </span>
  );
}
