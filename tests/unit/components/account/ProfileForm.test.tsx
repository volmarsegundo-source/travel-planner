/**
 * Behavior tests for ProfileForm.
 *
 * Tests cover: rendering all sections, name editing with validation,
 * email read-only display, locale selection, form submission with success/error
 * feedback, and avatar initials.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Hoist mocks ──────────────────────────────────────────────────────────────

const { mockRouterPush, mockRouterRefresh, mockUpdateProfile } = vi.hoisted(
  () => ({
    mockRouterPush: vi.fn(),
    mockRouterRefresh: vi.fn(),
    mockUpdateProfile: vi.fn(),
  })
);

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, refresh: mockRouterRefresh }),
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    return (key: string, params?: Record<string, string | number>) => {
      let result = `${namespace}.${key}`;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
      }
      return result;
    };
  },
}));

vi.mock("@/server/actions/account.actions", () => ({
  updateUserProfileAction: mockUpdateProfile,
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { ProfileForm } from "@/components/features/account/ProfileForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  userName: "Alice Johnson",
  userEmail: "alice@example.com",
  preferredLocale: "en",
};

function renderForm(props = {}) {
  return render(<ProfileForm {...DEFAULT_PROPS} {...props} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({
      success: true,
      data: {
        id: "user-1",
        name: "Alice Johnson",
        email: "alice@example.com",
        preferredLocale: "en",
      },
    });
  });

  // ─── Rendering ────────────────────────────────────────────────────────────

  it("renders the personal info section heading", () => {
    renderForm();

    expect(
      screen.getByRole("heading", { name: "account.personalInfo" })
    ).toBeInTheDocument();
  });

  it("renders the preferences section heading", () => {
    renderForm();

    expect(
      screen.getByRole("heading", { name: "account.preferences" })
    ).toBeInTheDocument();
  });

  it("renders the name input with the user name", () => {
    renderForm();

    const nameInput = screen.getByLabelText("account.name");
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveValue("Alice Johnson");
  });

  it("renders the email input as disabled and read-only", () => {
    renderForm();

    const emailInput = screen.getByLabelText("account.email");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveValue("alice@example.com");
    expect(emailInput).toBeDisabled();
  });

  it("shows the email read-only hint text", () => {
    renderForm();

    expect(screen.getByText("account.emailReadOnly")).toBeInTheDocument();
  });

  it("renders the locale select with the correct value", () => {
    renderForm();

    const localeSelect = screen.getByLabelText("account.preferredLocale");
    expect(localeSelect).toBeInTheDocument();
    expect(localeSelect).toHaveValue("en");
  });

  it("renders the submit button", () => {
    renderForm();

    expect(
      screen.getByRole("button", { name: "account.saveChanges" })
    ).toBeInTheDocument();
  });

  it("renders avatar initials from the user name", () => {
    renderForm();

    // The initials span has aria-hidden, so query by text
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  // ─── Name validation ─────────────────────────────────────────────────────

  it("shows error when name is too short", async () => {
    renderForm();

    const nameInput = screen.getByLabelText("account.name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "A");

    const submitButton = screen.getByRole("button", {
      name: "account.saveChanges",
    });
    await userEvent.click(submitButton);

    expect(screen.getByText("account.errors.nameTooShort")).toBeInTheDocument();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it("shows error when name is empty", async () => {
    renderForm();

    const nameInput = screen.getByLabelText("account.name");
    await userEvent.clear(nameInput);

    const submitButton = screen.getByRole("button", {
      name: "account.saveChanges",
    });
    await userEvent.click(submitButton);

    expect(screen.getByText("account.errors.nameTooShort")).toBeInTheDocument();
  });

  it("clears validation error when user starts typing", async () => {
    renderForm();

    const nameInput = screen.getByLabelText("account.name");
    await userEvent.clear(nameInput);

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    expect(screen.getByText("account.errors.nameTooShort")).toBeInTheDocument();

    await userEvent.type(nameInput, "Bo");

    expect(
      screen.queryByText("account.errors.nameTooShort")
    ).not.toBeInTheDocument();
  });

  // ─── Successful submission ────────────────────────────────────────────────

  it("calls updateUserProfileAction with name and locale", async () => {
    renderForm();

    const nameInput = screen.getByLabelText("account.name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Bob Smith");

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: "Bob Smith",
        preferredLocale: "en",
      });
    });
  });

  it("shows success message after successful save", async () => {
    renderForm();

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    await waitFor(() => {
      expect(screen.getByText("account.profileUpdated")).toBeInTheDocument();
    });
  });

  it("calls router.refresh after successful save", async () => {
    renderForm();

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────────

  it("shows error message when server returns failure", async () => {
    mockUpdateProfile.mockResolvedValue({
      success: false,
      error: "account.errors.nameTooShort",
    });

    renderForm();

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("account.errors.nameTooShort")
      ).toBeInTheDocument();
    });
  });

  it("shows generic error message on unexpected server error key", async () => {
    mockUpdateProfile.mockResolvedValue({
      success: false,
      error: "some.unknown.error",
    });

    renderForm();

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    await waitFor(() => {
      expect(screen.getByText("common.error")).toBeInTheDocument();
    });
  });

  it("shows generic error message when action throws", async () => {
    mockUpdateProfile.mockRejectedValue(new Error("Network error"));

    renderForm();

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    await waitFor(() => {
      expect(screen.getByText("common.error")).toBeInTheDocument();
    });
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it("disables submit button while saving", async () => {
    // Make the action hang so we can check the disabled state
    mockUpdateProfile.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    renderForm();

    const submitButton = screen.getByRole("button", {
      name: "account.saveChanges",
    });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent("common.loading");
    });
  });

  // ─── Locale selection ─────────────────────────────────────────────────────

  it("sends selected locale when changed", async () => {
    renderForm();

    const localeSelect = screen.getByLabelText("account.preferredLocale");
    await userEvent.selectOptions(localeSelect, "pt-BR");

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: "Alice Johnson",
        preferredLocale: "pt-BR",
      });
    });
  });

  // ─── Accessibility ────────────────────────────────────────────────────────

  it("sets aria-invalid on name input when there is an error", async () => {
    renderForm();

    const nameInput = screen.getByLabelText("account.name");
    await userEvent.clear(nameInput);

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    expect(nameInput).toHaveAttribute("aria-invalid", "true");
  });

  it("has aria-describedby linking name input to error message", async () => {
    renderForm();

    const nameInput = screen.getByLabelText("account.name");
    await userEvent.clear(nameInput);

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    expect(nameInput).toHaveAttribute("aria-describedby", "name-error");
    expect(screen.getByText("account.errors.nameTooShort")).toHaveAttribute(
      "id",
      "name-error"
    );
  });

  it("shows feedback message with role=status for screen readers", async () => {
    renderForm();

    await userEvent.click(
      screen.getByRole("button", { name: "account.saveChanges" })
    );

    await waitFor(() => {
      const statusEl = screen.getByRole("status");
      expect(statusEl).toHaveTextContent("account.profileUpdated");
    });
  });
});
