import { describe, it, expect, afterEach } from "vitest";
import { isDesignV2Enabled } from "../feature-flags";

describe("isDesignV2Enabled", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns true when NEXT_PUBLIC_DESIGN_V2 is 'true'", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "true" };
    expect(isDesignV2Enabled()).toBe(true);
  });

  it("returns false when NEXT_PUBLIC_DESIGN_V2 is 'false'", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "false" };
    expect(isDesignV2Enabled()).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_DESIGN_V2 is undefined", () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_DESIGN_V2;
    expect(isDesignV2Enabled()).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_DESIGN_V2 is empty string", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "" };
    expect(isDesignV2Enabled()).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_DESIGN_V2 is 'TRUE' (case-sensitive)", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "TRUE" };
    expect(isDesignV2Enabled()).toBe(false);
  });

  it("returns false when NEXT_PUBLIC_DESIGN_V2 is '1'", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "1" };
    expect(isDesignV2Enabled()).toBe(false);
  });
});
