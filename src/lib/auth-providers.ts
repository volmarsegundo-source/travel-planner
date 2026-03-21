/**
 * Detects which OAuth providers are available based on environment variable
 * presence. Used by server components to conditionally render OAuth buttons.
 *
 * This file is safe to import in server components (no client-only code).
 */

export type OAuthProviderKey = "google" | "apple";

/**
 * Returns the list of OAuth provider keys that have credentials configured.
 * Called from server components (login/register page.tsx) and passed as a
 * prop to client-side form components.
 */
export function getAvailableOAuthProviders(): OAuthProviderKey[] {
  const providers: OAuthProviderKey[] = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push("google");
  }

  if (process.env.APPLE_ID && process.env.APPLE_SECRET) {
    providers.push("apple");
  }

  return providers;
}
