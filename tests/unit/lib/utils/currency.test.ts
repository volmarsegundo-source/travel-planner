/**
 * Unit tests for currency utilities (T-S19-011).
 *
 * Tests cover: getDefaultCurrency locale mapping, formatCurrency
 * output for different locales and currencies.
 */
import { describe, it, expect } from "vitest";
import {
  getDefaultCurrency,
  formatCurrency,
} from "@/lib/utils/currency";

describe("getDefaultCurrency", () => {
  it("returns BRL for pt-BR locale", () => {
    expect(getDefaultCurrency("pt-BR")).toBe("BRL");
  });

  it("returns USD for en locale", () => {
    expect(getDefaultCurrency("en")).toBe("USD");
  });

  it("returns USD as fallback for unknown locale", () => {
    expect(getDefaultCurrency("fr")).toBe("USD");
    expect(getDefaultCurrency("de")).toBe("USD");
    expect(getDefaultCurrency("")).toBe("USD");
  });
});

describe("formatCurrency", () => {
  it("formats BRL for pt-BR locale", () => {
    const result = formatCurrency(1500, "BRL", "pt-BR");
    // Intl.NumberFormat for pt-BR + BRL produces "R$\u00a01.500" or similar
    expect(result).toContain("R$");
    expect(result).toContain("1.500");
  });

  it("formats USD for en locale", () => {
    const result = formatCurrency(1500, "USD", "en");
    expect(result).toContain("$");
    expect(result).toContain("1,500");
  });

  it("formats EUR for en locale", () => {
    const result = formatCurrency(2000, "EUR", "en");
    // Contains euro sign
    expect(result).toMatch(/€/);
    expect(result).toContain("2,000");
  });

  it("handles zero value", () => {
    const result = formatCurrency(0, "USD", "en");
    expect(result).toContain("$");
    expect(result).toContain("0");
  });

  it("handles decimal values", () => {
    const result = formatCurrency(99.99, "USD", "en");
    expect(result).toContain("$");
    expect(result).toContain("99.99");
  });

  it("omits trailing zeros for whole numbers", () => {
    const result = formatCurrency(1000, "USD", "en");
    // minimumFractionDigits: 0 means no ".00" suffix
    expect(result).not.toContain(".00");
  });
});
