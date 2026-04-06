"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { getDestinationImageAction } from "@/server/actions/image.actions";
import type { DestinationImageActionResult } from "@/server/actions/image.actions";

export interface DestinationImageProps {
  destination: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;

/**
 * Client component that fetches a destination image via server action.
 * Shows a gradient placeholder while loading, then the resolved image
 * with a smooth fade-in transition and optional photographer attribution
 * (Unsplash requirement).
 */
const DEFAULT_QUALITY = 75;

export function DestinationImage({
  destination,
  alt,
  className,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  fill = false,
  priority = false,
  sizes,
  quality = DEFAULT_QUALITY,
}: DestinationImageProps) {
  const [imageData, setImageData] = useState<DestinationImageActionResult | null>(
    null
  );
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getDestinationImageAction(destination).then((data) => {
      if (!cancelled) setImageData(data);
    });

    return () => {
      cancelled = true;
    };
  }, [destination]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // Gradient placeholder — shown while fetching URL or while image is loading
  const placeholderVisible = !imageData || !imageLoaded;

  if (!imageData) {
    return (
      <div
        className={`motion-reduce:transition-none bg-gradient-to-br from-atlas-secondary-container/70 to-atlas-primary/60 ${fill ? "absolute inset-0" : ""} ${className ?? ""}`}
        role="img"
        aria-label={alt ?? destination}
      />
    );
  }

  // Optimize Unsplash URL: resize to match display size (avoid loading 1200px for small cards)
  const optimizedUrl = (() => {
    let targetWidth = 1200;
    if (!fill) {
      targetWidth = Math.min(width * 2, 1200); // 2x for retina
    } else if (sizes) {
      // Parse sizes hint: "280px" -> 560 (2x retina)
      const match = sizes.match(/(\d+)px/);
      if (match) targetWidth = Math.min(parseInt(match[1]!) * 2, 1200);
    }
    return imageData.url.replace(/&w=\d+/, `&w=${targetWidth}`);
  })();

  return (
    <>
      {/* Gradient placeholder — fades out smoothly when image loads */}
      <div
        className={[
          "bg-gradient-to-br from-atlas-secondary-container/70 to-atlas-primary/60",
          "transition-opacity duration-500 ease-out motion-reduce:transition-none",
          fill ? "absolute inset-0 z-[1]" : "absolute inset-0",
          placeholderVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        aria-hidden="true"
      />
      <Image
        src={optimizedUrl}
        alt={alt ?? destination}
        className={[
          className,
          "transition-opacity duration-500 ease-out motion-reduce:transition-none",
          imageLoaded ? "opacity-100" : "opacity-0",
        ]
          .filter(Boolean)
          .join(" ")}
        {...(fill
          ? { fill: true, style: { objectFit: "cover" as const } }
          : { width, height })}
        priority={priority}
        quality={quality}
        {...(sizes ? { sizes } : {})}
        onLoad={handleImageLoad}
      />
      {imageData.photographer && (
        <a
          href={imageData.photographerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-1 right-2 z-10 text-[10px] text-white/60 hover:text-white/90 font-atlas-body focus-visible:ring-2 ring-atlas-focus-ring rounded px-1"
        >
          Photo by {imageData.photographer}
        </a>
      )}
    </>
  );
}
