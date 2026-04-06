import "@testing-library/jest-dom";

// ─── Mock server-only (no-op in test environment) ───────────────────────────
// server-only throws when imported from client components in prod, but tests
// run in jsdom where the distinction doesn't exist.
vi.mock("server-only", () => ({}));

// ─── Mock image actions (prevents Redis/env chain in jsdom) ─────────────────
vi.mock("@/server/actions/image.actions", () => ({
  getDestinationImageAction: vi.fn().mockResolvedValue(null),
}));

// ─── Mock AI gateway + governance (prevents Redis/env chain) ────────────────
vi.mock("@/server/services/ai-gateway.service", () => ({
  AiGatewayService: {
    generatePlan: vi.fn().mockResolvedValue({ data: {}, interaction: {} }),
    generateChecklist: vi.fn().mockResolvedValue({ data: {}, interaction: {} }),
    generateGuide: vi.fn().mockResolvedValue({ data: {}, interaction: {} }),
  },
}));

vi.mock("@/server/services/ai-governance/policies", () => ({}));

vi.mock("@/server/services/ai-governance/policy-engine", () => ({
  PolicyEngine: {
    evaluate: vi.fn().mockResolvedValue({ allowed: true }),
    register: vi.fn(),
    _reset: vi.fn(),
  },
}));

// ─── Global polyfills (cmdk, Radix use ResizeObserver) ──────────────────────
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
