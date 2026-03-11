import "@testing-library/jest-dom";

// ─── Global polyfills (cmdk, Radix use ResizeObserver) ──────────────────────
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
