import { describe, it, expect } from "vitest";
import { renderPasswordResetEmail } from "../templates/password-reset";

describe("renderPasswordResetEmail — SPEC-AUTH-FORGOTPW-001", () => {
  const resetUrl = "https://atlas.app/auth/reset-password?token=abc123";

  it("renders English subject and bodies with the reset URL embedded", () => {
    const out = renderPasswordResetEmail({ resetUrl, locale: "en" });
    expect(out.subject.toLowerCase()).toContain("password");
    expect(out.text).toContain(resetUrl);
    expect(out.html).toContain(resetUrl);
    expect(out.text).toMatch(/if you did not request/i);
  });

  it("renders Portuguese subject and bodies", () => {
    const out = renderPasswordResetEmail({ resetUrl, locale: "pt-BR" });
    expect(out.subject.toLowerCase()).toMatch(/senha/);
    expect(out.text).toContain(resetUrl);
    expect(out.html).toContain(resetUrl);
    expect(out.text.toLowerCase()).toMatch(/não solicitou|nao solicitou/);
  });

  it("falls back to English for unknown locales", () => {
    const out = renderPasswordResetEmail({
      resetUrl,
      locale: "fr",
    });
    expect(out.subject.toLowerCase()).toContain("password");
  });

  it("HTML body includes an anchor tag whose href is the reset URL", () => {
    const out = renderPasswordResetEmail({ resetUrl, locale: "en" });
    expect(out.html).toMatch(new RegExp(`<a [^>]*href="${resetUrl.replace(/\?/g, "\\?")}"`));
  });
});
