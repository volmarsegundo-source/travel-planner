import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRedis } = vi.hoisted(() => {
  const mockRedis = {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  };
  return { mockRedis };
});

vi.mock("@/server/cache/client", () => ({ redis: mockRedis }));

// ── Import after mocks ────────────────────────────────────────────────────────

import { checkRateLimit } from "../rate-limit";

// ── Tests ─────────────────────────────────────────────────────────────────────

const TEST_KEY = "rl:test:127.0.0.1";
const MAX = 5;
const WINDOW = 60;

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default TTL response: 45 seconds remaining
    mockRedis.ttl.mockResolvedValue(45);
  });

  it("returns allowed: true on the first call (count = 1)", async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const result = await checkRateLimit(TEST_KEY, MAX, WINDOW);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // MAX - 1
    expect(result.resetInSeconds).toBe(45);
  });

  it("returns allowed: true when count equals maxRequests (boundary)", async () => {
    mockRedis.incr.mockResolvedValue(MAX); // exactly at limit
    mockRedis.expire.mockResolvedValue(1);

    const result = await checkRateLimit(TEST_KEY, MAX, WINDOW);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("returns allowed: false when count exceeds maxRequests", async () => {
    mockRedis.incr.mockResolvedValue(MAX + 1); // one over the limit

    const result = await checkRateLimit(TEST_KEY, MAX, WINDOW);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0); // clamped to 0, never negative
  });

  it("remaining is never negative when count far exceeds maxRequests", async () => {
    mockRedis.incr.mockResolvedValue(MAX + 100);

    const result = await checkRateLimit(TEST_KEY, MAX, WINDOW);

    expect(result.remaining).toBe(0);
  });

  it("calls EXPIRE with the correct window on the first increment (count === 1)", async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    await checkRateLimit(TEST_KEY, MAX, WINDOW);

    expect(mockRedis.expire).toHaveBeenCalledOnce();
    expect(mockRedis.expire).toHaveBeenCalledWith(TEST_KEY, WINDOW);
  });

  it("does NOT call EXPIRE on subsequent increments (count > 1)", async () => {
    mockRedis.incr.mockResolvedValue(3); // not the first call

    await checkRateLimit(TEST_KEY, MAX, WINDOW);

    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it("does NOT call EXPIRE when count is at the limit (count === maxRequests)", async () => {
    mockRedis.incr.mockResolvedValue(MAX);

    await checkRateLimit(TEST_KEY, MAX, WINDOW);

    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it("returns resetInSeconds from TTL command", async () => {
    mockRedis.incr.mockResolvedValue(2);
    mockRedis.ttl.mockResolvedValue(30);

    const result = await checkRateLimit(TEST_KEY, MAX, WINDOW);

    expect(mockRedis.ttl).toHaveBeenCalledWith(TEST_KEY);
    expect(result.resetInSeconds).toBe(30);
  });

  it("clamps resetInSeconds to 0 when TTL returns -1 (no expiry edge-case)", async () => {
    mockRedis.incr.mockResolvedValue(2);
    mockRedis.ttl.mockResolvedValue(-1);

    const result = await checkRateLimit(TEST_KEY, MAX, WINDOW);

    expect(result.resetInSeconds).toBe(0);
  });

  it("clamps resetInSeconds to 0 when TTL returns -2 (key missing edge-case)", async () => {
    mockRedis.incr.mockResolvedValue(2);
    mockRedis.ttl.mockResolvedValue(-2);

    const result = await checkRateLimit(TEST_KEY, MAX, WINDOW);

    expect(result.resetInSeconds).toBe(0);
  });
});
