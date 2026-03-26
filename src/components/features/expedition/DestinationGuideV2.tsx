"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasCard } from "@/components/ui/AtlasCard";
import { AtlasBadge } from "@/components/ui/AtlasBadge";
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
import { AI_COSTS } from "@/types/gamification.types";
import type { DestinationGuideContent, GuideSectionKey } from "@/types/ai.types";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";

// ─── Section keys ────────────────────────────────────────────────────────────

const STAT_SECTIONS: GuideSectionKey[] = [
  "timezone", "currency", "language", "electricity",
];

const CONTENT_SECTIONS: GuideSectionKey[] = [
  "connectivity", "cultural_tips", "safety", "health", "transport_overview", "local_customs",
];

/** V2 left accent color for content section cards */
const SECTION_ACCENT_MAP: Record<string, string> = {
  connectivity: "!border-l-4 !border-l-atlas-info",
  cultural_tips: "!border-l-4 !border-l-atlas-warning",
  safety: "!border-l-4 !border-l-atlas-error",
  health: "!border-l-4 !border-l-atlas-success",
  transport_overview: "!border-l-4 !border-l-atlas-secondary",
  local_customs: "!border-l-4 !border-l-atlas-tertiary-fixed-dim",
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface DestinationGuideV2Props {
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
  accessMode?: PhaseAccessMode;
  tripCurrentPhase?: number;
  completedPhases?: number[];
  availablePoints?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DestinationGuideV2({
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
}: DestinationGuideV2Props) {
  const t = useTranslations("expedition.phase5");
  const tExpedition = useTranslations("expedition");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [guide, setGuide] = useState(initialGuide?.content ?? null);
  const [_generationCount, setGenerationCount] = useState(initialGuide?.generationCount ?? 0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [bulkPointsAwarded, setBulkPointsAwarded] = useState(false);
  const [showPAConfirm, setShowPAConfirm] = useState(false);
  const [paBalance, setPABalance] = useState(availablePoints);
  const [isSpending, setIsSpending] = useState(false);

  const guideCost = AI_COSTS.ai_accommodation;

  // Auto-generate on first visit
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
        .catch(() => {})
        .finally(() => { handleGenerate(); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-update hash check
  const hasCheckedHashRef = useRef(false);
  useEffect(() => {
    if (!hasCheckedHashRef.current && initialGuide && tripDataHash && storedDataHash && tripDataHash !== storedDataHash) {
      hasCheckedHashRef.current = true;
      setShowRegenerateConfirm(true);
    }
  }, [initialGuide, tripDataHash, storedDataHash]);

  // Bulk points on guide load
  useEffect(() => {
    if (guide && !bulkPointsAwarded) {
      setBulkPointsAwarded(true);
      bulkViewGuideSectionsAction(tripId).catch(() => {});
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
      router.push(`/expedition/${tripId}/phase-6`);
    } catch {
      setErrorMessage("errors.generic");
      setIsCompleting(false);
    }
  }

  // ─── Generating skeleton ─────────────────────────────────────────────────

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
        <div className="mt-6 grid grid-cols-1 md:grid-cols-10 gap-4" data-testid="guide-v2-skeleton">
          <AtlasCard loading className="md:col-span-6 h-32" />
          <AtlasCard loading className="md:col-span-4 h-32" />
          {Array.from({ length: 6 }).map((_, i) => (
            <AtlasCard key={i} loading className="md:col-span-5 h-40" />
          ))}
        </div>
        <p className="mt-4 text-center text-sm font-atlas-body text-atlas-on-surface-variant">
          {tCommon("loading")}
        </p>
      </PhaseShell>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────

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
      {/* V2 hero header — large destination name + AI badge */}
      <header className="mt-6 mb-8" data-testid="guide-v2-header">
        <div className="flex items-center gap-3 mb-3">
          <AtlasBadge variant="ai-tip">AI</AtlasBadge>
        </div>
        <h1 className="text-3xl md:text-4xl font-atlas-headline font-bold text-atlas-on-surface tracking-tight">
          {t("title")}: {destination}
        </h1>
        <p className="mt-2 text-base font-atlas-body text-atlas-on-surface-variant">
          {t("subtitle")}
        </p>
      </header>

      {errorMessage && (
        <AtlasCard variant="base" className="mt-4 !bg-atlas-error-container !border-atlas-error/30" role="alert">
          <p className="text-sm font-atlas-body text-atlas-error">
            {errorMessage.startsWith("errors.")
              ? tErrors(errorMessage.replace("errors.", ""))
              : errorMessage}
          </p>
        </AtlasCard>
      )}

      {/* Regenerate confirm */}
      {showRegenerateConfirm && (
        <AtlasCard
          variant="base"
          className="mt-4 !border-atlas-warning/30 !bg-atlas-warning-container/20"
          role="alertdialog"
          aria-label={t("regenerateConfirm")}
          data-testid="regenerate-confirm-dialog-v2"
        >
          <p className="text-sm font-atlas-body text-atlas-on-surface">
            {t("regenerateConfirm")}
          </p>
          <div className="mt-3 flex gap-2">
            <AtlasButton
              size="sm"
              variant="danger"
              onClick={() => {
                setShowRegenerateConfirm(false);
                handleRequestGenerate();
              }}
            >
              {t("regenerateConfirmYes")}
            </AtlasButton>
            <AtlasButton
              size="sm"
              variant="secondary"
              onClick={() => setShowRegenerateConfirm(false)}
            >
              {t("regenerateConfirmNo")}
            </AtlasButton>
          </div>
        </AtlasCard>
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

      {/* Generate button (no guide) */}
      {!guide && (
        <>
          <div className="mt-8 text-center">
            <p className="mb-4 text-sm font-atlas-body text-atlas-on-surface-variant">
              {t("generateHint")}
            </p>
          </div>
          <WizardFooter
            onBack={() => router.push(`/expedition/${tripId}/phase-4`)}
            onPrimary={handleRequestGenerate}
            primaryLabel={t("generateCta")}
            isLoading={isGenerating}
            isDisabled={isGenerating}
          />
        </>
      )}

      {/* Guide content — V2 bento grid layout */}
      {guide && (
        <>
          {/* Bento grid — 10 columns on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-10 gap-4" data-testid="guide-v2-bento">

            {/* Quick reference card — spans 6 cols (hero summary) */}
            <AtlasCard
              variant="dark"
              className="md:col-span-6"
              data-testid="hero-banner-v2"
            >
              <h2 className="text-xl font-atlas-headline font-bold mb-4">
                {t("heroTitle")}
              </h2>
              <p className="text-sm font-atlas-body leading-relaxed opacity-90">
                {STAT_SECTIONS.map((key) => {
                  const section = guide[key];
                  if (!section) return null;
                  return `${section.icon} ${section.title}: ${section.summary}`;
                })
                  .filter(Boolean)
                  .join(" \u00B7 ")}
              </p>
            </AtlasCard>

            {/* Stat cards panel — spans 4 cols */}
            <AtlasCard
              variant="base"
              className="md:col-span-4 !bg-atlas-surface-container-low"
              data-testid="stat-cards-v2"
            >
              <h2 className="text-lg font-atlas-headline font-bold mb-4 text-atlas-on-surface">
                {t("heroTitle")}
              </h2>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                {STAT_SECTIONS.map((key) => {
                  const section = guide[key];
                  if (!section) {
                    return (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-xs font-atlas-body text-atlas-on-surface-variant">
                          {t("sectionUnavailable")}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-atlas-primary-container">
                        <span className="text-lg" aria-hidden="true">{section.icon}</span>
                        <span className="text-[10px] font-atlas-body font-bold uppercase tracking-widest text-atlas-on-surface-variant">
                          {section.title}
                        </span>
                      </div>
                      <span className="text-base font-atlas-headline font-bold text-atlas-on-surface">
                        {section.summary}
                      </span>
                      {section.tips.length > 0 && (
                        <ul className="mt-0.5">
                          {section.tips.map((tip, i) => (
                            <li key={i} className="text-[10px] font-atlas-body text-atlas-on-surface-variant leading-tight">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </AtlasCard>

            {/* Content sections — bento cards with accent borders */}
            {CONTENT_SECTIONS.map((key) => {
              const section = guide[key];
              const accentClass = SECTION_ACCENT_MAP[key] ?? "";
              // Safety and first content card span 5 cols each (side by side)
              const spanClass = "md:col-span-5";

              if (!section) {
                return (
                  <AtlasCard
                    key={key}
                    variant="base"
                    className={`${spanClass} min-h-[160px] ${accentClass}`}
                    data-testid={`content-card-${key}`}
                  >
                    <p className="text-xs font-atlas-body text-atlas-on-surface-variant">
                      {t("sectionUnavailable")}
                    </p>
                  </AtlasCard>
                );
              }

              return (
                <AtlasCard
                  key={key}
                  variant="base"
                  className={`${spanClass} min-h-[160px] ${accentClass}`}
                  data-testid={`content-card-${key}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" aria-hidden="true">{section.icon}</span>
                      <h3 className="text-base font-atlas-headline font-bold text-atlas-on-surface">
                        {section.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm font-atlas-body text-atlas-on-surface leading-relaxed">
                    {section.summary}
                  </p>
                  {section.details && (
                    <p className="mt-2 text-sm font-atlas-body text-atlas-on-surface-variant leading-relaxed">
                      {section.details}
                    </p>
                  )}
                  {section.tips.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {section.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm font-atlas-body text-atlas-on-surface-variant">
                          <span className="mt-0.5 text-atlas-primary-container flex-shrink-0" aria-hidden="true">&#x2022;</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                </AtlasCard>
              );
            })}
          </div>

          {/* Regenerate button */}
          <div className="mt-6 flex justify-center">
            <AtlasButton
              variant="secondary"
              size="sm"
              onClick={handleRequestGenerate}
              disabled={isGenerating}
            >
              {t("regenerateCta", { remaining: "" })}
            </AtlasButton>
          </div>

          {/* AI disclaimer */}
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
