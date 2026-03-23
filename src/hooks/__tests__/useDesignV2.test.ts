import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDesignV2 } from "../useDesignV2";

describe("useDesignV2", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns true when NEXT_PUBLIC_DESIGN_V2 is 'true'", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "true" };
    const { result } = renderHook(() => useDesignV2());
    expect(result.current).toBe(true);
  });

  it("returns false when NEXT_PUBLIC_DESIGN_V2 is 'false'", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "false" };
    const { result } = renderHook(() => useDesignV2());
    expect(result.current).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_DESIGN_V2 is undefined", () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_DESIGN_V2;
    const { result } = renderHook(() => useDesignV2());
    expect(result.current).toBe(false);
  });
});
