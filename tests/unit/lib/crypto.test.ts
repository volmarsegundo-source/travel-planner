import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Use dynamic import to ensure env is read after we set it
let encrypt: (plaintext: string) => string;
let decrypt: (ciphertext: string) => string;

const VALID_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const OTHER_KEY =
  "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

describe("crypto", () => {
  beforeEach(async () => {
    process.env.ENCRYPTION_KEY = VALID_KEY;
    // Re-import to pick up fresh env
    vi.resetModules();
    const mod = await import("@/lib/crypto");
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
  });

  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  // ─── Round-trip ───────────────────────────────────────────────────────

  it("encrypt/decrypt round-trip returns original text", () => {
    const text = "Hello, World!";
    expect(decrypt(encrypt(text))).toBe(text);
  });

  it("encrypt produces different ciphertext each call (random IV)", () => {
    const text = "same input";
    const a = encrypt(text);
    const b = encrypt(text);
    expect(a).not.toBe(b);
    // Both decrypt to the same value
    expect(decrypt(a)).toBe(text);
    expect(decrypt(b)).toBe(text);
  });

  it("works with empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("works with Unicode text", () => {
    const text = "日本語テスト 🌍 àéîõü";
    expect(decrypt(encrypt(text))).toBe(text);
  });

  it("works with long text (>1KB)", () => {
    const text = "A".repeat(2000);
    expect(decrypt(encrypt(text))).toBe(text);
  });

  // ─── Integrity ────────────────────────────────────────────────────────

  it("decrypt with wrong key throws", async () => {
    const ciphertext = encrypt("secret");
    // Re-import with different key
    process.env.ENCRYPTION_KEY = OTHER_KEY;
    vi.resetModules();
    const mod2 = await import("@/lib/crypto");
    expect(() => mod2.decrypt(ciphertext)).toThrow();
  });

  it("decrypt with tampered ciphertext throws", () => {
    const ciphertext = encrypt("secret");
    const buf = Buffer.from(ciphertext, "base64");
    // Tamper a byte in the encrypted data portion (after IV, before authTag)
    buf[13] = buf[13] ^ 0xff;
    const tampered = buf.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("decrypt with tampered auth tag throws", () => {
    const ciphertext = encrypt("secret");
    const buf = Buffer.from(ciphertext, "base64");
    // Tamper last byte (auth tag)
    buf[buf.length - 1] = buf[buf.length - 1] ^ 0xff;
    const tampered = buf.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });

  // ─── getKey validation ────────────────────────────────────────────────

  it("throws when ENCRYPTION_KEY is missing", async () => {
    delete process.env.ENCRYPTION_KEY;
    vi.resetModules();
    const mod = await import("@/lib/crypto");
    expect(() => mod.encrypt("test")).toThrow("not set");
  });

  it("throws when ENCRYPTION_KEY has wrong length", async () => {
    process.env.ENCRYPTION_KEY = "abcdef1234";
    vi.resetModules();
    const mod = await import("@/lib/crypto");
    expect(() => mod.encrypt("test")).toThrow("64 hex chars");
  });

  it("throws when ENCRYPTION_KEY is not valid hex", async () => {
    process.env.ENCRYPTION_KEY = "g".repeat(64);
    vi.resetModules();
    const mod = await import("@/lib/crypto");
    expect(() => mod.encrypt("test")).toThrow("hex characters");
  });

  it("encrypt returns a base64 string", () => {
    const result = encrypt("test");
    expect(() => Buffer.from(result, "base64")).not.toThrow();
    // Must be non-empty
    expect(result.length).toBeGreaterThan(0);
  });
});
