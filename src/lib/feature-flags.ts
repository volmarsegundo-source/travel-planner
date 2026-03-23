/**
 * Feature flags for gradual design system migration.
 *
 * NEXT_PUBLIC_DESIGN_V2 controls whether the Atlas Design System v2
 * tokens and components are active. When "false" or unset, the app
 * uses the legacy v1 parchment/sepia design.
 */

const DESIGN_V2_ENV_KEY = "NEXT_PUBLIC_DESIGN_V2";

/**
 * Returns true when the Design System v2 feature flag is enabled.
 * Works in both server and client contexts (reads NEXT_PUBLIC_ env var).
 */
export function isDesignV2Enabled(): boolean {
  const value = process.env[DESIGN_V2_ENV_KEY];
  return value === "true";
}
