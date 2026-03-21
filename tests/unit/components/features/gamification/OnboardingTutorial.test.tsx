/**
 * Unit tests for OnboardingTutorial component.
 * Sprint 35: 3-step tutorial with skip, next, and finish.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockCompleteTutorialAction = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ success: true, data: { pointsAwarded: 100, alreadyCompleted: false } })
);

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace?: string) =>
    (key: string, params?: Record<string, unknown>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (params) {
        return `${fullKey} ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(" ")}`;
      }
      return fullKey;
    },
}));

vi.mock("@/server/actions/gamification.actions", () => ({
  completeTutorialAction: mockCompleteTutorialAction,
}));

import { OnboardingTutorial } from "@/components/features/gamification/OnboardingTutorial";

describe("OnboardingTutorial", () => {
  const defaultProps = {
    isOpen: true,
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders step 1 initially", () => {
    render(<OnboardingTutorial {...defaultProps} />);
    expect(screen.getByTestId("onboarding-tutorial")).toBeInTheDocument();
    expect(
      screen.getByText("gamification.tutorial.step1Title")
    ).toBeInTheDocument();
    expect(screen.getByTestId("tutorial-description")).toHaveTextContent(
      "gamification.tutorial.step1Description"
    );
  });

  it("shows step dots for 3 steps", () => {
    render(<OnboardingTutorial {...defaultProps} />);
    const dots = screen.getByTestId("step-dots");
    expect(dots.children).toHaveLength(3);
  });

  it("shows Next button on step 1", () => {
    render(<OnboardingTutorial {...defaultProps} />);
    expect(screen.getByTestId("tutorial-next")).toBeInTheDocument();
    expect(screen.queryByTestId("tutorial-finish")).not.toBeInTheDocument();
  });

  it("advances to step 2 on Next click", () => {
    render(<OnboardingTutorial {...defaultProps} />);
    fireEvent.click(screen.getByTestId("tutorial-next"));
    expect(
      screen.getByText("gamification.tutorial.step2Title")
    ).toBeInTheDocument();
  });

  it("advances to step 3 and shows Finish button", () => {
    render(<OnboardingTutorial {...defaultProps} />);
    fireEvent.click(screen.getByTestId("tutorial-next")); // step 2
    fireEvent.click(screen.getByTestId("tutorial-next")); // step 3
    expect(
      screen.getByText("gamification.tutorial.step3Title")
    ).toBeInTheDocument();
    expect(screen.getByTestId("tutorial-finish")).toBeInTheDocument();
    expect(screen.queryByTestId("tutorial-next")).not.toBeInTheDocument();
  });

  it("shows skip button on every step", () => {
    render(<OnboardingTutorial {...defaultProps} />);
    expect(screen.getByTestId("tutorial-skip")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tutorial-next")); // step 2
    expect(screen.getByTestId("tutorial-skip")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("tutorial-next")); // step 3
    expect(screen.getByTestId("tutorial-skip")).toBeInTheDocument();
  });

  it("calls completeTutorialAction and onComplete on Finish", async () => {
    render(<OnboardingTutorial {...defaultProps} />);
    fireEvent.click(screen.getByTestId("tutorial-next")); // step 2
    fireEvent.click(screen.getByTestId("tutorial-next")); // step 3
    fireEvent.click(screen.getByTestId("tutorial-finish"));

    await waitFor(() => {
      expect(mockCompleteTutorialAction).toHaveBeenCalledTimes(1);
      expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("calls completeTutorialAction and onComplete on Skip", async () => {
    render(<OnboardingTutorial {...defaultProps} />);
    fireEvent.click(screen.getByTestId("tutorial-skip"));

    await waitFor(() => {
      expect(mockCompleteTutorialAction).toHaveBeenCalledTimes(1);
      expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("still completes even if completeTutorialAction fails", async () => {
    mockCompleteTutorialAction.mockRejectedValueOnce(new Error("fail"));
    render(<OnboardingTutorial {...defaultProps} />);
    fireEvent.click(screen.getByTestId("tutorial-skip"));

    await waitFor(() => {
      expect(defaultProps.onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("does not render when isOpen is false", () => {
    render(<OnboardingTutorial {...defaultProps} isOpen={false} />);
    expect(
      screen.queryByTestId("onboarding-tutorial")
    ).not.toBeInTheDocument();
  });

  it("shows icon for each step", () => {
    render(<OnboardingTutorial {...defaultProps} />);
    expect(screen.getByTestId("tutorial-icon")).toBeInTheDocument();
  });
});
