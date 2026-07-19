import { useEffect, useState, type ImgHTMLAttributes, type ReactElement } from "react";
import "./HostImage.css";

export type HostImageFit = "contain" | "cover";
export type HostImageRatio = "card" | "portrait" | "square" | "map-tile" | "wide" | "natural";
export type HostImageFallback = "card" | "portrait" | "map" | "icon";

export interface HostImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  fit?: HostImageFit;
  aspectRatio?: HostImageRatio;
  focalPoint?: string;
  fallback?: HostImageFallback;
  className?: string;
  imageClassName?: string;
}

export function HostImage({
  src,
  alt,
  fit = "contain",
  aspectRatio = "natural",
  focalPoint = "center",
  fallback = "card",
  className,
  imageClassName,
  onLoad,
  onError,
  ...imageProps
}: HostImageProps): ReactElement {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(src ? "loading" : "failed");

  useEffect(() => {
    setStatus(src ? "loading" : "failed");
  }, [src]);

  return (
    <span
      className={`host-image-frame host-image-frame--${fit} host-image-frame--${aspectRatio} host-image-frame--${status}${className ? ` ${className}` : ""}`}
      data-host-image-fit={fit}
      data-host-image-ratio={aspectRatio}
    >
      {src ? (
        <img
          {...imageProps}
          className={imageClassName}
          src={src}
          alt={status === "failed" ? "" : alt}
          aria-hidden={status === "failed" ? "true" : imageProps["aria-hidden"]}
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
      {status === "failed" ? (
        <span className={`host-image-fallback host-image-fallback--${fallback}`} role="img" aria-label={alt || "Artwork unavailable"}>
          <span>Art unavailable</span>
        </span>
      ) : null}
    </span>
  );
}
