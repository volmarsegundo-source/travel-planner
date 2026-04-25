/**
 * B-W1-007 — health endpoint tests.
 *
 * SPEC §5.6 health response contract + §6.2 graceful degradation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { findManyMock, mockDb } = vi.hoisted(() => {
  const findManyMock = vi.fn();
  return {
    findManyMock,
    mockDb: { modelAssignment: { findMany: findManyMock } },
  };
});

vi.mock("@/server/db", () => ({ db: mockDb }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("GET /api/health/ai-config", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("returns 200 + ok + database when 3 ModelAssignment rows exist", async () => {
    findManyMock.mockResolvedValue([
      { phase: "plan", primaryProvider: "anthropic", primaryModelId: "claude-haiku-4-5-20251001" },
      { phase: "checklist", primaryProvider: "anthropic", primaryModelId: "claude-haiku-4-5-20251001" },
      { phase: "guide", primaryProvider: "anthropic", primaryModelId: "claude-haiku-4-5-20251001" },
    ]);

    const { GET } = await import("../route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.source).toBe("database");
    expect(body.phases).toHaveLength(3);
    expect(body.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns 200 + degraded + fallback when ModelAssignment table is empty", async () => {
    findManyMock.mockResolvedValue([]);

    const { GET } = await import("../route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.source).toBe("fallback");
    expect(body.phases).toHaveLength(3);
    expect(body.phases.map((p: { phase: string }) => p.phase)).toEqual(
      expect.arrayContaining(["plan", "checklist", "guide"]),
    );
  });

  it("returns 200 + degraded + fallback when DB throws", async () => {
    findManyMock.mockRejectedValue(new Error("DB unreachable"));

    const { GET } = await import("../route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.source).toBe("fallback");
  });

  it("each fallback phase carries provider + modelId + hasAssignment=true", async () => {
    findManyMock.mockResolvedValue([]);

    const { GET } = await import("../route");
    const response = await GET();
    const body = await response.json();

    for (const p of body.phases) {
      expect(p.provider).toBeTypeOf("string");
      expect(p.modelId).toBeTypeOf("string");
      expect(p.hasAssignment).toBe(true);
    }
  });

  it("checkedAt is a valid ISO 8601 timestamp", async () => {
    findManyMock.mockResolvedValue([]);

    const { GET } = await import("../route");
    const response = await GET();
    const body = await response.json();

    expect(() => new Date(body.checkedAt).toISOString()).not.toThrow();
  });
});
