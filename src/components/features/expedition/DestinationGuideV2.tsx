"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { PhaseShell } from "./PhaseShell";
import { getDestinationImage } from "@/lib/utils/destination-images";
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

// ─── Constants ────────────────────────────────────────────────────────────────

/** Quick fact keys displayed in the 2x3 grid */
const QUICK_FACT_KEYS: GuideSectionKey[] = [
  "timezone", "currency", "language", "electricity",
];

/** Content sections rendered as bento cards below the quick facts */
const CONTENT_SECTIONS: GuideSectionKey[] = [
  "connectivity", "cultural_tips", "safety", "health", "transport_overview", "local_customs",
];

/** Icon mapping for quick facts — using emoji as acceptable per UX checklist */
const QUICK_FACT_ICONS: Record<string, string> = {
  timezone: "\u{1F552}",     // clock
  currency: "\u{1F4B0}",    // money bag
  language: "\u{1F5E3}",    // speaking head
  electricity: "\u{1F50C}", // plug
};

/** Safety level config for the colored badge */
const SAFETY_LEVEL_CONFIG = {
  safe: {
    label: "Seguro",
    labelEn: "Safe",
    dotClass: "bg-atlas-on-tertiary-container",
    textClass: "text-atlas-on-tertiary-container",
    bgClass: "bg-atlas-on-tertiary-container/10",
  },
  moderate: {
    label: "Atenção",
    labelEn: "Moderate",
    dotClass: "bg-atlas-secondary",
    textClass: "text-atlas-secondary",
    bgClass: "bg-atlas-secondary/10",
  },
  caution: {
    label: "Cautela",
    labelEn: "Caution",
    dotClass: "bg-atlas-error",
    textClass: "text-atlas-error",
    bgClass: "bg-atlas-error/10",
  },
} as const;

type SafetyLevel = keyof typeof SAFETY_LEVEL_CONFIG;

/** Bento card shared CSS */
const BENTO_CARD_BASE =
  "bg-atlas-surface-container-lowest rounded-xl border border-atlas-outline-variant/15 shadow-[0px_24px_48px_rgba(4,13,27,0.06)]";

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

// ─── Skeleton Sub-components ─────────────────────────────────────────────────

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`bg-atlas-surface-container-high animate-pulse motion-reduce:animate-none rounded ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

function HeaderSkeleton() {
  return (
    <header className="mb-6 max-w-5xl" aria-hidden="true">
      <SkeletonPulse className="w-[120px] h-6 rounded-full mb-4" />
      <SkeletonPulse className="w-[70%] h-12 mb-2" />
      <SkeletonPulse className="w-[85%] h-6" />
    </header>
  );
}

function BentoSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-10 gap-6 max-w-7xl" data-testid="guide-v2-skeleton">
      {/* B1 skeleton — 6 cols */}
      <div className={`md:col-span-6 ${BENTO_CARD_BASE} overflow-hidden`}>
        <SkeletonPulse className="h-64 w-full !rounded-none" />
        <div className="p-8 space-y-3">
          <SkeletonPulse className="w-full h-4" />
          <SkeletonPulse className="w-[90%] h-4" />
          <SkeletonPulse className="w-[75%] h-4" />
        </div>
      </div>
      {/* B2 skeleton — 4 cols */}
      <div className={`md:col-span-4 bg-atlas-surface-container-low rounded-xl border border-atlas-outline-variant/15 shadow-[0px_24px_48px_rgba(4,13,27,0.06)] p-8`}>
        <SkeletonPulse className="w-[140px] h-5 mb-6" />
        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonPulse key={i} className="w-[80%] h-[42px]" />
          ))}
        </div>
      </div>
      {/* B3 skeleton — 5 cols */}
      <div className={`md:col-span-5 ${BENTO_CARD_BASE} p-8`}>
        <div className="flex justify-between mb-6">
          <SkeletonPulse className="w-[140px] h-5" />
          <SkeletonPulse className="w-[80px] h-5 rounded-full" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 mb-4">
            <SkeletonPulse className="w-6 h-6 rounded-full flex-shrink-0" />
            <SkeletonPulse className={`h-4 ${i === 0 ? "w-full" : i === 1 ? "w-[85%]" : "w-[70%]"}`} />
          </div>
        ))}
      </div>
      {/* B4 skeleton — 5 cols */}
      <div className={`md:col-span-5 ${BENTO_CARD_BASE} p-8`}>
        <SkeletonPulse className="w-[130px] h-5 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between py-2 mb-2">
            <SkeletonPulse className="w-[60%] h-4" />
            <SkeletonPulse className="w-[30%] h-4" />
          </div>
        ))}
        <SkeletonPulse className="w-full h-12 rounded-lg mt-6" />
      </div>
      {/* B5 skeleton — 10 cols */}
      <div className={`md:col-span-10 ${BENTO_CARD_BASE} p-8`}>
        <SkeletonPulse className="w-[160px] h-5 mb-6" />
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[280px] rounded-xl overflow-hidden">
              <SkeletonPulse className="h-40 w-full !rounded-none" />
              <div className="p-4 space-y-2">
                <SkeletonPulse className="w-full h-4" />
                <SkeletonPulse className="w-[70%] h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Bento Card Sub-components ───────────────────────────────────────────────

/** B1 — "Sobre o Destino" card with hero image and description */
function AboutDestinationCard({ guide, destination }: {
  guide: DestinationGuideContent;
  destination: string;
}) {
  // Use connectivity or cultural_tips section data as the "about" narrative
  const aboutSection = guide.connectivity ?? guide.cultural_tips;
  const safetySection = guide.safety;

  // Compose overview paragraphs from available sections
  const overviewParagraphs: string[] = [];
  if (aboutSection?.summary) overviewParagraphs.push(aboutSection.summary);
  if (aboutSection?.details) overviewParagraphs.push(aboutSection.details);
  if (overviewParagraphs.length === 0 && safetySection?.summary) {
    overviewParagraphs.push(safetySection.summary);
  }

  return (
    <div
      className={`md:col-span-6 ${BENTO_CARD_BASE} overflow-hidden flex flex-col`}
      data-testid="about-destination-card"
    >
      {/* Hero image area with gradient overlay */}
      <div className="h-64 relative bg-gradient-to-br from-atlas-primary to-atlas-secondary-container">
        {(() => {
          const imgUrl = getDestinationImage(destination);
          return imgUrl ? (
            <img
              src={imgUrl}
              alt={destination}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : null;
        })()}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute bottom-4 left-6 text-white font-atlas-headline font-bold text-base">
          {destination}
        </span>
      </div>
      {/* Content area */}
      <div className="p-6">
        <h2 className="text-lg font-bold font-atlas-headline mb-3 flex items-center gap-2">
          <span className="text-atlas-secondary-container" aria-hidden="true">
            {"\u2139\uFE0F"}
          </span>
          Sobre o Destino
        </h2>
        {overviewParagraphs.length > 0 ? (
          overviewParagraphs.map((paragraph, i) => (
            <p
              key={i}
              className="text-atlas-on-surface-variant leading-relaxed font-atlas-body mb-4 last:mb-0"
            >
              {paragraph}
            </p>
          ))
        ) : (
          <p className="text-sm font-atlas-body text-atlas-on-surface-variant">
            {"\u2014"}
          </p>
        )}
      </div>
    </div>
  );
}

/** B2 — "Informacoes Rapidas" quick facts grid */
function QuickFactsCard({ guide }: { guide: DestinationGuideContent }) {
  const facts = QUICK_FACT_KEYS.map((key) => {
    const section = guide[key];
    return {
      key,
      icon: QUICK_FACT_ICONS[key] ?? "\u{2139}",
      label: section?.title ?? key,
      value: section?.summary ?? "\u2014",
    };
  });

  // Add DDI and Tomada from the electricity section tips if available
  const electricitySection = guide.electricity;
  const extraFacts: Array<{ key: string; icon: string; label: string; value: string }> = [];

  // Try to extract power outlet info from electricity
  if (electricitySection) {
    extraFacts.push({
      key: "powerOutlet",
      icon: "\u{26A1}",
      label: "Tomada",
      value: electricitySection.tips?.[0] ?? electricitySection.summary ?? "\u2014",
    });
  }

  // Try to extract dial code from connectivity
  const connectivitySection = guide.connectivity;
  if (connectivitySection) {
    extraFacts.push({
      key: "dialCode",
      icon: "\u{1F4F1}",
      label: "DDI",
      value: connectivitySection.tips?.[0] ?? connectivitySection.summary ?? "\u2014",
    });
  }

  // Take up to 6 facts total
  const allFacts = [...facts, ...extraFacts].slice(0, 6);

  return (
    <div
      className="md:col-span-4 bg-atlas-surface-container-low rounded-xl p-5 shadow-[0px_24px_48px_rgba(4,13,27,0.06)] border border-atlas-outline-variant/15"
      data-testid="quick-facts-card"
    >
      <h2 className="text-lg font-bold font-atlas-headline mb-4 text-atlas-on-surface">
        {"Informações Rápidas"}
      </h2>
      <div className="grid grid-cols-2 gap-y-4 gap-x-3">
        {allFacts.map((fact) => (
          <div key={fact.key} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-atlas-secondary">
              <span aria-hidden="true" className="text-sm">{fact.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-atlas-on-surface-variant font-atlas-body">
                {fact.label}
              </span>
            </div>
            <span className="text-sm font-bold text-atlas-on-surface font-atlas-body">
              {fact.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** B3 — "Dicas de Seguranca" safety card with level badge */
function SafetyCard({ guide, locale }: { guide: DestinationGuideContent; locale: string }) {
  const safetySection = guide.safety;
  if (!safetySection) return null;

  // Determine safety level from the section data
  const summaryLower = (safetySection.summary ?? "").toLowerCase();
  let level: SafetyLevel = "safe";
  if (summaryLower.includes("cautela") || summaryLower.includes("caution") || summaryLower.includes("perig")) {
    level = "caution";
  } else if (summaryLower.includes("aten") || summaryLower.includes("moderate") || summaryLower.includes("moder")) {
    level = "moderate";
  }

  const config = SAFETY_LEVEL_CONFIG[level];
  const badgeLabel = locale === "en" ? config.labelEn : config.label;

  return (
    <div
      className={`md:col-span-5 ${BENTO_CARD_BASE} p-6 flex flex-col justify-between`}
      data-testid="safety-card"
    >
      <div>
        <div className="flex flex-wrap justify-between items-start mb-4 gap-2">
          <h2 className="text-lg font-bold font-atlas-headline text-atlas-on-surface">
            {"Dicas de Segurança"}
          </h2>
          <div
            className={`flex items-center gap-2 ${config.bgClass} ${config.textClass} px-3 py-1 rounded-full text-xs font-bold font-atlas-body`}
            role="status"
            aria-label={badgeLabel}
          >
            <div className={`w-2 h-2 rounded-full ${config.dotClass}`} aria-hidden="true" />
            {badgeLabel}
          </div>
        </div>
        {safetySection.tips.length > 0 ? (
          <ul className="space-y-4">
            {safetySection.tips.map((tip, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="text-atlas-secondary-container flex-shrink-0" aria-hidden="true">
                  {"\u2705"}
                </span>
                <p className="text-on-surface-variant text-sm font-atlas-body text-atlas-on-surface-variant">
                  {tip}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-atlas-body text-atlas-on-surface-variant">
            {safetySection.summary}
          </p>
        )}
      </div>
    </div>
  );
}

/** B4 — "Custos Medios" average costs card */
function CostsCard({ guide }: { guide: DestinationGuideContent }) {
  // Build cost items from available content sections
  const costItems: Array<{ label: string; range: string }> = [];
  const localCustoms = guide.local_customs;
  const transportSection = guide.transport_overview;
  const healthSection = guide.health;

  // Attempt to extract cost data from section tips
  if (transportSection?.tips) {
    transportSection.tips.forEach((tip) => {
      if (tip.includes("€") || tip.includes("$") || tip.includes("R$") || tip.includes("USD")) {
        costItems.push({ label: "Transporte", range: tip });
      }
    });
  }
  if (healthSection?.tips) {
    healthSection.tips.forEach((tip) => {
      if (tip.includes("€") || tip.includes("$") || tip.includes("R$")) {
        costItems.push({ label: "Saúde", range: tip });
      }
    });
  }
  if (localCustoms?.tips) {
    localCustoms.tips.forEach((tip) => {
      if (tip.includes("€") || tip.includes("$") || tip.includes("R$")) {
        costItems.push({ label: "Geral", range: tip });
      }
    });
  }

  // If no structured cost data from tips, show transport and local customs summaries
  if (costItems.length === 0) {
    if (transportSection) {
      costItems.push({ label: "Transporte", range: transportSection.summary });
    }
    if (localCustoms) {
      costItems.push({ label: "Costumes Locais", range: localCustoms.summary });
    }
    if (healthSection) {
      costItems.push({ label: "Saúde", range: healthSection.summary });
    }
  }

  const localTip = localCustoms?.details ?? transportSection?.details ?? null;

  return (
    <div
      className={`md:col-span-5 ${BENTO_CARD_BASE} p-6 overflow-hidden`}
      data-testid="costs-card"
    >
      <h2 className="text-lg font-bold font-atlas-headline mb-4 text-atlas-on-surface">
        {"Custos Médios"}
      </h2>
      {costItems.length > 0 ? (
        <div className="space-y-0">
          {costItems.map((item, i) => (
            <div
              key={i}
              className={`flex justify-between items-center py-2 min-w-0 ${
                i < costItems.length - 1 ? "border-b border-atlas-surface-container" : ""
              }`}
            >
              <span className="text-xs text-atlas-on-surface-variant font-medium font-atlas-body truncate min-w-0">
                {item.label}
              </span>
              <span className="text-xs font-bold text-atlas-on-surface font-atlas-body text-right ml-2 flex-shrink-0 max-w-[55%] break-words">
                {item.range}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm font-atlas-body text-atlas-on-surface-variant">
          {"\u2014"}
        </p>
      )}
      {localTip && (
        <div className="mt-6 p-4 bg-atlas-surface-container-low rounded-lg flex items-center gap-3">
          <span className="text-atlas-secondary flex-shrink-0" aria-hidden="true">
            {"\u{1F4A1}"}
          </span>
          <p className="text-xs text-atlas-on-surface-variant font-atlas-body">
            {localTip}
          </p>
        </div>
      )}
    </div>
  );
}

/** B5 — "O que nao perder" attractions horizontal carousel */
function AttractionsCard({ guide }: { guide: DestinationGuideContent }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build attraction list from content sections that have tips
  const attractions: Array<{ name: string; description: string }> = [];

  // cultural_tips tips become "attractions"
  const culturalSection = guide.cultural_tips;
  if (culturalSection?.tips) {
    culturalSection.tips.forEach((tip) => {
      attractions.push({
        name: tip.split(":")[0]?.trim().substring(0, 40) ?? tip.substring(0, 40),
        description: tip,
      });
    });
  }

  // local_customs tips as additional attractions
  const localCustoms = guide.local_customs;
  if (localCustoms?.tips && attractions.length < 4) {
    localCustoms.tips.forEach((tip) => {
      if (attractions.length < 8) {
        attractions.push({
          name: tip.split(":")[0]?.trim().substring(0, 40) ?? tip.substring(0, 40),
          description: tip,
        });
      }
    });
  }

  if (attractions.length === 0) return null;

  return (
    <div
      className={`md:col-span-10 ${BENTO_CARD_BASE} p-6`}
      data-testid="attractions-card"
    >
      <h2 className="text-lg font-bold font-atlas-headline mb-4 text-atlas-on-surface">
        {"O que não perder"}
      </h2>
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-6 scroll-smooth [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-atlas-surface-container-low [&::-webkit-scrollbar-thumb]:bg-atlas-secondary-container [&::-webkit-scrollbar-thumb]:rounded-full"
        role="region"
        aria-label="Attractions carousel"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {attractions.map((attraction, i) => (
          <div
            key={i}
            className="min-w-[280px] bg-white rounded-xl overflow-hidden shadow-sm group focus-visible:outline-2 focus-visible:outline-atlas-secondary-container focus-visible:outline-offset-2"
            tabIndex={0}
          >
            {/* Gradient placeholder for image */}
            <div className="h-40 relative overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-atlas-surface-container-high to-atlas-secondary-container/30 group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-500" />
            </div>
            <div className="p-4">
              <h3 className="font-bold font-atlas-headline text-atlas-on-surface mb-1">
                {attraction.name}
              </h3>
              <p className="text-xs text-atlas-on-surface-variant font-atlas-body line-clamp-2">
                {attraction.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

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
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [guide, setGuide] = useState(initialGuide?.content ?? null);
  const [_generationCount, setGenerationCount] = useState(initialGuide?.generationCount ?? 0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bulkPointsAwarded, setBulkPointsAwarded] = useState(false);
  const [showPAConfirm, setShowPAConfirm] = useState(false);
  const [paBalance, setPABalance] = useState(availablePoints);
  const [isSpending, setIsSpending] = useState(false);

  const guideCost = AI_COSTS.ai_accommodation;

  const handleRequestGenerate = useCallback(() => {
    setShowPAConfirm(true);
  }, []);

  const handleGenerate = useCallback(async () => {
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
    } catch {
      setErrorMessage("errors.generic");
    } finally {
      setIsGenerating(false);
    }
  }, [tripId, locale]);

  // Stable ref for handleGenerate to use in effects without dependency issues
  const handleGenerateRef = useRef(handleGenerate);
  handleGenerateRef.current = handleGenerate;

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
        .finally(() => { handleGenerateRef.current(); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-regenerate when trip data has changed since last guide generation
  const hasCheckedHashRef = useRef(false);
  useEffect(() => {
    if (!hasCheckedHashRef.current && initialGuide && tripDataHash && storedDataHash && tripDataHash !== storedDataHash) {
      hasCheckedHashRef.current = true;
      // Data changed — auto-regenerate without user prompt
      spendPAForAIAction(tripId, "ai_accommodation")
        .then((result) => {
          if (result.success && result.data && "remainingBalance" in result.data) {
            setPABalance(result.data.remainingBalance);
          }
        })
        .catch(() => {})
        .finally(() => { handleGenerateRef.current(); });
    }
  }, [initialGuide, tripDataHash, storedDataHash, tripId]);

  // Bulk points on guide load
  useEffect(() => {
    if (guide && !bulkPointsAwarded) {
      setBulkPointsAwarded(true);
      bulkViewGuideSectionsAction(tripId).catch(() => {});
    }
  }, [guide, bulkPointsAwarded, tripId]);

  const handlePAConfirmAndGenerate = useCallback(async () => {
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
  }, [tripId, handleGenerate]);

  const handleComplete = useCallback(async () => {
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
  }, [tripId, accessMode, completedPhases, router]);

  // ─── Loading / Generating state ──────────────────────────────────────────

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
        <HeaderSkeleton />
        <BentoSkeleton />
        <p className="mt-4 text-center text-sm font-atlas-body text-atlas-on-surface-variant">
          {t("generateHint")}
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
      {/* V2 Page Header — AC-P5-001 through AC-P5-003 */}
      <header className="mb-6 max-w-5xl" data-testid="guide-v2-header">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="bg-atlas-primary-fixed text-atlas-on-primary-fixed px-3 py-1 rounded-full text-xs font-bold tracking-wide font-atlas-body inline-flex items-center gap-1"
            role="status"
            aria-label="Gerado por IA"
          >
            <svg
              className="size-[18px]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1.27c.34-.6.99-1 1.73-1a2 2 0 1 1 0 4c-.74 0-1.39-.4-1.73-1H21a7 7 0 0 1-7 7v1.27c.6.34 1 .99 1 1.73a2 2 0 1 1-4 0c0-.74.4-1.39 1-1.73V23a7 7 0 0 1-7-7H3.73c-.34.6-.99 1-1.73 1a2 2 0 1 1 0-4c.74 0 1.39.4 1.73 1H5a7 7 0 0 1 7-7V5.73C11.4 5.39 11 4.74 11 4a2 2 0 0 1 1-1.73V2z" />
            </svg>
            Gerado por IA
          </span>
        </div>
        <h1 className="text-2xl font-atlas-headline font-bold text-atlas-on-surface tracking-tight mb-2">
          {t("title")}: {destination}
        </h1>
        <p className="text-base font-medium font-atlas-body text-atlas-on-surface-variant">
          {guide ? t("subtitle") : t("generateHint")}
        </p>
      </header>

      {/* Error display */}
      {errorMessage && (
        <div
          className={`${BENTO_CARD_BASE} p-6 !bg-atlas-error-container !border-atlas-error/30 mb-6`}
          role="alert"
        >
          <p className="text-sm font-atlas-body text-atlas-error">
            {errorMessage.startsWith("errors.")
              ? tErrors(errorMessage.replace("errors.", ""))
              : errorMessage}
          </p>
        </div>
      )}

      {/* Regenerate confirm dialog removed — auto-regeneration handles data changes */}

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

      {/* Empty state — no guide yet */}
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
          {/* 10-column bento grid — AC-P5-006 through AC-P5-041 */}
          <div
            className="grid grid-cols-1 md:grid-cols-10 gap-6 max-w-7xl"
            data-testid="guide-v2-bento"
          >
            {/* B1 — Sobre o Destino (6 cols) */}
            <AboutDestinationCard guide={guide} destination={destination} />

            {/* B2 — Informacoes Rapidas (4 cols) */}
            <QuickFactsCard guide={guide} />

            {/* B3 — Dicas de Seguranca (5 cols) */}
            <SafetyCard guide={guide} locale={locale} />

            {/* B4 — Custos Medios (5 cols) */}
            <CostsCard guide={guide} />

            {/* B5 — O que nao perder (10 cols full width) */}
            <AttractionsCard guide={guide} />
          </div>

          {/* AI disclaimer — plain centered italic text per spec AC-P5-042 */}
          <footer className="mt-12 mb-20 text-center max-w-2xl mx-auto" role="note" data-testid="ai-disclaimer">
            <p className="text-[10px] text-atlas-on-surface-variant/60 leading-relaxed italic font-atlas-body">
              {t("aiDisclaimer")}
            </p>
          </footer>

          {/* Navigation footer */}
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
