import "@testing-library/jest-dom";

// ─── Mock server-only (no-op in test environment) ───────────────────────────
// server-only throws when imported from client components in prod, but tests
// run in jsdom where the distinction doesn't exist.
vi.mock("server-only", () => ({}));

// ─── Mock image actions (prevents Redis/env chain in jsdom) ─────────────────
vi.mock("@/server/actions/image.actions", () => ({
  getDestinationImageAction: vi.fn().mockResolvedValue(null),
}));

// ─── Global polyfills (cmdk, Radix use ResizeObserver) ──────────────────────
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
