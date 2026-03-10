"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PointsAnimation } from "./PointsAnimation";
import { PhaseTransition } from "./PhaseTransition";
import { ExpeditionProgressBar } from "./ExpeditionProgressBar";
import {
  generateDestinationGuideAction,
  completePhase5Action,
  viewGuideSectionAction,
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

const SECTION_ORDER: GuideSectionKey[] = [...STAT_SECTIONS, ...CONTENT_SECTIONS];

export function DestinationGuideWizard({
  tripId,
  destination,
  locale,
  initialGuide,
}: DestinationGuideWizardProps) {
  const t = useTranslations("expedition.phase5");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [guide, setGuide] = useState(initialGuide?.content ?? null);
  const [_generationCount, setGenerationCount] = useState(
    initialGuide?.generationCount ?? 0
  );
  const [viewedSections, setViewedSections] = useState<string[]>(
    initialGuide?.viewedSections ?? []
  );
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [sectionPoints, setSectionPoints] = useState<string | null>(null);
  const [animationData, setAnimationData] = useState<{
    points: number;
    badge?: BadgeKey | null;
    rank?: Rank | null;
  }>({ points: 0 });

  async function handleGenerate() {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const result = await generateDestinationGuideAction(tripId, locale);

      if (!result.success) {
        setErrorMessage(result.error);
        setIsGenerating(false);
        return;
      }

      setGuide(result.data!.content);
      setGenerationCount(result.data!.generationCount);
      // All sections are auto-viewed after generation (scoring is automatic)
      setViewedSections([...SECTION_ORDER]);
      setExpandedSection(null);
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleToggleSection(key: GuideSectionKey) {
    if (expandedSection === key) {
      setExpandedSection(null);
      return;
    }

    setExpandedSection(key);

    // Award points for first view
    if (!viewedSections.includes(key)) {
      try {
        const result = await viewGuideSectionAction(tripId, key);
        if (result.success && result.data!.pointsAwarded > 0) {
          setViewedSections((prev) => [...prev, key]);
          setSectionPoints(key);
          setTimeout(() => setSectionPoints(null), 2000);
        }
      } catch {
        // Non-blocking — don't show error for points
      }
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
            {errorMessage}
          </div>
        )}

        {/* Generate / Regenerate button */}
        {!guide && (
          <div className="mt-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">
              {t("generateHint")}
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              size="lg"
              className="w-full"
            >
              {isGenerating ? tCommon("loading") : t("generateCta")}
            </Button>
          </div>
        )}

        {/* Guide sections — card-based layout */}
        {guide && (
          <>
            {/* Stat cards — compact grid, always visible */}
            <div className="mt-6 grid grid-cols-2 gap-2" data-testid="stat-cards">
              {STAT_SECTIONS.map((key) => {
                const section = guide[key];
                if (!section) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleSection(key)}
                    className="relative flex flex-col items-center gap-1 rounded-lg border border-border bg-card p-3 text-center transition-all hover:border-atlas-gold/30"
                    aria-expanded={expandedSection === key}
                    data-section-type="stat"
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
                    {sectionPoints === key && (
                      <span className="absolute -top-2 right-2 animate-bounce rounded-full bg-atlas-gold px-2 py-0.5 text-xs font-bold text-atlas-ink">
                        +5
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Stat card expanded detail */}
            {expandedSection && STAT_SECTIONS.includes(expandedSection as GuideSectionKey) && guide[expandedSection as GuideSectionKey] && (
              <div className="mt-2 rounded-lg border border-atlas-gold/30 bg-card p-4">
                <p className="text-sm text-foreground">{guide[expandedSection as GuideSectionKey]!.summary}</p>
                {guide[expandedSection as GuideSectionKey]!.tips.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {guide[expandedSection as GuideSectionKey]!.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="mt-0.5 text-atlas-gold" aria-hidden="true">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Content cards — expandable list */}
            <div className="mt-4 flex flex-col gap-2" data-testid="content-cards">
              {CONTENT_SECTIONS.map((key) => {
                const section = guide[key];
                if (!section) return null;
                const isExpanded = expandedSection === key;
                const isViewed = viewedSections.includes(key);

                return (
                  <div key={key} className="relative">
                    <button
                      type="button"
                      onClick={() => handleToggleSection(key)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                        isExpanded
                          ? "border-atlas-gold bg-atlas-gold/5"
                          : isViewed
                            ? "border-atlas-teal/30 bg-atlas-teal/5"
                            : "border-border bg-card hover:border-atlas-gold/30"
                      }`}
                      aria-expanded={isExpanded}
                      data-section-type="content"
                    >
                      <span className="text-xl" aria-hidden="true">
                        {section.icon}
                      </span>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">
                          {section.title}
                        </span>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {section.summary}
                        </p>
                      </div>
                      {isViewed && !isExpanded && (
                        <span className="text-xs text-atlas-teal" aria-hidden="true">
                          ✓
                        </span>
                      )}
                      <svg
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Expanded content with details */}
                    {isExpanded && (
                      <div className="mt-1 rounded-b-lg border border-t-0 border-atlas-gold/30 bg-card p-4">
                        <p className="text-sm text-foreground">
                          {section.summary}
                        </p>
                        {section.details && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {section.details}
                          </p>
                        )}
                        {section.tips.length > 0 && (
                          <ul className="mt-3 flex flex-col gap-1.5">
                            {section.tips.map((tip, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-xs text-muted-foreground"
                              >
                                <span className="mt-0.5 text-atlas-gold" aria-hidden="true">
                                  •
                                </span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Points popup */}
                    {sectionPoints === key && (
                      <span className="absolute -top-2 right-2 animate-bounce rounded-full bg-atlas-gold px-2 py-0.5 text-xs font-bold text-atlas-ink">
                        +5
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI disclaimer */}
            <p className="mt-4 text-center text-xs text-muted-foreground italic">
              {t("aiDisclaimer")}
            </p>

            {/* Complete button */}
            <div className="mt-6">
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                size="lg"
                className="w-full"
              >
                {isCompleting ? tCommon("loading") : t("completeCta")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
