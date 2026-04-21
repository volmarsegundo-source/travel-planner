/**
 * SPEC-SEC-XFF-001 — Extract the original client IP from request headers.
 *
 * Vercel / Cloudflare / most reverse proxies forward the original client IP in
 * `x-forwarded-for` as a comma-separated list: "clientIp, proxy1, proxy2".
 * The leftmost entry is the true client; everything after is intermediate hops
 * and can rotate per request. Using the raw header string as a rate-limit key
 * allows bypass (see SPEC-AUTH-FORGOTPW-003 Test 11a regression).
 *
 * Order of precedence: x-forwarded-for[0] → x-real-ip → "unknown".
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const firstIp = xff.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) {
    const trimmed = xRealIp.trim();
    if (trimmed) return trimmed;
  }
  return "unknown";
}
