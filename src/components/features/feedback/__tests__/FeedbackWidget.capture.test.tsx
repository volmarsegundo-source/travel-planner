import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { FeedbackWidget } from "../FeedbackWidget";

/* ────────────────────────────────────────────────────────────────────────────
 * Mocks
 *
 * We mock `html-to-image` at the module level so we can control the
 * capture outcome deterministically. The widget imports it dynamically
 * (`await import("html-to-image")`), which vitest handles transparently.
 * ──────────────────────────────────────────────────────────────────────────── */

const mockToPng = vi.hoisted(() => vi.fn());

vi.mock("html-to-image", () => ({
  toPng: mockToPng,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `feedback.${key}`,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pt-BR/expeditions",
}));

vi.mock("@/server/actions/feedback.actions", () => ({
  submitFeedbackAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe("FeedbackWidget - screenshot capture", () => {
  beforeEach(() => {
    mockToPng.mockReset();
  });

  it("auto-captures a screenshot via html-to-image when the modal opens", async () => {
    const fakeDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";
    mockToPng.mockResolvedValue(fakeDataUrl);

    render(<FeedbackWidget />);

    // Open the modal via the floating trigger button
    const trigger = screen.getByRole("button", { name: /feedback.buttonLabel/i });
    fireEvent.click(trigger);

    // Auto-capture runs after a 50ms timeout inside useEffect
    await waitFor(
      () => {
        expect(mockToPng).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // Wait for state update with the captured data URL. The preview img has
    // empty alt (role=presentation), so query by src attribute.
    await waitFor(
      () => {
        const img = document.querySelector<HTMLImageElement>(
          `img[src="${fakeDataUrl}"]`,
        );
        expect(img).not.toBeNull();
      },
      { timeout: 2000 },
    );
  });

  it("handles capture failure gracefully without setting screenshot data", async () => {
    mockToPng.mockRejectedValue(new Error("unsupported css"));

    // Silence the expected console.error so the test output stays clean.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<FeedbackWidget />);

    const trigger = screen.getByRole("button", { name: /feedback.buttonLabel/i });
    fireEvent.click(trigger);

    await waitFor(
      () => {
        expect(mockToPng).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    // After a failed capture, no screenshot preview should be rendered.
    // We allow a short tick for state to flush.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // The img inside the preview should be absent.
    const previewImg = document.querySelector('img[src^="data:image/"]');
    expect(previewImg).toBeNull();

    expect(consoleError).toHaveBeenCalledWith(
      "[FeedbackWidget] capture:failed",
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it("rejects non-data-url return values from toPng", async () => {
    // Simulate html-to-image returning an empty/invalid value (seen on some
    // browsers when SVG foreignObject serialization fails).
    mockToPng.mockResolvedValue("");

    render(<FeedbackWidget />);
    fireEvent.click(screen.getByRole("button", { name: /feedback.buttonLabel/i }));

    await waitFor(
      () => {
        expect(mockToPng).toHaveBeenCalled();
      },
      { timeout: 2000 },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const previewImg = document.querySelector('img[src^="data:image/"]');
    expect(previewImg).toBeNull();
  });
});
