/**
 * Unit tests for Phase6Wizard component (T-S18-008, T-S19-001a).
 *
 * Tests cover:
 * - Auto-generation on first visit
 * - Generating state: shows progress UI (NOT raw JSON) and cancel button
 * - Generated state: renders ItineraryEditor + AI disclaimer
 * - Error handling for various HTTP status codes
 * - Regenerate with confirm dialog
 * - Progress message transitions
 * - Day count display from streaming
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

// ─── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockPush, mockRefresh } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/server/actions/expedition.actions", () => ({
  completeExpeditionAction: vi.fn().mockResolvedValue({ pointsEarned: 500, badgeAwarded: "treasurer" }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params && "count" in params) return `${key}:${params.count}`;
    return key;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  Link: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Mock ItineraryEditor to avoid DnD complexity
vi.mock("@/components/features/itinerary/ItineraryEditor", () => ({
  ItineraryEditor: ({
    tripId,
    initialDays,
  }: {
    tripId: string;
    initialDays: unknown[];
  }) => (
    <div data-testid="itinerary-editor" data-trip-id={tripId}>
      {initialDays.length} days
    </div>
  ),
}));

// ─── Import SUT ──────────────────────────────────────────────────────────────

import { Phase6Wizard } from "@/components/features/expedition/Phase6Wizard";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const BASE_PROPS = {
  tripId: "trip-1",
  destination: "Paris, France",
  locale: "en",
  startDate: "2026-06-01",
  endDate: "2026-06-05",
  initialDays: [],
};

const DAYS_WITH_ACTIVITIES = [
  {
    id: "day-1",
    tripId: "trip-1",
    dayNumber: 1,
    date: new Date("2026-06-01"),
    notes: "Arrival",
    createdAt: new Date(),
    updatedAt: new Date(),
    activities: [
      {
        id: "act-1",
        dayId: "day-1",
        title: "Visit Eiffel Tower",
        notes: "Morning visit",
        startTime: "10:00",
        endTime: "12:00",
        orderIndex: 0,
        activityType: "SIGHTSEEING",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

function mockFetchOk(chunks: string[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    body: createSSEStream(chunks),
  });
}

function mockFetchError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
  });
}

function mockFetchHang() {
  return vi.fn().mockReturnValue(new Promise(() => {}));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Phase6Wizard", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    originalFetch = globalThis.fetch;
    // Default: make fetch hang to prevent auto-generation from completing
    globalThis.fetch = mockFetchHang();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  describe("Auto-generation on first visit", () => {
    it("triggers generation automatically when initialDays is empty", async () => {
      const fetchMock = mockFetchHang();
      globalThis.fetch = fetchMock;

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      // Should have called fetch (auto-triggered)
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/ai/plan/stream",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("does not auto-trigger when initialDays has content", () => {
      const fetchMock = mockFetchHang();
      globalThis.fetch = fetchMock;

      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("shows generating state immediately on mount with empty initialDays", async () => {
      globalThis.fetch = mockFetchHang();

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("generating")).toBeInTheDocument();
    });
  });

  describe("Generating state", () => {
    it("shows cancel button during generation", async () => {
      globalThis.fetch = mockFetchHang();

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      expect(
        screen.getByRole("button", { name: "cancelGeneration" })
      ).toBeInTheDocument();
    });

    it("does NOT show raw JSON to user (T-S19-001a)", async () => {
      globalThis.fetch = mockFetchHang();

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      // No <pre> tag should exist in the generating state
      const preElements = document.querySelectorAll("pre");
      expect(preElements).toHaveLength(0);
    });

    it("shows progress message during generation", async () => {
      globalThis.fetch = mockFetchHang();

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      const progressMsg = screen.getByTestId("progress-message");
      expect(progressMsg).toBeInTheDocument();
      // Initial phase message
      expect(progressMsg).toHaveTextContent("progressAnalyzing");
    });

    it("shows progress bar during generation", async () => {
      globalThis.fetch = mockFetchHang();

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
    });

    it("refreshes router on successful stream completion", async () => {
      vi.useRealTimers();
      globalThis.fetch = mockFetchOk([
        "data: chunk1\n\n",
        "data: [DONE]\n\n",
      ]);

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe("Generated state (has itinerary)", () => {
    it("renders ItineraryEditor with initial days", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      const editor = screen.getByTestId("itinerary-editor");
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveAttribute("data-trip-id", "trip-1");
      expect(editor).toHaveTextContent("1 days");
    });

    it("renders title and destination", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      expect(screen.getByText("title")).toBeInTheDocument();
      expect(screen.getByText("Paris, France")).toBeInTheDocument();
    });

    it("renders regenerate button", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      expect(
        screen.getByRole("button", { name: "regenerateCta" })
      ).toBeInTheDocument();
    });

    it("renders AI disclaimer", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      const disclaimer = screen.getByTestId("ai-disclaimer");
      expect(disclaimer).toBeInTheDocument();
      expect(disclaimer).toHaveTextContent("aiDisclaimer");
    });

    it("does not render empty state CTA", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      expect(
        screen.queryByRole("button", { name: "generateCta" })
      ).not.toBeInTheDocument();
    });
  });

  describe("Regenerate confirm dialog", () => {
    it("shows confirm dialog when clicking regenerate with existing itinerary", async () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "regenerateCta" })
        );
      });

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText("regenerateConfirmTitle")).toBeInTheDocument();
      expect(screen.getByText("regenerateConfirmMessage")).toBeInTheDocument();
    });

    it("triggers generation on confirm", async () => {
      const fetchMock = mockFetchHang();
      globalThis.fetch = fetchMock;

      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      // Click regenerate
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "regenerateCta" })
        );
      });

      // Confirm
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "regenerateConfirmYes" })
        );
      });

      expect(fetchMock).toHaveBeenCalled();
    });

    it("dismisses dialog on cancel", async () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      // Click regenerate
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "regenerateCta" })
        );
      });

      // Cancel
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: "regenerateConfirmNo" })
        );
      });

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  describe("Error handling", () => {
    it("shows error for 401 unauthorized", async () => {
      vi.useRealTimers();
      globalThis.fetch = mockFetchError(401);

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("errorAuth");
      });
    });

    it("shows error for 429 rate limit", async () => {
      vi.useRealTimers();
      globalThis.fetch = mockFetchError(429);

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("errorRateLimit");
      });
    });

    it("shows error for 403 age restricted", async () => {
      vi.useRealTimers();
      globalThis.fetch = mockFetchError(403);

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "errorAgeRestricted"
        );
      });
    });

    it("shows generic error for 500", async () => {
      vi.useRealTimers();
      globalThis.fetch = mockFetchError(500);

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("errorGenerate");
      });
    });

    it("shows timeout error on fetch exception", async () => {
      vi.useRealTimers();
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("errorTimeout");
      });
    });
  });

  describe("Back button (T-S25-007)", () => {
    it("renders WizardFooter with back button in empty state", async () => {
      vi.useRealTimers();
      globalThis.fetch = mockFetchError(400);

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
        expect(screen.getByTestId("wizard-back")).toBeInTheDocument();
      });
    });

    it("renders WizardFooter with back button in generated state", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
      expect(screen.getByTestId("wizard-back")).toBeInTheDocument();
    });

    it("navigates to phase-5 when back button is clicked in generated state", async () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      await act(async () => {
        fireEvent.click(screen.getByTestId("wizard-back"));
      });

      expect(mockPush).toHaveBeenCalledWith("/expedition/trip-1/phase-5");
    });
  });

  describe("ExpeditionProgressBar (TASK-27-006)", () => {
    it("renders progress bar in empty state (after error)", async () => {
      vi.useRealTimers();
      globalThis.fetch = mockFetchError(400);

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      await waitFor(() => {
        // ExpeditionProgressBar renders a <nav> element
        expect(screen.getByRole("navigation")).toBeInTheDocument();
      });
    });

    it("renders progress bar in generated state", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });
  });

  describe("Phase label (T-S25-008)", () => {
    it("shows phase label in generated state", () => {
      render(
        <Phase6Wizard {...BASE_PROPS} initialDays={DAYS_WITH_ACTIVITIES} />
      );

      const label = screen.getByTestId("phase-label");
      expect(label).toBeInTheDocument();
      // Mock returns the key as-is, so check it contains phaseLabel
      expect(label.textContent).toContain("phaseLabel");
    });
  });

  describe("Fetch payload", () => {
    it("sends correct body to streaming endpoint", async () => {
      vi.useRealTimers();
      const fetchMock = mockFetchOk(["data: [DONE]\n\n"]);
      globalThis.fetch = fetchMock;

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/ai/plan/stream",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: expect.any(String),
          })
        );
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({
        tripId: "trip-1",
        destination: "Paris, France",
        startDate: "2026-06-01",
        endDate: "2026-06-05",
        travelStyle: "CULTURE",
        budgetTotal: 3000,
        budgetCurrency: "USD",
        travelers: 1,
        language: "en",
      });
    });

    it("uses pt-BR language when locale is pt-BR", async () => {
      vi.useRealTimers();
      const fetchMock = mockFetchOk(["data: [DONE]\n\n"]);
      globalThis.fetch = fetchMock;

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} locale="pt-BR" />);
      });

      await waitFor(() => {
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.language).toBe("pt-BR");
      });
    });

    it("uses fallback dates when startDate/endDate are null", async () => {
      vi.useRealTimers();
      const fetchMock = mockFetchOk(["data: [DONE]\n\n"]);
      globalThis.fetch = fetchMock;

      await act(async () => {
        render(
          <Phase6Wizard {...BASE_PROPS} startDate={null} endDate={null} />
        );
      });

      await waitFor(() => {
        const today = new Date().toISOString().split("T")[0];
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.startDate).toBe(today);
        expect(body.endDate).toBe(today);
      });
    });

    it("refreshes router on successful stream completion", async () => {
      vi.useRealTimers();
      globalThis.fetch = mockFetchOk([
        "data: chunk1\n\n",
        "data: [DONE]\n\n",
      ]);

      await act(async () => {
        render(<Phase6Wizard {...BASE_PROPS} />);
      });

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });
});
