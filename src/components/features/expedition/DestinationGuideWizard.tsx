"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PhaseShell } from "./PhaseShell";
import { AiDisclaimer } from "./AiDisclaimer";
import { WizardFooter } from "./WizardFooter";
import { PAConfirmationModal } from "@/components/features/gamification/PAConfirmationModal";
import {
  generateDestinationGuideAction,
  completePhase5Action,
  bulkViewGuideSectionsAction,
} from "@/server/actions/expedition.actions";
import { spendPAForAIAction } from "@/server/actions/gamification.actions";
import { useAiServiceStatus } from "@/hooks/useAiServiceStatus";
import { AiServicePausedBanner } from "@/components/features/ai/AiServicePausedBanner";
import { AI_COSTS } from "@/types/gamification.types";
import type { DestinationGuideContentV1, GuideSectionKey } from "@/types/ai.types";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";

interface DestinationGuideWizardProps {
  tripId: string;
  destination: string;
  locale: string;
  initialGuide?: {
    content: DestinationGuideContentV1;
    generationCount: number;
    viewedSections: string[];
  } | null;
  tripDataHash?: string | null;
  storedDataHash?: string | null;
  /** Access mode from navigation engine */
  accessMode?: PhaseAccessMode;
  /** Trip's current phase from DB */
  tripCurrentPhase?: number;
  /** Completed phase numbers from DB */
  completedPhases?: number[];
  /** User's available PA balance for cost gate */
  availablePoints?: number;
}

const STAT_SECTIONS: GuideSectionKey[] = [
  "timezone",
  "currency",
  "language",
  "electricity",
];

const CONTENT_SECTIONS: GuideSectionKey[] = [
  "connectivity",
  "cultural_tips",
  "safety",
  "health",
  "transport_overview",
  "local_customs",
];

/** Left accent border color for each content section per SPEC-UX-002 */
const CONTENT_SECTION_COLORS: Record<string, string> = {
  connectivity: "border-l-blue-500",
  cultural_tips: "border-l-amber-500",
  safety: "border-l-red-500",
  health: "border-l-green-500",
  transport_overview: "border-l-indigo-500",
  local_customs: "border-l-purple-500",
};

export function DestinationGuideWizard({
  tripId,
  destination,
  locale,
  initialGuide,
  tripDataHash,
  storedDataHash,
  accessMode = "first_visit",
  tripCurrentPhase = 5,
  completedPhases = [],
  availablePoints = 0,
}: DestinationGuideWizardProps) {
  const t = useTranslations("expedition.phase5");
  const tExpedition = useTranslations("expedition");
  const tCommon = useTranslations("common");
  const tAi = useTranslations("ai.service");
  const aiStatus = useAiServiceStatus();
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [guide, setGuide] = useState(initialGuide?.content ?? null);
  const [_generationCount, setGenerationCount] = useState(
    initialGuide?.generationCount ?? 0
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [bulkPointsAwarded, setBulkPointsAwarded] = useState(false);
  const [showPAConfirm, setShowPAConfirm] = useState(false);
  const [paBalance, setPABalance] = useState(availablePoints);
  const [isSpending, setIsSpending] = useState(false);

  const guideCost = AI_COSTS.ai_accommodation; // 50 PA for guide

  // Auto-generate: on first visit when no guide, auto-spend PA then generate
  // (no modal on auto-trigger -- the user navigated here intentionally)
  const hasTriggeredRef = useRef(false);
  useEffect(() => {
    if (!initialGuide && !isGenerating && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      spendPAForAIAction(tripId, "ai_accommodation")
        .then((result) => {
          if (result.success && result.data && "remainingBalance" in result.data) {
            setPABalance(result.data.remainingBalance);
          }
        })
        .catch(() => {
          // Non-blocking: proceed with generation
        })
        .finally(() => {
          handleGenerate();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-update check: if trip data changed, show confirmation dialog
  const hasCheckedHashRef = useRef(false);
  useEffect(() => {
    if (
      !hasCheckedHashRef.current &&
      initialGuide &&
      tripDataHash &&
      storedDataHash &&
      tripDataHash !== storedDataHash
    ) {
      hasCheckedHashRef.current = true;
      setShowRegenerateConfirm(true);
    }
  }, [initialGuide, tripDataHash, storedDataHash]);

  // Award bulk points when guide loads (once)
  useEffect(() => {
    if (guide && !bulkPointsAwarded) {
      setBulkPointsAwarded(true);
      bulkViewGuideSectionsAction(tripId).catch(() => {
        // Non-blocking — don't show error for points
      });
    }
  }, [guide, bulkPointsAwarded, tripId]);

  function handleRequestGenerate() {
    setShowPAConfirm(true);
  }

  async function handlePAConfirmAndGenerate() {
    setIsSpending(true);
    setErrorMessage(null);

    try {
      const spendResult = await spendPAForAIAction(tripId, "ai_accommodation");
      if (!spendResult.success) {
        setErrorMessage(spendResult.error);
        setIsSpending(false);
        return;
      }

      if (spendResult.data && "remainingBalance" in spendResult.data) {
        setPABalance(spendResult.data.remainingBalance);
      }

      setShowPAConfirm(false);
      setIsSpending(false);
      await handleGenerate();
    } catch {
      setErrorMessage("errors.generic");
      setIsSpending(false);
    }
  }

  async function handleGenerate() {
    setIsGenerating(true);
    setErrorMessage(null);
    setShowRegenerateConfirm(false);

    try {
      const result = await generateDestinationGuideAction(tripId, locale);

      if (!result.success) {
        setErrorMessage(result.error);
        setIsGenerating(false);
        return;
      }

      setGuide(result.data!.content as DestinationGuideContentV1);
      setGenerationCount(result.data!.generationCount);
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleComplete() {
    setIsCompleting(true);
    setErrorMessage(null);

    // If revisiting an already-completed phase, skip the action and navigate
    if (accessMode === "revisit" && completedPhases.includes(5)) {
      router.push(`/expedition/${tripId}/phase-6`);
      return;
    }

    try {
      const result = await completePhase5Action(tripId);

      if (!result.success) {
        setErrorMessage(result.error);
        setIsCompleting(false);
        return;
      }

      // Navigate directly to phase 6 (no animation/transition)
      router.push(`/expedition/${tripId}/phase-6`);
    } catch {
      setErrorMessage("errors.generic");
      setIsCompleting(false);
    }
  }

  // Skeleton loading state
  if (isGenerating) {
    return (
      <PhaseShell
        tripId={tripId}
        viewingPhase={5}
        tripCurrentPhase={tripCurrentPhase}
        completedPhases={completedPhases}
        phaseTitle={t("title")}
        phaseSubtitle={t("subtitle")}
        showFooter={false}
      >
        {/* Skeleton: hero banner */}
        <div
          className="mt-6 h-24 w-full animate-pulse rounded-lg bg-muted"
          data-testid="skeleton-hero"
        />

        {/* Skeleton: 4 stat cards */}
        <div className="mt-4 grid grid-cols-2 gap-2" data-testid="skeleton-stats">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>

        {/* Skeleton: 6 content sections */}
        <div className="mt-4 flex flex-col gap-2" data-testid="skeleton-content">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {tCommon("loading")}
        </p>
      </PhaseShell>
    );
  }

  return (
    <PhaseShell
      tripId={tripId}
      viewingPhase={5}
      tripCurrentPhase={tripCurrentPhase}
      completedPhases={completedPhases}
      phaseTitle={t("title")}
      phaseSubtitle={t("subtitle")}
      isEditMode={accessMode === "revisit"}
      showFooter={false}
    >
      <p className="mt-2 text-center text-sm text-atlas-teal-light">{destination}</p>

      {errorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30"
        >
          {errorMessage.startsWith("errors.")
            ? tErrors(errorMessage.replace("errors.", ""))
            : errorMessage}
        </div>
      )}

      {/* Regenerate confirmation dialog (auto-update check) */}
      {showRegenerateConfirm && (
        <div
          className="mt-4 rounded-lg border border-atlas-warning bg-atlas-warning-container p-4 dark:border-atlas-warning/40 dark:bg-atlas-warning-container/10"
          role="alertdialog"
          aria-label={t("regenerateConfirm")}
          data-testid="regenerate-confirm-dialog"
        >
          <p className="text-sm text-atlas-warning dark:text-atlas-warning">
            {t("regenerateConfirm")}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setShowRegenerateConfirm(false);
                handleRequestGenerate();
              }}
            >
              {t("regenerateConfirmYes")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRegenerateConfirm(false)}
            >
              {t("regenerateConfirmNo")}
            </Button>
          </div>
        </div>
      )}

      {/* PA Confirmation Modal */}
      <PAConfirmationModal
        isOpen={showPAConfirm}
        onClose={() => setShowPAConfirm(false)}
        onConfirm={handlePAConfirmAndGenerate}
        featureName={t("title")}
        paCost={guideCost}
        currentBalance={paBalance}
        isLoading={isSpending}
      />

      {/* Generate button + back (when no guide) */}
      {!guide && (
        <>
          <div className="mt-8 space-y-4">
            <AiServicePausedBanner />
            <p className="text-center text-sm text-muted-foreground">
              {t("generateHint")}
            </p>
          </div>
          <WizardFooter
            onBack={() => router.push(`/expedition/${tripId}/phase-4`)}
            onPrimary={handleRequestGenerate}
            primaryLabel={aiStatus.paused ? tAi("paused.buttonDisabled") : t("generateCta")}
            isLoading={isGenerating}
            isDisabled={isGenerating || aiStatus.paused}
          />
        </>
      )}

      {/* Guide sections — always visible, no collapse */}
      {guide && (
        <>
          {/* Hero summary banner — paragraph format */}
          <div
            className="mt-6 rounded-lg border border-atlas-teal/30 bg-atlas-teal/5 p-4"
            data-testid="hero-banner"
          >
            <h2 className="text-sm font-semibold text-foreground mb-2">
              {t("heroTitle")}
            </h2>
            <p className="text-sm text-foreground leading-relaxed">
              {STAT_SECTIONS.map((key) => {
                const section = guide[key];
                if (!section) return null;
                return `${section.icon} ${section.title}: ${section.summary}`;
              })
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          {/* Stat cards — compact grid, always visible */}
          <div className="mt-4 grid grid-cols-2 gap-2" data-testid="stat-cards">
            {STAT_SECTIONS.map((key) => {
              const section = guide[key];
              if (!section) {
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-center min-h-[120px] justify-center"
                    data-section-type="stat"
                    data-section-key={key}
                  >
                    <span className="text-xs text-muted-foreground">
                      {t("sectionUnavailable")}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={key}
                  className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-center min-h-[120px] justify-center"
                  data-section-type="stat"
                  data-section-key={key}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {section.icon}
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {section.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground line-clamp-2">
                    {section.summary}
                  </span>
                  {section.tips.length > 0 && (
                    <ul className="mt-1 w-full">
                      {section.tips.map((tip, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1 text-[10px] text-muted-foreground"
                        >
                          <span className="text-atlas-gold" aria-hidden="true">
                            -
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Content sections — always visible, no collapse, with accent borders */}
          <div className="mt-4 flex flex-col gap-2" data-testid="content-cards">
            {CONTENT_SECTIONS.map((key) => {
              const section = guide[key];
              const accentColor =
                CONTENT_SECTION_COLORS[key] ?? "border-l-gray-500";

              if (!section) {
                return (
                  <div
                    key={key}
                    className={`rounded-lg border border-l-4 ${accentColor} bg-card p-4 min-h-[140px]`}
                    data-section-type="content"
                    data-section-key={key}
                  >
                    <p className="text-xs text-muted-foreground">
                      {t("sectionUnavailable")}
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={key}
                  className={`rounded-lg border border-l-4 ${accentColor} bg-card p-4 min-h-[140px]`}
                  data-section-type="content"
                  data-section-key={key}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl" aria-hidden="true">
                      {section.icon}
                    </span>
                    <h3 className="text-sm font-medium text-foreground">
                      {section.title}
                    </h3>
                  </div>
                  <p className="text-sm text-foreground">{section.summary}</p>
                  {section.details && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {section.details}
                    </p>
                  )}
                  {section.tips.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {section.tips.map((tip, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <span
                            className="mt-0.5 text-atlas-gold"
                            aria-hidden="true"
                          >
                            -
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* AI disclaimer — standardized component */}
          <div className="mt-4">
            <AiDisclaimer message={t("aiDisclaimer")} />
          </div>

          {/* Navigation */}
          <div className="mt-3">
            <WizardFooter
              onBack={() => router.push(`/expedition/${tripId}/phase-4`)}
              onPrimary={handleComplete}
              primaryLabel={tExpedition("cta.advance")}
              isLoading={isCompleting}
              isDisabled={isCompleting}
            />
          </div>
        </>
      )}
    </PhaseShell>
  );
}
