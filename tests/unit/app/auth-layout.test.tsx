/**
 * Unit tests for the auth layout.
 *
 * Sprint 40: Auth layout is now a passthrough wrapper.
 * LoginFormV2 and RegisterForm handle their own full-page layout.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import AuthLayout from "@/app/[locale]/auth/layout";

describe("AuthLayout", () => {
  it("renders children content directly (passthrough)", () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Login form here</div>
      </AuthLayout>
    );

    expect(screen.getByTestId("auth-content")).toBeInTheDocument();
    expect(screen.getByText("Login form here")).toBeInTheDocument();
  });

  it("does not wrap children in V1 card container", () => {
    render(
      <AuthLayout>
        <div data-testid="auth-content">Test</div>
      </AuthLayout>
    );

    // V1 layout had a max-w-md card wrapper — should NOT exist now
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});
