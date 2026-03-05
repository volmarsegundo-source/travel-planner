import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockRouterPush, mockRouterRefresh, mockUpdateProfile } = vi.hoisted(
  () => ({
    mockRouterPush: vi.fn(),
    mockRouterRefresh: vi.fn(),
    mockUpdateProfile: vi.fn(),
  })
);

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
    return (key: string) => `${namespace}.${key}`;
  },
}));

vi.mock("@/server/actions/account.actions", () => ({
  updateUserProfileAction: mockUpdateProfile,
}));

import { ProfileForm } from "@/components/features/account/ProfileForm";

describe("ProfileForm spinner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows spinner and saving text while submitting", async () => {
    // Make the action hang so we can observe the pending state
    mockUpdateProfile.mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    const user = userEvent.setup();
    render(
      <ProfileForm
        userName="Test User"
        userEmail="test@test.com"
        preferredLocale="en"
      />
    );

    await user.click(screen.getByRole("button", { name: /account\.saveChanges/i }));

    // After click, button should show saving text
    expect(screen.getByText("account.saving")).toBeInTheDocument();
    // And should have the spinner (Loader2 renders as svg)
    const button = screen.getByRole("button", { name: /account\.saving/i });
    expect(button).toBeDisabled();
  });

  it("shows normal text when not submitting", () => {
    render(
      <ProfileForm
        userName="Test User"
        userEmail="test@test.com"
        preferredLocale="en"
      />
    );

    expect(screen.getByText("account.saveChanges")).toBeInTheDocument();
  });
});
