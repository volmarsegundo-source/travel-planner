"use client";

import { isDesignV2Enabled } from "@/lib/feature-flags";

/**
 * Client-side hook to check if Design System v2 is enabled.
 * Reads the NEXT_PUBLIC_DESIGN_V2 environment variable.
 */
export function useDesignV2(): boolean {
  return isDesignV2Enabled();
}
