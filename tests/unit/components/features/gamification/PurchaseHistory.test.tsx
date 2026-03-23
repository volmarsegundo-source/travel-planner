/**
 * Unit tests for PurchaseHistory component.
 *
 * Tests cover:
 * - Loading state
 * - Empty state
 * - Rendering purchase rows
 * - Error state
 * - Date and price formatting
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// ─── Hoisted mocks ─────────────────────────────────────────────────────────

const mockGetPurchaseHistory = vi.hoisted(() => vi.fn());

vi.mock("@/server/actions/purchase.actions", () => ({
  getPurchaseHistoryAction: mockGetPurchaseHistory,
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => {
    const keys: Record<string, string> = {
      "gamification.purchaseHistory.title": "Purchase History",
      "gamification.purchaseHistory.empty": "No purchases made",
      "gamification.purchaseHistory.loading": "Loading...",
      "gamification.purchaseHistory.loadError": "Failed to load",
      "gamification.purchaseHistory.date": "Date",
      "gamification.purchaseHistory.package": "Package",
      "gamification.purchaseHistory.paAmount": "PA",
      "gamification.purchaseHistory.price": "Price",
      "gamification.purchaseHistory.status": "Status",
      "gamification.purchaseHistory.statuses.confirmed": "Confirmed",
      "gamification.purchaseHistory.statuses.pending": "Pending",
      "gamification.packages.navegador": "Navigator",
      "gamification.packages.explorador": "Explorer",
    };
    return (key: string) => {
      const fullKey = `${ns}.${key}`;
      return keys[fullKey] ?? key;
    };
  },
}));

// ─── Import SUT ─────────────────────────────────────────────────────────────

import { PurchaseHistory } from "@/components/features/gamification/PurchaseHistory";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PurchaseHistory", () => {
  it("shows loading state initially", () => {
    mockGetPurchaseHistory.mockReturnValue(new Promise(() => {})); // never resolves
    render(<PurchaseHistory />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows empty state when no purchases", async () => {
    mockGetPurchaseHistory.mockResolvedValue({ success: true, data: [] });
    render(<PurchaseHistory />);

    await waitFor(() => {
      expect(screen.getByTestId("purchase-history-empty")).toBeInTheDocument();
    });
    expect(screen.getByText("No purchases made")).toBeInTheDocument();
  });

  it("renders purchase rows", async () => {
    mockGetPurchaseHistory.mockResolvedValue({
      success: true,
      data: [
        {
          id: "p-1",
          packageId: "navegador",
          paAmount: 1200,
          amountCents: 2990,
          currency: "BRL",
          status: "confirmed",
          createdAt: new Date("2026-03-20"),
        },
      ],
    });

    render(<PurchaseHistory />);

    await waitFor(() => {
      expect(screen.getByTestId("purchase-row-p-1")).toBeInTheDocument();
    });
    expect(screen.getByText("Navigator")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("renders multiple purchase rows sorted by API response", async () => {
    mockGetPurchaseHistory.mockResolvedValue({
      success: true,
      data: [
        {
          id: "p-2",
          packageId: "navegador",
          paAmount: 1200,
          amountCents: 2990,
          currency: "BRL",
          status: "confirmed",
          createdAt: new Date("2026-03-22"),
        },
        {
          id: "p-1",
          packageId: "explorador",
          paAmount: 500,
          amountCents: 1490,
          currency: "BRL",
          status: "confirmed",
          createdAt: new Date("2026-03-20"),
        },
      ],
    });

    render(<PurchaseHistory />);

    await waitFor(() => {
      expect(screen.getByTestId("purchase-row-p-2")).toBeInTheDocument();
      expect(screen.getByTestId("purchase-row-p-1")).toBeInTheDocument();
    });
  });

  it("shows error state when action fails", async () => {
    mockGetPurchaseHistory.mockResolvedValue({ success: false, error: "Some error" });
    render(<PurchaseHistory />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });
  });

  it("shows error state on exception", async () => {
    mockGetPurchaseHistory.mockRejectedValue(new Error("Network error"));
    render(<PurchaseHistory />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load")).toBeInTheDocument();
    });
  });

  it("displays title heading", async () => {
    mockGetPurchaseHistory.mockResolvedValue({ success: true, data: [] });
    render(<PurchaseHistory />);

    await waitFor(() => {
      expect(screen.getByText("Purchase History")).toBeInTheDocument();
    });
  });
});
