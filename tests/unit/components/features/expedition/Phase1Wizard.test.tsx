/**
 * Unit tests for Phase1Wizard component.
 *
 * Tests cover: bio display in confirmation step (T-S19-005),
 * step navigation, and form submission.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!values) return fullKey;
      const suffix = Object.values(values).join(",");
      return `${fullKey}[${suffix}]`;
    },
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  Link: ({ children, ...props }: Record<string, unknown>) => (
    <a {...props}>{children as React.ReactNode}</a>
  ),
}));

vi.mock("@/server/actions/expedition.actions", () => ({
  createExpeditionAction: vi.fn(),
}));

vi.mock("@/lib/travel/trip-classifier", () => ({
  classifyTrip: vi.fn().mockReturnValue(null),
}));

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { Phase1Wizard } from "@/components/features/expedition/Phase1Wizard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function navigateToStep4WithBio(bio: string) {
  render(<Phase1Wizard />);

  // Step 1: enter destination
  const destinationInput = screen.getByRole("combobox");
  fireEvent.change(destinationInput, { target: { value: "Paris, France" } });
  fireEvent.click(screen.getByText("common.next"));

  // Step 2: skip dates, click next
  fireEvent.click(screen.getByText("common.next"));

  // Step 3: enter bio
  const bioTextarea = screen.getByLabelText("expedition.phase1.step3.bio");
  fireEvent.change(bioTextarea, { target: { value: bio } });
  fireEvent.click(screen.getByText("common.next"));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase1Wizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Step 4 confirmation — bio display (T-S19-005)", () => {
    it("shows bio in confirmation when bio is filled", () => {
      navigateToStep4WithBio("I love exploring new cities.");

      // Bio label should be visible
      expect(screen.getByText("expedition.phase1.step4.bio")).toBeInTheDocument();
      // Bio content should be visible
      expect(screen.getByText("I love exploring new cities.")).toBeInTheDocument();
    });

    it("does not show bio section when bio is empty", () => {
      render(<Phase1Wizard />);

      // Step 1: destination
      const destinationInput = screen.getByRole("combobox");
      fireEvent.change(destinationInput, { target: { value: "Paris" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: next
      fireEvent.click(screen.getByText("common.next"));

      // Step 3: skip bio, click next
      fireEvent.click(screen.getByText("common.next"));

      // Bio label should NOT be visible (no profile section since nothing filled)
      expect(screen.queryByText("expedition.phase1.step4.bio")).not.toBeInTheDocument();
    });

    it("truncates bio to 100 characters with ellipsis when longer", () => {
      const longBio = "A".repeat(120);
      navigateToStep4WithBio(longBio);

      // Should show truncated version
      const expectedTruncated = "A".repeat(100) + "...";
      expect(screen.getByText(expectedTruncated)).toBeInTheDocument();
    });

    it("shows bio alongside other profile fields when both are filled", () => {
      render(<Phase1Wizard />);

      // Step 1: destination
      const destinationInput = screen.getByRole("combobox");
      fireEvent.change(destinationInput, { target: { value: "Tokyo" } });
      fireEvent.click(screen.getByText("common.next"));

      // Step 2: next
      fireEvent.click(screen.getByText("common.next"));

      // Step 3: fill phone and bio
      const phoneInput = screen.getByLabelText("expedition.phase1.step3.phone");
      fireEvent.change(phoneInput, { target: { value: "+5511999999999" } });
      const bioTextarea = screen.getByLabelText("expedition.phase1.step3.bio");
      fireEvent.change(bioTextarea, { target: { value: "Travel enthusiast" } });
      fireEvent.click(screen.getByText("common.next"));

      // Both should be visible
      expect(screen.getByText("expedition.phase1.step4.profileSummary")).toBeInTheDocument();
      expect(screen.getByText("+5511999999999")).toBeInTheDocument();
      expect(screen.getByText("Travel enthusiast")).toBeInTheDocument();
    });

    it("shows profile section when only bio is filled", () => {
      navigateToStep4WithBio("Just bio, nothing else.");

      // Profile summary header should be visible since bio triggers the section
      expect(screen.getByText("expedition.phase1.step4.profileSummary")).toBeInTheDocument();
      expect(screen.getByText("Just bio, nothing else.")).toBeInTheDocument();
    });
  });
});
