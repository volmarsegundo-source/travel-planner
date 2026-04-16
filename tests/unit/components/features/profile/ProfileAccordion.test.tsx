import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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
  useLocale: () => "pt-BR",
}));

const updateProfileFieldActionMock = vi.fn();

vi.mock("@/server/actions/profile.actions", () => ({
  updateProfileFieldAction: (...args: unknown[]) =>
    updateProfileFieldActionMock(...args),
}));

// DestinationAutocomplete does a `fetch` on input change; stub it.
const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results: [], provider: null }),
  }) as unknown as typeof fetch;
  updateProfileFieldActionMock.mockReset();
  updateProfileFieldActionMock.mockResolvedValue({
    success: true,
    data: { pointsAwarded: 25 },
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { afterEach } from "vitest";
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

  it("renders a single location autocomplete field instead of country/city", () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    fireEvent.click(screen.getByText("sections.personal"));
    expect(screen.getByText("fields.location")).toBeInTheDocument();
    expect(screen.queryByText("fields.country")).not.toBeInTheDocument();
    expect(screen.queryByText("fields.city")).not.toBeInTheDocument();
    expect(screen.getByTestId("destination-autocomplete")).toBeInTheDocument();
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

  it("pre-fills location input with saved city and country", () => {
    const profile = {
      ...emptyProfile,
      phone: "+5511999999999",
      country: "Brazil",
      city: "São Paulo",
    };
    render(<ProfileAccordion profile={profile} />);
    fireEvent.click(screen.getByText("sections.personal"));

    const phoneInput = screen.getByLabelText("fields.phone") as HTMLInputElement;
    expect(phoneInput.value).toBe("+5511999999999");

    const locationInput = screen.getByLabelText("fields.location") as HTMLInputElement;
    expect(locationInput.value).toBe("São Paulo, Brazil");
  });

  it("calculates progress based on filled fields", () => {
    const profile = {
      ...emptyProfile,
      phone: "+5511999999999",
      country: "Brazil",
    };
    render(<ProfileAccordion profile={profile} />);
    // 2 of 11 persisted fields = ~18%
    expect(screen.getByText("18%")).toBeInTheDocument();
  });

  it("counts city and country separately in progress even behind one autocomplete", () => {
    const profile = {
      ...emptyProfile,
      country: "France",
      city: "Paris",
    };
    render(<ProfileAccordion profile={profile} />);
    // 2 of 11 persisted fields = ~18%
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

  it("saving a free-text location parses 'City, Country' into separate fields", async () => {
    render(<ProfileAccordion profile={emptyProfile} />);
    fireEvent.click(screen.getByText("sections.personal"));

    const locationInput = screen.getByLabelText("fields.location") as HTMLInputElement;
    fireEvent.change(locationInput, { target: { value: "Lisboa, Portugal" } });

    // Find the save button next to the location input (first button after input)
    const saveButtons = screen.getAllByText("save");
    // Location is the 3rd field in personal section (birthDate, phone, location, address)
    const locationSaveBtn = saveButtons[2];
    fireEvent.click(locationSaveBtn);

    await waitFor(() => {
      expect(updateProfileFieldActionMock).toHaveBeenCalledWith("city", "Lisboa");
      expect(updateProfileFieldActionMock).toHaveBeenCalledWith("country", "Portugal");
    });
  });
});
