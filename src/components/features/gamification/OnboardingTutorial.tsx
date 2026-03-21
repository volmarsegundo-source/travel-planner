"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { completeTutorialAction } from "@/server/actions/gamification.actions";

interface OnboardingTutorialProps {
  isOpen: boolean;
  onComplete: () => void;
}

const STEP_ICONS = ["\uD83C\uDFC6", "\uD83E\uDD16", "\uD83D\uDE80"];

const TOTAL_STEPS = 3;

export function OnboardingTutorial({
  isOpen,
  onComplete,
}: OnboardingTutorialProps) {
  const t = useTranslations("gamification.tutorial");

  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const stepTitles = [t("step1Title"), t("step2Title"), t("step3Title")];
  const stepDescriptions = [
    t("step1Description"),
    t("step2Description"),
    t("step3Description"),
  ];

  async function handleFinish() {
    setIsCompleting(true);
    try {
      await completeTutorialAction();
    } catch {
      // Non-blocking: tutorial bonus failure should not prevent dismissal
    } finally {
      setIsCompleting(false);
      onComplete();
    }
  }

  async function handleSkip() {
    setIsCompleting(true);
    try {
      await completeTutorialAction();
    } catch {
      // Non-blocking
    } finally {
      setIsCompleting(false);
      onComplete();
    }
  }

  function handleNext() {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }

  const isLastStep = currentStep === TOTAL_STEPS - 1;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        data-testid="onboarding-tutorial"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center">
            {stepTitles[currentStep]}
          </DialogTitle>
          <DialogDescription className="text-center">
            <span
              className="my-6 block text-5xl"
              aria-hidden="true"
              data-testid="tutorial-icon"
            >
              {STEP_ICONS[currentStep]}
            </span>
            <span data-testid="tutorial-description">
              {stepDescriptions[currentStep]}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Step dots */}
        <div
          className="flex items-center justify-center gap-2"
          role="group"
          aria-label={t("stepIndicator", {
            current: currentStep + 1,
            total: TOTAL_STEPS,
          })}
          data-testid="step-dots"
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === currentStep
                  ? "bg-atlas-gold"
                  : "bg-muted-foreground/30"
              }`}
              aria-current={i === currentStep ? "step" : undefined}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isCompleting}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
            data-testid="tutorial-skip"
          >
            {t("skip")}
          </button>
          {isLastStep ? (
            <Button
              onClick={handleFinish}
              disabled={isCompleting}
              data-testid="tutorial-finish"
            >
              {t("finish")}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              data-testid="tutorial-next"
            >
              {t("next")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
