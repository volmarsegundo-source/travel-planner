"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const AUTO_ADVANCE_DELAY_MS = 2000;

interface PhaseTransitionProps {
  fromPhase: number;
  toPhase: number;
  onContinue: () => void;
}

export function PhaseTransition({ fromPhase, toPhase, onContinue }: PhaseTransitionProps) {
  const t = useTranslations("expedition.transition");
  const tPhases = useTranslations("gamification.phases");
  const [showAdvancing, setShowAdvancing] = useState(false);
  const [autoAdvanceCancelled, setAutoAdvanceCancelled] = useState(false);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const phaseNameKeys: Record<number, string> = {
    1: "theCalling",
    2: "theExplorer",
    3: "theRoute",
    4: "theShelter",
    5: "theDayMap",
    6: "theTreasure",
    7: "theExpedition",
    8: "theLegacy",
  };

  // Show "advancing" state after initial celebration
  useEffect(() => {
    const advanceTimer = setTimeout(() => {
      setShowAdvancing(true);
    }, 1200);
    return () => clearTimeout(advanceTimer);
  }, []);

  // Auto-advance after showing "advancing" state
  useEffect(() => {
    if (!showAdvancing || autoAdvanceCancelled) return;

    autoAdvanceTimerRef.current = setTimeout(() => {
      onContinueRef.current();
    }, AUTO_ADVANCE_DELAY_MS);

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [showAdvancing, autoAdvanceCancelled]);

  function handleManualContinue() {
    // Cancel auto-advance timer to prevent double invocation
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setAutoAdvanceCancelled(true);
    onContinueRef.current();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-card p-8 shadow-2xl text-center">
        <div className="text-5xl" aria-hidden="true">
          {showAdvancing ? "\u{1F680}" : "\u2705"}
        </div>

        {!showAdvancing ? (
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-bold text-foreground">
              {t("phaseCompleted", { phase: fromPhase })}
            </p>
            <p className="text-muted-foreground">
              {tPhases(phaseNameKeys[fromPhase] ?? "theCalling")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-2xl font-bold text-primary">
              {t("advancingTo", { phase: toPhase })}
            </p>
            <p className="text-muted-foreground">
              {tPhases(phaseNameKeys[toPhase] ?? "theExplorer")}
            </p>
            <Button onClick={handleManualContinue} size="lg">
              {t("continue")}
            </Button>
            {!autoAdvanceCancelled && (
              <p className="text-xs text-muted-foreground/70" aria-live="polite">
                {t("autoAdvance")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
