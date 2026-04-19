/**
 * Open-redirect mitigation helper (CVE GHSA-8f24-v5vv-gm5j mitigation).
 *
 * Validates that a redirect URL points to an internal Atlas route only,
 * rejecting any absolute or protocol-relative URL that could be used for
 * phishing. Defense-in-depth while the next-intl 3→4 MAJOR upgrade is
 * deferred to Sprint 45.
 *
 * See: docs/security/CVE-REPORT-2026-04-19.md §CVE #2.
 */

const MAX_REDIRECT_LENGTH = 2048;

export function isSafeInternalRedirect(url: string | null | undefined): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  if (url.length > MAX_REDIRECT_LENGTH) return false;

  const trimmed = url.trim();
  if (trimmed.length === 0) return false;

  if (/^https?:\/\//i.test(trimmed)) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("\\")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false;

  if (!trimmed.startsWith("/")) return false;

  return true;
}

export function sanitizeCallbackUrl(
  url: string | null | undefined,
  fallback: string
): string {
  return isSafeInternalRedirect(url) ? (url as string) : fallback;
}
