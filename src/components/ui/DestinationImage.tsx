"use client";

import { useState, useEffect } from "react";
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
 * with optional photographer attribution (Unsplash requirement).
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

  useEffect(() => {
    let cancelled = false;

    getDestinationImageAction(destination).then((data) => {
      if (!cancelled) setImageData(data);
    });

    return () => {
      cancelled = true;
    };
  }, [destination]);

  if (!imageData) {
    return (
      <div
        className={`motion-reduce:transition-none bg-gradient-to-br from-atlas-secondary-container/70 to-atlas-primary/60 ${fill ? "absolute inset-0" : ""} ${className ?? ""}`}
        role="img"
        aria-label={alt ?? destination}
      />
    );
  }

  return (
    <>
      <Image
        src={imageData.url}
        alt={alt ?? destination}
        className={className}
        {...(fill
          ? { fill: true, style: { objectFit: "cover" as const } }
          : { width, height })}
        priority={priority}
        quality={quality}
        {...(sizes ? { sizes } : {})}
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
