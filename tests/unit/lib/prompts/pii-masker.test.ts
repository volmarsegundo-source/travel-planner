/**
 * Unit tests for PII masker (LGPD compliance).
 *
 * Covers: CPF, email, phone, credit card, passport detection and masking.
 * Also tests edge cases, false positives, and mixed PII scenarios.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLoggerWarn } = vi.hoisted(() => ({
  mockLoggerWarn: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: mockLoggerWarn,
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { maskPII } from "@/lib/prompts/pii-masker";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── No PII (pass-through) ─────────────────────────────────────────────────

describe("maskPII — no PII", () => {
  it("passes through normal travel text unchanged", () => {
    const text = "I want to visit museums and try local food in Paris";
    const result = maskPII(text, "travelNotes");
    expect(result.masked).toBe(text);
    expect(result.hasPII).toBe(false);
    expect(result.detectedTypes).toHaveLength(0);
  });

  it("passes through pt-BR travel text unchanged", () => {
    const text = "Quero conhecer praias e experimentar comida local";
    const result = maskPII(text, "travelNotes");
    expect(result.masked).toBe(text);
    expect(result.hasPII).toBe(false);
  });

  it("passes through empty string", () => {
    const result = maskPII("", "travelNotes");
    expect(result.masked).toBe("");
    expect(result.hasPII).toBe(false);
  });

  it("does not log when no PII is found", () => {
    maskPII("Normal travel notes", "travelNotes");
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });
});

// ─── CPF Detection ──────────────────────────────────────────────────────────

describe("maskPII — CPF", () => {
  it("masks CPF with dots and dash (XXX.XXX.XXX-XX)", () => {
    const result = maskPII("Meu CPF e 123.456.789-09", "travelNotes");
    expect(result.masked).toBe("Meu CPF e [CPF-REDACTED]");
    expect(result.hasPII).toBe(true);
    expect(result.detectedTypes).toContain("cpf");
  });

  it("masks CPF without separators (11 digits)", () => {
    const result = maskPII("CPF: 12345678909", "travelNotes");
    expect(result.masked).toBe("CPF: [CPF-REDACTED]");
    expect(result.detectedTypes).toContain("cpf");
  });

  it("masks CPF with spaces as separators", () => {
    const result = maskPII("CPF 123 456 789 09", "travelNotes");
    expect(result.masked).toBe("CPF [CPF-REDACTED]");
    expect(result.detectedTypes).toContain("cpf");
  });

  it("masks multiple CPFs in same text", () => {
    const result = maskPII(
      "CPFs: 123.456.789-09 e 987.654.321-00",
      "travelNotes"
    );
    expect(result.masked).toBe("CPFs: [CPF-REDACTED] e [CPF-REDACTED]");
  });
});

// ─── Email Detection ────────────────────────────────────────────────────────

describe("maskPII — Email", () => {
  it("masks standard email address", () => {
    const result = maskPII("Email: user@example.com", "travelNotes");
    expect(result.masked).toBe("Email: [EMAIL-REDACTED]");
    expect(result.detectedTypes).toContain("email");
  });

  it("masks email with dots and plus", () => {
    const result = maskPII("Contact: john.doe+travel@gmail.com", "travelNotes");
    expect(result.masked).toBe("Contact: [EMAIL-REDACTED]");
  });

  it("masks email with subdomain", () => {
    const result = maskPII("Send to user@mail.company.co.uk", "travelNotes");
    expect(result.masked).toBe("Send to [EMAIL-REDACTED]");
  });

  it("does not mask text that looks like an incomplete email", () => {
    const result = maskPII("Use @ symbol for emails", "travelNotes");
    expect(result.masked).toBe("Use @ symbol for emails");
    expect(result.hasPII).toBe(false);
  });
});

// ─── Phone Detection ────────────────────────────────────────────────────────

describe("maskPII — Phone", () => {
  it("masks Brazilian phone with country code +55 (XX) XXXXX-XXXX", () => {
    const result = maskPII("Fone: +55 (11) 98765-4321", "travelNotes");
    expect(result.masked).toBe("Fone: [PHONE-REDACTED]");
    expect(result.detectedTypes).toContain("phone");
  });

  it("masks Brazilian phone without country code (XX) XXXXX-XXXX", () => {
    const result = maskPII("Tel: (21) 99876-5432", "travelNotes");
    expect(result.masked).toBe("Tel: [PHONE-REDACTED]");
  });

  it("masks Brazilian phone with 8-digit local number", () => {
    const result = maskPII("Tel: (11) 3456-7890", "travelNotes");
    expect(result.masked).toBe("Tel: [PHONE-REDACTED]");
  });

  it("masks phone without parentheses", () => {
    const result = maskPII("Ligar: 11 98765-4321", "travelNotes");
    expect(result.masked).toBe("Ligar: [PHONE-REDACTED]");
  });
});

// ─── Credit Card Detection ──────────────────────────────────────────────────

describe("maskPII — Credit Card", () => {
  it("masks card number with spaces (XXXX XXXX XXXX XXXX)", () => {
    const result = maskPII("Card: 4111 1111 1111 1111", "travelNotes");
    expect(result.masked).toBe("Card: [CARD-REDACTED]");
    expect(result.detectedTypes).toContain("credit_card");
  });

  it("masks card number with dashes", () => {
    const result = maskPII("Pay with 5500-0000-0000-0004", "travelNotes");
    expect(result.masked).toBe("Pay with [CARD-REDACTED]");
  });

  it("masks card number without separators", () => {
    const result = maskPII("Card 4111111111111111", "travelNotes");
    expect(result.masked).toBe("Card [CARD-REDACTED]");
  });
});

// ─── Passport Detection ─────────────────────────────────────────────────────

describe("maskPII — Passport", () => {
  it("masks Brazilian passport (2 letters + 6 digits)", () => {
    const result = maskPII("Passport: BR123456", "travelNotes");
    expect(result.masked).toBe("Passport: [PASSPORT-REDACTED]");
    expect(result.detectedTypes).toContain("passport");
  });

  it("masks passport with 9 digits", () => {
    const result = maskPII("Document: AB123456789", "travelNotes");
    expect(result.masked).toBe("Document: [PASSPORT-REDACTED]");
  });

  it("does not mask lowercase letter combinations", () => {
    // Passport pattern requires uppercase letters
    const result = maskPII("Reference: ab123456", "travelNotes");
    expect(result.detectedTypes).not.toContain("passport");
  });
});

// ─── Mixed PII ──────────────────────────────────────────────────────────────

describe("maskPII — multiple PII types", () => {
  it("masks CPF and email in the same text", () => {
    const result = maskPII(
      "CPF: 123.456.789-09, email: user@test.com",
      "travelNotes"
    );
    expect(result.masked).toBe(
      "CPF: [CPF-REDACTED], email: [EMAIL-REDACTED]"
    );
    expect(result.detectedTypes).toContain("cpf");
    expect(result.detectedTypes).toContain("email");
    expect(result.hasPII).toBe(true);
  });

  it("masks phone and passport in the same text", () => {
    const result = maskPII(
      "Call (11) 98765-4321, passport BR123456",
      "travelNotes"
    );
    expect(result.masked).toContain("[PHONE-REDACTED]");
    expect(result.masked).toContain("[PASSPORT-REDACTED]");
    expect(result.detectedTypes).toContain("phone");
    expect(result.detectedTypes).toContain("passport");
  });

  it("detects all PII types and reports them", () => {
    const text =
      "CPF 12345678909, email user@test.com, phone (11) 98765-4321, " +
      "card 4111 1111 1111 1111, passport BR123456";
    const result = maskPII(text, "travelNotes");
    expect(result.detectedTypes.length).toBeGreaterThanOrEqual(4);
    expect(result.hasPII).toBe(true);
  });
});

// ─── Logging ────────────────────────────────────────────────────────────────

describe("maskPII — logging", () => {
  it("logs warning with context and detected types when PII found", () => {
    maskPII("CPF: 123.456.789-09", "travelNotes");
    expect(mockLoggerWarn).toHaveBeenCalledWith("ai.pii.detected", {
      context: "travelNotes",
      detectedTypes: "cpf",
      piiCount: 1,
    });
  });

  it("logs with multiple detected types joined", () => {
    maskPII("CPF 12345678909, email user@test.com", "travelNotes");
    expect(mockLoggerWarn).toHaveBeenCalledWith("ai.pii.detected", {
      context: "travelNotes",
      detectedTypes: "cpf, email",
      piiCount: 2,
    });
  });

  it("uses 'unknown' context when none provided", () => {
    maskPII("CPF: 123.456.789-09");
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      "ai.pii.detected",
      expect.objectContaining({ context: "unknown" })
    );
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe("maskPII — edge cases", () => {
  it("does not mask short numbers that are not CPF", () => {
    const result = maskPII("Flight 1234 from gate 56", "travelNotes");
    expect(result.masked).toBe("Flight 1234 from gate 56");
    expect(result.hasPII).toBe(false);
  });

  it("does not mask 5-digit zip codes", () => {
    const result = maskPII("CEP: 01310-100", "travelNotes");
    // CEP is 8 digits with dash — too short for CPF (11 digits)
    // Should not match CPF pattern
    expect(result.detectedTypes).not.toContain("cpf");
  });

  it("does not mask hotel room numbers", () => {
    const result = maskPII("Room 1405, floor 14", "travelNotes");
    expect(result.hasPII).toBe(false);
  });

  it("handles text with only whitespace", () => {
    const result = maskPII("   ", "travelNotes");
    expect(result.hasPII).toBe(false);
  });

  it("can be called multiple times without state leaking", () => {
    const result1 = maskPII("CPF: 123.456.789-09", "first");
    const result2 = maskPII("Normal travel text", "second");
    expect(result1.hasPII).toBe(true);
    expect(result2.hasPII).toBe(false);
  });
});
