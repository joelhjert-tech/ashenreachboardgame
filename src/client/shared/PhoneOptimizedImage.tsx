import { useEffect, useState, type ImgHTMLAttributes, type ReactElement } from "react";
import { getPhoneOptimizedImagePath } from "./phoneImagePaths.js";

interface PhoneOptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  fullResolution?: boolean;
}

export function PhoneOptimizedImage({
  src,
  fullResolution = false,
  loading = "lazy",
  decoding = "async",
  onError,
  ...props
}: PhoneOptimizedImageProps): ReactElement {
  const candidates = fullResolution ? [src] : [getPhoneOptimizedImagePath(src), src];
  const uniqueCandidates = candidates.filter((candidate, index) => candidates.indexOf(candidate) === index);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const activeSrc = uniqueCandidates[candidateIndex] ?? src;

  useEffect(() => setCandidateIndex(0), [src, fullResolution]);

  return (
    <img
      {...props}
      src={activeSrc}
      loading={loading}
      decoding={decoding}
      onError={(event) => {
        if (candidateIndex < uniqueCandidates.length - 1) {
          setCandidateIndex(candidateIndex + 1);
          return;
        }
        onError?.(event);
      }}
    />
  );
}
