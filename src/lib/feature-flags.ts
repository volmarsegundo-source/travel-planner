/**
 * Feature flags for gradual design system migration.
 *
 * NEXT_PUBLIC_DESIGN_V2 controls whether the Atlas Design System v2
 * tokens and components are active. When "false" or unset, the app
 * uses the legacy v1 parchment/sepia design.
 *
 * IMPORTANT: Next.js only inlines NEXT_PUBLIC_* env vars when accessed
 * as a static string literal (process.env.NEXT_PUBLIC_DESIGN_V2).
 * Dynamic access like process.env[variable] is NOT inlined and will be
 * undefined on the client, causing hydration mismatch.
 */

/**
 * Returns true when the Design System v2 feature flag is enabled.
 * Works in both server and client contexts.
 *
 * Uses static string literal access — required for Next.js build-time inlining.
 */
export function isDesignV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_DESIGN_V2 === "true";
}
