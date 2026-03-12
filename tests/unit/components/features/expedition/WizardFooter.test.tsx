/**
 * Unit tests for WizardFooter component.
 * SPEC-UX-014: Standardized CTA pattern.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      namespace ? `${namespace}.${key}` : key,
}));

import { WizardFooter } from "@/components/features/expedition/WizardFooter";

describe("WizardFooter", () => {
  const onPrimary = vi.fn();
  const onBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders primary button with label", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Continue" />);
    expect(screen.getByTestId("wizard-primary")).toHaveTextContent("Continue");
  });

  it("calls onPrimary when clicked", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" />);
    fireEvent.click(screen.getByTestId("wizard-primary"));
    expect(onPrimary).toHaveBeenCalledOnce();
  });

  it("renders back button when onBack provided", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" onBack={onBack} />);
    expect(screen.getByTestId("wizard-back")).toBeInTheDocument();
  });

  it("does not render back button when onBack not provided", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" />);
    expect(screen.queryByTestId("wizard-back")).not.toBeInTheDocument();
  });

  it("calls onBack when back clicked", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" onBack={onBack} />);
    fireEvent.click(screen.getByTestId("wizard-back"));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("disables buttons when isLoading", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" onBack={onBack} isLoading />);
    expect(screen.getByTestId("wizard-primary")).toBeDisabled();
    expect(screen.getByTestId("wizard-back")).toBeDisabled();
  });

  it("shows saving text when loading", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" isLoading />);
    expect(screen.getByTestId("wizard-primary")).toHaveTextContent("common.saving");
  });

  it("disables primary when isDisabled", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" isDisabled />);
    expect(screen.getByTestId("wizard-primary")).toBeDisabled();
  });

  it("renders secondary actions", () => {
    const secondaryAction = { label: "Skip", onClick: vi.fn() };
    render(
      <WizardFooter
        onPrimary={onPrimary}
        primaryLabel="Next"
        secondaryActions={[secondaryAction]}
      />
    );
    const skipBtn = screen.getByText("Skip");
    fireEvent.click(skipBtn);
    expect(secondaryAction.onClick).toHaveBeenCalledOnce();
  });

  it("has atlas-teal styling on primary button", () => {
    render(<WizardFooter onPrimary={onPrimary} primaryLabel="Next" />);
    expect(screen.getByTestId("wizard-primary").className).toContain("atlas-teal");
  });

  it("renders spinner svg when loading", () => {
    const { container } = render(
      <WizardFooter onPrimary={onPrimary} primaryLabel="Next" isLoading />
    );
    const spinner = container.querySelector("svg");
    expect(spinner).toBeInTheDocument();
  });
});
