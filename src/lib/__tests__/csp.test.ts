import { describe, it, expect } from "vitest";
import {
  buildCsp,
  applySecurityHeaders,
  propagateNonceToRequest,
} from "../csp";

// SPEC-SEC-CSP-NONCE-001 — CSP nonce propagation regression tests.
// See docs/qa/google-oauth-dob-bug-2026-04-20.md §12 for the bug history.

const NONCE = "00000000-0000-4000-8000-000000000000";

describe("buildCsp", () => {
  it("includes the nonce in script-src in development", () => {
    const csp = buildCsp(NONCE, { isDev: true, isPreview: false });
    expect(csp).toContain(`'nonce-${NONCE}'`);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("'unsafe-eval'"); // dev needs eval for react-refresh
  });

  it("includes 'strict-dynamic' in production but not in dev", () => {
    const prodCsp = buildCsp(NONCE, { isDev: false, isPreview: false });
    const devCsp = buildCsp(NONCE, { isDev: true, isPreview: false });
    expect(prodCsp).toContain("'strict-dynamic'");
    expect(devCsp).not.toContain("'strict-dynamic'");
  });

  it("includes Vercel Live allowlist only on preview deployments", () => {
    const previewCsp = buildCsp(NONCE, { isDev: false, isPreview: true });
    const prodCsp = buildCsp(NONCE, { isDev: false, isPreview: false });

    expect(previewCsp).toContain("https://vercel.live");
    expect(previewCsp).toContain("wss://ws-us3.pusher.com");
    expect(prodCsp).not.toContain("vercel.live");
    expect(prodCsp).not.toContain("pusher.com");
  });

  it("emits HSTS-compatible production policy (no 'unsafe-eval' in script-src)", () => {
    const csp = buildCsp(NONCE, { isDev: false, isPreview: false });
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("always sets default-src 'self'", () => {
    expect(buildCsp(NONCE, { isDev: true, isPreview: false })).toContain(
      "default-src 'self'",
    );
    expect(buildCsp(NONCE, { isDev: false, isPreview: false })).toContain(
      "default-src 'self'",
    );
    expect(buildCsp(NONCE, { isDev: false, isPreview: true })).toContain(
      "default-src 'self'",
    );
  });

  it("produces a different CSP when the nonce changes (proves per-request nonce)", () => {
    const a = buildCsp("nonce-a", { isDev: false, isPreview: false });
    const b = buildCsp("nonce-b", { isDev: false, isPreview: false });
    expect(a).not.toBe(b);
    expect(a).toContain("'nonce-nonce-a'");
    expect(b).toContain("'nonce-nonce-b'");
  });
});

describe("applySecurityHeaders", () => {
  it("sets the provided CSP string on the response headers", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, "test-csp-value", { isDev: false });
    expect(headers.get("Content-Security-Policy")).toBe("test-csp-value");
  });

  it("sets the baseline security headers on every response", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, "csp", { isDev: false });
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });

  it("adds HSTS only outside dev", () => {
    const prod = new Headers();
    applySecurityHeaders(prod, "csp", { isDev: false });
    expect(prod.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );

    const dev = new Headers();
    applySecurityHeaders(dev, "csp", { isDev: true });
    expect(dev.get("Strict-Transport-Security")).toBeNull();
  });
});

describe("propagateNonceToRequest", () => {
  // SPEC-SEC-CSP-NONCE-001 §Scenario: when intlMiddleware returns a rewrite,
  // we cannot use NextResponse.next({ request }). The fallback is Next.js's
  // internal sentinel-header convention.
  it("sets x-middleware-request-x-nonce with the nonce value", () => {
    const headers = new Headers();
    propagateNonceToRequest(headers, NONCE);
    expect(headers.get("x-middleware-request-x-nonce")).toBe(NONCE);
  });

  it("sets x-middleware-override-headers to 'x-nonce' when previously empty", () => {
    const headers = new Headers();
    propagateNonceToRequest(headers, NONCE);
    expect(headers.get("x-middleware-override-headers")).toBe("x-nonce");
  });

  it("appends x-nonce to an existing override list without dropping entries", () => {
    const headers = new Headers();
    headers.set("x-middleware-override-headers", "x-foo,x-bar");
    propagateNonceToRequest(headers, NONCE);
    expect(headers.get("x-middleware-override-headers")).toBe(
      "x-foo,x-bar,x-nonce",
    );
  });
});
