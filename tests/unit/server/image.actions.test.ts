/**
 * Unit tests for image.actions.ts (getDestinationImageAction).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mock handles ──────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  getDestinationImage: vi.fn(),
  getHardcodedImage: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

// Unmock the global setup mock so we test the real implementation
vi.unmock("@/server/actions/image.actions");

vi.mock("@/server/services/unsplash.service", () => ({
  UnsplashService: {
    getDestinationImage: mocks.getDestinationImage,
  },
}));

vi.mock("@/lib/utils/destination-images", () => ({
  getDestinationImage: mocks.getHardcodedImage,
}));

// ─── Import under test ───────────────────────────────────────────────────────

import { getDestinationImageAction } from "@/server/actions/image.actions";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getDestinationImageAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns Unsplash result when available", async () => {
    mocks.getDestinationImage.mockResolvedValue({
      url: "https://images.unsplash.com/photo-1",
      photographerName: "Jane Doe",
      photographerUrl: "https://unsplash.com/@janedoe",
      unsplashUrl: "https://unsplash.com/photos/abc",
    });

    const result = await getDestinationImageAction("Paris");

    expect(result).toEqual({
      url: "https://images.unsplash.com/photo-1",
      photographer: "Jane Doe",
      photographerUrl: "https://unsplash.com/@janedoe",
    });
    expect(mocks.getHardcodedImage).not.toHaveBeenCalled();
  });

  it("falls back to hardcoded image when Unsplash returns null", async () => {
    mocks.getDestinationImage.mockResolvedValue(null);
    mocks.getHardcodedImage.mockReturnValue(
      "https://images.unsplash.com/photo-hardcoded"
    );

    const result = await getDestinationImageAction("Rio de Janeiro");

    expect(result).toEqual({ url: "https://images.unsplash.com/photo-hardcoded" });
  });

  it("returns null when both Unsplash and hardcoded fail", async () => {
    mocks.getDestinationImage.mockResolvedValue(null);
    mocks.getHardcodedImage.mockReturnValue(null);

    const result = await getDestinationImageAction("Unknown Place");

    expect(result).toBeNull();
  });

  it("returns null for empty string input", async () => {
    const result = await getDestinationImageAction("");

    expect(result).toBeNull();
    expect(mocks.getDestinationImage).not.toHaveBeenCalled();
  });

  it("returns null for whitespace-only input", async () => {
    const result = await getDestinationImageAction("   ");

    expect(result).toBeNull();
    expect(mocks.getDestinationImage).not.toHaveBeenCalled();
  });

  it("returns null for input exceeding 200 characters", async () => {
    const longInput = "A".repeat(201);
    const result = await getDestinationImageAction(longInput);

    expect(result).toBeNull();
    expect(mocks.getDestinationImage).not.toHaveBeenCalled();
  });

  it("trims destination before passing to services", async () => {
    mocks.getDestinationImage.mockResolvedValue(null);
    mocks.getHardcodedImage.mockReturnValue(null);

    await getDestinationImageAction("  Tokyo  ");

    expect(mocks.getDestinationImage).toHaveBeenCalledWith("Tokyo");
  });

  it("does not include photographer fields when using hardcoded fallback", async () => {
    mocks.getDestinationImage.mockResolvedValue(null);
    mocks.getHardcodedImage.mockReturnValue("https://example.com/img.jpg");

    const result = await getDestinationImageAction("Lisbon");

    expect(result).toEqual({ url: "https://example.com/img.jpg" });
    expect(result!.photographer).toBeUndefined();
    expect(result!.photographerUrl).toBeUndefined();
  });
});
