/**
 * B47-API-RBAC-CONVENTION — Sprint 46 (P1 from batch-review §10.3).
 *
 * Behavioral tests for `withAiGovernanceAccess` and
 * `withAiGovernanceApproverAccess` HOF wrappers. Mocks `auth()` and `db`
 * to exercise the auth → role lookup → RBAC → handler chain.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuth, mockUserFindUnique } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockUserFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

import {
  withAiGovernanceAccess,
  withAiGovernanceApproverAccess,
  type AdminApiHandler,
} from "@/lib/auth/with-rbac";

const buildRequest = (url = "https://example.com/api/admin/ai/test") =>
  new Request(url);

const noopContext = { params: Promise.resolve({}) };

const makeHandler = (
  body: Record<string, unknown> = { ok: true }
): { handler: AdminApiHandler; spy: ReturnType<typeof vi.fn> } => {
  const spy = vi.fn(async () =>
    Response.json({ ...body, hit: true }, { status: 200 })
  );
  return { handler: spy as unknown as AdminApiHandler, spy };
};

beforeEach(() => {
  mockAuth.mockReset();
  mockUserFindUnique.mockReset();
});

describe("withAiGovernanceAccess (read+edit RBAC)", () => {
  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { handler, spy } = makeHandler();
    const wrapped = withAiGovernanceAccess(handler);

    const res = await wrapped(buildRequest(), noopContext);
    expect(res.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: "x@y.z" } });
    const { handler, spy } = makeHandler();
    const wrapped = withAiGovernanceAccess(handler);

    const res = await wrapped(buildRequest(), noopContext);
    expect(res.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 403 when role is 'user'", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    mockUserFindUnique.mockResolvedValueOnce({ role: "user" });
    const { handler, spy } = makeHandler();
    const wrapped = withAiGovernanceAccess(handler);

    const res = await wrapped(buildRequest(), noopContext);
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 403 when role is unknown ('moderator')", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    mockUserFindUnique.mockResolvedValueOnce({ role: "moderator" });
    const { handler, spy } = makeHandler();
    const wrapped = withAiGovernanceAccess(handler);

    const res = await wrapped(buildRequest(), noopContext);
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 403 when DB returns no user (orphaned session)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    mockUserFindUnique.mockResolvedValueOnce(null);
    const { handler, spy } = makeHandler();
    const wrapped = withAiGovernanceAccess(handler);

    const res = await wrapped(buildRequest(), noopContext);
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 503 fail-closed when DB throws", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    mockUserFindUnique.mockRejectedValueOnce(new Error("connection refused"));
    const { handler, spy } = makeHandler();
    const wrapped = withAiGovernanceAccess(handler);

    const res = await wrapped(buildRequest(), noopContext);
    expect(res.status).toBe(503);
    expect(spy).not.toHaveBeenCalled();
  });

  describe("invokes handler for qualified roles", () => {
    it.each([["admin"], ["admin-ai"], ["admin-ai-approver"]])(
      "passes through for role '%s'",
      async (role) => {
        mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
        mockUserFindUnique.mockResolvedValueOnce({ role });
        const { handler, spy } = makeHandler();
        const wrapped = withAiGovernanceAccess(handler);

        const res = await wrapped(buildRequest(), noopContext);
        expect(res.status).toBe(200);
        expect(spy).toHaveBeenCalledTimes(1);
      }
    );

    it("forwards an auth context with userId + role to the inner handler", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "user-42" } });
      mockUserFindUnique.mockResolvedValueOnce({ role: "admin-ai" });
      const { handler, spy } = makeHandler();
      const wrapped = withAiGovernanceAccess(handler);

      await wrapped(buildRequest(), noopContext);

      const [, , authCtx] = spy.mock.calls[0];
      expect(authCtx).toEqual({ userId: "user-42", role: "admin-ai" });
    });

    it("forwards request and context unchanged", async () => {
      mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
      mockUserFindUnique.mockResolvedValueOnce({ role: "admin" });
      const { handler, spy } = makeHandler();
      const wrapped = withAiGovernanceAccess(handler);

      const req = buildRequest("https://example.com/api/admin/ai/prompts");
      const ctx = { params: Promise.resolve({ id: "p1" }) };
      await wrapped(req, ctx);

      const [forwardedReq, forwardedCtx] = spy.mock.calls[0];
      expect(forwardedReq).toBe(req);
      expect(forwardedCtx).toBe(ctx);
    });
  });
});

describe("withAiGovernanceApproverAccess (promote-only RBAC)", () => {
  it("returns 401 when no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { handler, spy } = makeHandler();
    const wrapped = withAiGovernanceApproverAccess(handler);

    const res = await wrapped(buildRequest(), noopContext);
    expect(res.status).toBe(401);
    expect(spy).not.toHaveBeenCalled();
  });

  it("DENIES admin-ai (read-only role per SPEC §7.7)", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    mockUserFindUnique.mockResolvedValueOnce({ role: "admin-ai" });
    const { handler, spy } = makeHandler();
    const wrapped = withAiGovernanceApproverAccess(handler);

    const res = await wrapped(buildRequest(), noopContext);
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 403 for regular user", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    mockUserFindUnique.mockResolvedValueOnce({ role: "user" });
    const { handler, spy } = makeHandler();
    const wrapped = withAiGovernanceApproverAccess(handler);

    const res = await wrapped(buildRequest(), noopContext);
    expect(res.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 503 fail-closed when DB throws", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
    mockUserFindUnique.mockRejectedValueOnce(new Error("boom"));
    const { handler, spy } = makeHandler();
    const wrapped = withAiGovernanceApproverAccess(handler);

    const res = await wrapped(buildRequest(), noopContext);
    expect(res.status).toBe(503);
    expect(spy).not.toHaveBeenCalled();
  });

  describe("invokes handler for promote-eligible roles", () => {
    it.each([["admin"], ["admin-ai-approver"]])(
      "passes through for role '%s'",
      async (role) => {
        mockAuth.mockResolvedValueOnce({ user: { id: "u1" } });
        mockUserFindUnique.mockResolvedValueOnce({ role });
        const { handler, spy } = makeHandler();
        const wrapped = withAiGovernanceApproverAccess(handler);

        const res = await wrapped(buildRequest(), noopContext);
        expect(res.status).toBe(200);
        expect(spy).toHaveBeenCalledTimes(1);
      }
    );
  });
});
