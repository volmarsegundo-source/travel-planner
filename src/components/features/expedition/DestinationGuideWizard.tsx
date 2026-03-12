"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PointsAnimation } from "./PointsAnimation";
import { PhaseTransition } from "./PhaseTransition";
import { ExpeditionProgressBar } from "./ExpeditionProgressBar";
import { WizardFooter } from "./WizardFooter";
import {
  generateDestinationGuideAction,
  completePhase5Action,
  bulkViewGuideSectionsAction,
} from "@/server/actions/expedition.actions";
import type { BadgeKey, Rank } from "@/types/gamification.types";
import type { DestinationGuideContent, GuideSectionKey } from "@/types/ai.types";

interface DestinationGuideWizardProps {
  tripId: string;
  destination: string;
  locale: string;
  initialGuide?: {
    content: DestinationGuideContent;
    generationCount: number;
    viewedSections: string[];
  } | null;
  tripDataHash?: string | null;
  storedDataHash?: string | null;
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
}: DestinationGuideWizardProps) {
  const t = useTranslations("expedition.phase5");
  const tExpedition = useTranslations("expedition");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [guide, setGuide] = useState(initialGuide?.content ?? null);
  const [_generationCount, setGenerationCount] = useState(
    initialGuide?.generationCount ?? 0
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [bulkPointsAwarded, setBulkPointsAwarded] = useState(false);
  const [animationData, setAnimationData] = useState<{
    points: number;
    badge?: BadgeKey | null;
    rank?: Rank | null;
  }>({ points: 0 });

  // Auto-generate guide on first visit when no guide exists
  const hasTriggeredRef = useRef(false);
  useEffect(() => {
    if (!initialGuide && !isGenerating && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      handleGenerate();
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

      setGuide(result.data!.content);
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

    try {
      const result = await completePhase5Action(tripId);

      if (!result.success) {
        setErrorMessage(result.error);
        setIsCompleting(false);
        return;
      }

      setAnimationData({
        points: result.data!.pointsEarned,
        badge: result.data!.badgeAwarded as BadgeKey | null,
        rank: result.data!.newRank as Rank | null,
      });
      setShowAnimation(true);
    } catch {
      setErrorMessage("errors.generic");
      setIsCompleting(false);
    }
  }

  function handleAnimationDismiss() {
    setShowAnimation(false);
    setShowTransition(true);
  }

  function handleTransitionContinue() {
    setShowTransition(false);
    router.push(`/expedition/${tripId}/phase-6`);
  }

  if (showAnimation) {
    return (
      <PointsAnimation
        points={animationData.points}
        badge={animationData.badge}
        rank={animationData.rank}
        onDismiss={handleAnimationDismiss}
      />
    );
  }

  if (showTransition) {
    return (
      <PhaseTransition
        fromPhase={5}
        toPhase={6}
        onContinue={handleTransitionContinue}
      />
    );
  }

  // Skeleton loading state
  if (isGenerating) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <ExpeditionProgressBar currentPhase={5} totalPhases={8} tripId={tripId} />
          <div className="mt-4 text-center">
            <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          </div>

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
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <ExpeditionProgressBar currentPhase={5} totalPhases={8} tripId={tripId} />

        {/* Header */}
        <div className="mt-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
          <p className="mt-2 text-sm text-atlas-teal-light">{destination}</p>
        </div>

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
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/30"
            role="alertdialog"
            aria-label={t("regenerateConfirm")}
            data-testid="regenerate-confirm-dialog"
          >
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t("regenerateConfirm")}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleGenerate}
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

        {/* Generate button + back (when no guide) */}
        {!guide && (
          <>
            <div className="mt-8 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                {t("generateHint")}
              </p>
            </div>
            <WizardFooter
              onBack={() => router.push(`/expedition/${tripId}/phase-4`)}
              onPrimary={handleGenerate}
              primaryLabel={t("generateCta")}
              isLoading={isGenerating}
              isDisabled={isGenerating}
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

            {/* AI disclaimer */}
            <p className="mt-4 text-center text-xs text-muted-foreground italic">
              {t("aiDisclaimer")}
            </p>

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
      </div>
    </div>
  );
}
