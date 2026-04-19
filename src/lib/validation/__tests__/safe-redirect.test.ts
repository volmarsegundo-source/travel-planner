import { describe, it, expect } from "vitest";
import {
  isSafeInternalRedirect,
  sanitizeCallbackUrl,
} from "@/lib/validation/safe-redirect";

describe("isSafeInternalRedirect", () => {
  it.each([
    ["/expeditions", true],
    ["/auth/login", true],
    ["/pt/auth/complete-profile", true],
    ["/expeditions?utm=test", true],
    ["/", true],
  ])("accepts internal path %s", (url, expected) => {
    expect(isSafeInternalRedirect(url)).toBe(expected);
  });

  it.each([
    "https://evil.com",
    "http://evil.com/phishing",
    "HTTPS://evil.com",
    "//evil.com",
    "//evil.com/atlas",
    "\\\\evil.com\\atlas",
    "javascript:alert(1)",
    "data:text/html,<script>",
    "file:///etc/passwd",
    "vbscript:msgbox(1)",
    "expeditions",
    "",
    " ",
    "   ",
  ])("rejects %s", (url) => {
    expect(isSafeInternalRedirect(url)).toBe(false);
  });

  it("rejects null/undefined/non-string inputs", () => {
    expect(isSafeInternalRedirect(null)).toBe(false);
    expect(isSafeInternalRedirect(undefined)).toBe(false);
    expect(isSafeInternalRedirect(123 as unknown as string)).toBe(false);
  });

  it("rejects oversized URLs (>2048 chars)", () => {
    const longUrl = "/" + "a".repeat(2049);
    expect(isSafeInternalRedirect(longUrl)).toBe(false);
  });
});

describe("sanitizeCallbackUrl", () => {
  it("returns the url when it is safe", () => {
    expect(sanitizeCallbackUrl("/expeditions", "/")).toBe("/expeditions");
  });

  it("returns fallback when url is external", () => {
    expect(sanitizeCallbackUrl("https://evil.com", "/expeditions")).toBe(
      "/expeditions"
    );
  });

  it("returns fallback when url is null/undefined", () => {
    expect(sanitizeCallbackUrl(null, "/home")).toBe("/home");
    expect(sanitizeCallbackUrl(undefined, "/home")).toBe("/home");
  });

  it("returns fallback when url is empty", () => {
    expect(sanitizeCallbackUrl("", "/home")).toBe("/home");
  });
});
