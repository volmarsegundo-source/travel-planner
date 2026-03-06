"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface PhaseTransitionProps {
  fromPhase: number;
  toPhase: number;
  onContinue: () => void;
}

export function PhaseTransition({ fromPhase, toPhase, onContinue }: PhaseTransitionProps) {
  const t = useTranslations("expedition.transition");
  const tPhases = useTranslations("gamification.phases");
  const [showAdvancing, setShowAdvancing] = useState(false);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

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

  useEffect(() => {
    const advanceTimer = setTimeout(() => {
      setShowAdvancing(true);
    }, 1200);
    return () => clearTimeout(advanceTimer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-2xl text-center">
        <div className="text-5xl" aria-hidden="true">
          {showAdvancing ? "🚀" : "✅"}
        </div>

        {!showAdvancing ? (
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-bold text-gray-900">
              {t("phaseCompleted", { phase: fromPhase })}
            </p>
            <p className="text-gray-500">
              {tPhases(phaseNameKeys[fromPhase] ?? "theCalling")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-2xl font-bold text-primary">
              {t("advancingTo", { phase: toPhase })}
            </p>
            <p className="text-gray-500">
              {tPhases(phaseNameKeys[toPhase] ?? "theExplorer")}
            </p>
            <Button onClick={() => onContinueRef.current()} size="lg">
              {t("continue")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
