import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, String(v)),
        key
      );
    }
    return key;
  },
}));

vi.mock("@/server/actions/profile.actions", () => ({
  updateProfileFieldAction: vi.fn().mockResolvedValue({ success: true, data: { pointsAwarded: 25 } }),
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { ProfileAccordion } from "@/components/features/profile/ProfileAccordion";

const emptyProfile = {
  birthDate: null,
  phone: null,
  country: null,
  city: null,
  address: null,
  passportNumber: null,
  passportExpiry: null,
  nationalId: null,
  bio: null,
  dietaryRestrictions: null,
  accessibility: null,
  completionScore: 0,
};

describe("ProfileAccordion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders profile completion progress bar", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    expect(screen.getByText("profileCompletion")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows 0% when all fields are empty", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders all 4 accordion sections", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    expect(screen.getByText("sections.personal")).toBeInTheDocument();
    expect(screen.getByText("sections.documents")).toBeInTheDocument();
    expect(screen.getByText("sections.about")).toBeInTheDocument();
    expect(screen.getByText("sections.preferences")).toBeInTheDocument();
  });

  it("expands section when clicking header", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    const personalBtn = screen.getByText("sections.personal");
    fireEvent.click(personalBtn);
    expect(screen.getByText("fields.birthDate")).toBeInTheDocument();
    expect(screen.getByText("fields.phone")).toBeInTheDocument();
  });

  it("collapses section when clicking again", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    const personalBtn = screen.getByText("sections.personal");
    fireEvent.click(personalBtn);
    expect(screen.getByText("fields.birthDate")).toBeInTheDocument();
    fireEvent.click(personalBtn);
    expect(screen.queryByText("fields.birthDate")).not.toBeInTheDocument();
  });

  it("only shows one section at a time", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    fireEvent.click(screen.getByText("sections.personal"));
    expect(screen.getByText("fields.birthDate")).toBeInTheDocument();

    fireEvent.click(screen.getByText("sections.documents"));
    expect(screen.queryByText("fields.birthDate")).not.toBeInTheDocument();
    expect(screen.getByText("fields.passportNumber")).toBeInTheDocument();
  });

  it("renders save buttons for each field", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    fireEvent.click(screen.getByText("sections.personal"));
    const saveButtons = screen.getAllByText("save");
    expect(saveButtons.length).toBeGreaterThan(0);
  });

  it("disables save button when field is empty", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    fireEvent.click(screen.getByText("sections.personal"));
    const saveButtons = screen.getAllByText("save");
    saveButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("pre-fills fields with existing profile data", () => {
    const profile = {
      ...emptyProfile,
      phone: "+5511999999999",
      country: "Brazil",
    };
    render(<ProfileAccordion profile={profile} />);
    fireEvent.click(screen.getByText("sections.personal"));

    const phoneInput = screen.getByLabelText("fields.phone") as HTMLInputElement;
    expect(phoneInput.value).toBe("+5511999999999");

    const countryInput = screen.getByLabelText("fields.country") as HTMLInputElement;
    expect(countryInput.value).toBe("Brazil");
  });

  it("calculates progress based on filled fields", () => {
    const profile = {
      ...emptyProfile,
      phone: "+5511999999999",
      country: "Brazil",
    };
    render(<ProfileAccordion profile={profile} />);
    // 2 of 11 fields = ~18%
    expect(screen.getByText("18%")).toBeInTheDocument();
  });

  it("shows fields completed count", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    expect(screen.getByText("fieldsCompleted")).toBeInTheDocument();
  });

  it("has aria-expanded on section buttons", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    const personalBtn = screen.getByText("sections.personal").closest("button");
    expect(personalBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(personalBtn!);
    expect(personalBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("renders textarea for bio field", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    fireEvent.click(screen.getByText("sections.about"));
    const bioField = screen.getByLabelText("fields.bio");
    expect(bioField.tagName.toLowerCase()).toBe("textarea");
  });
});
