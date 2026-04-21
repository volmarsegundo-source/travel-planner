import { describe, it, expect } from "vitest";
import { getClientIp } from "../get-client-ip";

describe("getClientIp (SPEC-SEC-XFF-001)", () => {
  it("returns the single IP when x-forwarded-for contains one entry", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIp(h)).toBe("1.2.3.4");
  });

  it("returns the leftmost IP when x-forwarded-for contains a chain", () => {
    const h = new Headers({
      "x-forwarded-for": "200.150.100.50, 76.76.21.9, 10.0.0.1",
    });
    expect(getClientIp(h)).toBe("200.150.100.50");
  });

  it("trims surrounding whitespace from the leftmost entry", () => {
    const h = new Headers({ "x-forwarded-for": "  10.0.0.1  , 76.76.21.9" });
    expect(getClientIp(h)).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", () => {
    const h = new Headers({ "x-real-ip": "4.3.2.1" });
    expect(getClientIp(h)).toBe("4.3.2.1");
  });

  it("trims whitespace from x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "  5.5.5.5  " });
    expect(getClientIp(h)).toBe("5.5.5.5");
  });

  it("prefers x-forwarded-for over x-real-ip when both present", () => {
    const h = new Headers({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      "x-real-ip": "9.9.9.9",
    });
    expect(getClientIp(h)).toBe("1.1.1.1");
  });

  it("returns 'unknown' when neither header is present", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });

  it("returns 'unknown' when x-forwarded-for is empty string", () => {
    const h = new Headers({ "x-forwarded-for": "" });
    expect(getClientIp(h)).toBe("unknown");
  });

  it("falls back to x-real-ip when x-forwarded-for has only whitespace", () => {
    const h = new Headers({
      "x-forwarded-for": "   ",
      "x-real-ip": "7.7.7.7",
    });
    expect(getClientIp(h)).toBe("7.7.7.7");
  });

  it("returns 'unknown' when both headers are blank/whitespace", () => {
    const h = new Headers({ "x-forwarded-for": "  ", "x-real-ip": "   " });
    expect(getClientIp(h)).toBe("unknown");
  });

  it("regression: rotating edge IP tail does NOT change the key", () => {
    const h1 = new Headers({
      "x-forwarded-for": "200.150.100.50, 76.76.21.9",
    });
    const h2 = new Headers({
      "x-forwarded-for": "200.150.100.50, 76.76.21.14",
    });
    expect(getClientIp(h1)).toBe(getClientIp(h2));
    expect(getClientIp(h1)).toBe("200.150.100.50");
  });
});
