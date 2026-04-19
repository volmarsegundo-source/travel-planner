import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSuccess, mockError, mockInfo, mockWarning } = vi.hoisted(() => ({
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
  mockInfo: vi.fn(),
  mockWarning: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mockSuccess,
    error: mockError,
    info: mockInfo,
    warning: mockWarning,
  },
}));

import { toast } from "@/lib/toast";

describe("toast wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes success/error/info/warning methods", () => {
    expect(typeof toast.success).toBe("function");
    expect(typeof toast.error).toBe("function");
    expect(typeof toast.info).toBe("function");
    expect(typeof toast.warning).toBe("function");
  });

  it("toast.success delegates to sonner with default 5s duration", () => {
    toast.success("Saved!");
    expect(mockSuccess).toHaveBeenCalledWith("Saved!", { duration: 5000 });
  });

  it("toast.error delegates to sonner with default 5s duration", () => {
    toast.error("Boom");
    expect(mockError).toHaveBeenCalledWith("Boom", { duration: 5000 });
  });

  it("toast.info delegates to sonner with default 5s duration", () => {
    toast.info("FYI");
    expect(mockInfo).toHaveBeenCalledWith("FYI", { duration: 5000 });
  });

  it("toast.warning delegates to sonner with default 5s duration", () => {
    toast.warning("Careful");
    expect(mockWarning).toHaveBeenCalledWith("Careful", { duration: 5000 });
  });

  it("honors custom duration override", () => {
    toast.info("Short", { duration: 1000 });
    expect(mockInfo).toHaveBeenCalledWith("Short", { duration: 1000 });
  });
});
