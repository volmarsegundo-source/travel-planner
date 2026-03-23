"use client";

import { useDesignV2 } from "@/hooks/useDesignV2";

interface DesignBranchProps {
  /** Component rendered when Design System v1 (legacy) is active */
  v1: React.ReactNode;
  /** Component rendered when Design System v2 is active */
  v2: React.ReactNode;
}

/**
 * Conditionally renders v1 or v2 children based on the NEXT_PUBLIC_DESIGN_V2
 * feature flag. Enables gradual migration of individual components.
 *
 * @example
 * <DesignBranch
 *   v1={<LegacyButton />}
 *   v2={<AtlasButton />}
 * />
 */
export function DesignBranch({ v1, v2 }: DesignBranchProps): React.ReactNode {
  const isV2 = useDesignV2();
  return isV2 ? v2 : v1;
}
