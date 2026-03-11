"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_ADVANCE_DELAY_S = 3;
const COMPLETION_FADE_MS = 300;
const INLINE_FADE_MS = 200;
const INLINE_SLIDE_PX = 8;
const CROSSFADE_MS = 150;

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransitionVariant = "completion" | "inline" | "crossfade";

interface PhaseTransitionProps {
  fromPhase: number;
  toPhase: number;
  onContinue: () => void;
  /** Transition variant. Defaults to "completion" (interstitial). */
  variant?: TransitionVariant;
  /** Navigation direction for inline variant. */
  direction?: "forward" | "back";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PhaseTransition({
  fromPhase,
  toPhase,
  onContinue,
  variant = "completion",
  direction = "forward",
}: PhaseTransitionProps) {
  const t = useTranslations("expedition.transition");
  const tPhases = useTranslations("gamification.phases");
  const [showAdvancing, setShowAdvancing] = useState(false);
  const [autoAdvanceCancelled, setAutoAdvanceCancelled] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_ADVANCE_DELAY_S);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const newPhaseRef = useRef<HTMLHeadingElement>(null);

  const phaseNameKeys: Record<number, string> = {
    1: "theCalling",
    2: "theExplorer",
    3: "thePreparation",
    4: "theLogistics",
    5: "theDayMap",
    6: "theTreasure",
    7: "theExpedition",
    8: "theLegacy",
  };

  // Check for prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // For non-completion variants, auto-advance immediately with appropriate timing
  useEffect(() => {
    if (variant !== "completion") {
      const delay = prefersReducedMotion
        ? 0
        : variant === "inline"
          ? INLINE_FADE_MS
          : CROSSFADE_MS;
      const timer = setTimeout(() => {
        onContinueRef.current();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [variant, prefersReducedMotion]);

  // Show "advancing" state after initial celebration (completion variant only)
  useEffect(() => {
    if (variant !== "completion") return;

    const delay = prefersReducedMotion ? 0 : 1200;
    const advanceTimer = setTimeout(() => {
      setShowAdvancing(true);
    }, delay);
    return () => clearTimeout(advanceTimer);
  }, [variant, prefersReducedMotion]);

  // Start countdown and auto-advance timer after showing "advancing" state
  useEffect(() => {
    if (variant !== "completion") return;
    if (!showAdvancing || autoAdvanceCancelled) return;

    // Countdown interval (1s ticks)
    setCountdown(AUTO_ADVANCE_DELAY_S);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    // Auto-advance after full countdown
    autoAdvanceTimerRef.current = setTimeout(() => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      onContinueRef.current();
    }, AUTO_ADVANCE_DELAY_S * 1000);

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [showAdvancing, autoAdvanceCancelled, variant]);

  // Focus management: focus the new phase heading after transition
  useEffect(() => {
    if (showAdvancing && newPhaseRef.current) {
      newPhaseRef.current.focus();
    }
  }, [showAdvancing]);

  const handleManualContinue = useCallback(() => {
    // Cancel auto-advance timer to prevent double invocation
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoAdvanceCancelled(true);
    onContinueRef.current();
  }, []);

  const handleBackdropClick = useCallback(() => {
    // Cancel auto-advance but do NOT dismiss
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setAutoAdvanceCancelled(true);
  }, []);

  // ─── Inline variant ────────────────────────────────────────────────────────
  if (variant === "inline") {
    const slideDirection = direction === "forward" ? INLINE_SLIDE_PX : -INLINE_SLIDE_PX;
    return (
      <div
        className={`transition-all ${prefersReducedMotion ? "" : "duration-200"}`}
        style={
          prefersReducedMotion
            ? undefined
            : {
                animation: `fadeSlide ${INLINE_FADE_MS}ms ease-out`,
                ["--slide-x" as string]: `${slideDirection}px`,
              }
        }
        role="status"
        aria-live="polite"
      >
        <p className="sr-only">{t("nowOnPhase", { phase: toPhase })}</p>
      </div>
    );
  }

  // ─── Crossfade variant ─────────────────────────────────────────────────────
  if (variant === "crossfade") {
    return (
      <div
        className={`transition-opacity ${prefersReducedMotion ? "" : `duration-[${CROSSFADE_MS}ms]`}`}
        role="status"
        aria-live="polite"
      >
        <p className="sr-only">{t("nowOnPhase", { phase: toPhase })}</p>
      </div>
    );
  }

  // ─── Completion variant (interstitial dialog) ──────────────────────────────
  const fadeDuration = prefersReducedMotion ? "duration-0" : `duration-[${COMPLETION_FADE_MS}ms]`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity ${fadeDuration}`}
      role="dialog"
      aria-modal="true"
      aria-label={
        showAdvancing
          ? t("advancingTo", { phase: toPhase })
          : t("phaseCompleted", { phase: fromPhase })
      }
      onClick={handleBackdropClick}
      data-testid="phase-transition-backdrop"
    >
      {/* Trap focus inside dialog by stopping propagation */}
      <div
        className="flex flex-col items-center gap-6 rounded-2xl bg-card p-8 shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
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
            <h2
              ref={newPhaseRef}
              tabIndex={-1}
              className="text-2xl font-bold text-primary outline-none"
            >
              {t("advancingTo", { phase: toPhase })}
            </h2>
            <p className="text-muted-foreground">
              {tPhases(phaseNameKeys[toPhase] ?? "theExplorer")}
            </p>
            <Button onClick={handleManualContinue} size="lg">
              {t("continue")}
            </Button>
            {!autoAdvanceCancelled && (
              <p
                className="text-xs text-muted-foreground/70"
                aria-live="polite"
                data-testid="countdown-text"
              >
                {t("autoAdvance", { seconds: countdown })}
              </p>
            )}
            {autoAdvanceCancelled && (
              <p
                className="text-xs text-muted-foreground/70"
                aria-live="polite"
              >
                {t("autoAdvanceCancelled")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Screen reader announcement */}
      <div aria-live="assertive" className="sr-only">
        {showAdvancing && t("nowOnPhase", { phase: toPhase })}
      </div>
    </div>
  );
}
