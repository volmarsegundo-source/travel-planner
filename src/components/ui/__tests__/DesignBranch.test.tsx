import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DesignBranch } from "../DesignBranch";

describe("DesignBranch", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("renders v1 when NEXT_PUBLIC_DESIGN_V2 is 'false'", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "false" };
    render(
      <DesignBranch
        v1={<div data-testid="v1">Legacy</div>}
        v2={<div data-testid="v2">New Design</div>}
      />,
    );
    expect(screen.getByTestId("v1")).toBeInTheDocument();
    expect(screen.queryByTestId("v2")).not.toBeInTheDocument();
  });

  it("renders v2 when NEXT_PUBLIC_DESIGN_V2 is 'true'", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "true" };
    render(
      <DesignBranch
        v1={<div data-testid="v1">Legacy</div>}
        v2={<div data-testid="v2">New Design</div>}
      />,
    );
    expect(screen.getByTestId("v2")).toBeInTheDocument();
    expect(screen.queryByTestId("v1")).not.toBeInTheDocument();
  });

  it("renders v1 when NEXT_PUBLIC_DESIGN_V2 is undefined", () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NEXT_PUBLIC_DESIGN_V2;
    render(
      <DesignBranch
        v1={<div data-testid="v1">Legacy</div>}
        v2={<div data-testid="v2">New Design</div>}
      />,
    );
    expect(screen.getByTestId("v1")).toBeInTheDocument();
    expect(screen.queryByTestId("v2")).not.toBeInTheDocument();
  });

  it("renders correct content text for v1", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "false" };
    render(
      <DesignBranch
        v1={<span>Old Button</span>}
        v2={<span>Atlas Button</span>}
      />,
    );
    expect(screen.getByText("Old Button")).toBeInTheDocument();
    expect(screen.queryByText("Atlas Button")).not.toBeInTheDocument();
  });

  it("renders correct content text for v2", () => {
    process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_DESIGN_V2: "true" };
    render(
      <DesignBranch
        v1={<span>Old Button</span>}
        v2={<span>Atlas Button</span>}
      />,
    );
    expect(screen.getByText("Atlas Button")).toBeInTheDocument();
    expect(screen.queryByText("Old Button")).not.toBeInTheDocument();
  });
});
