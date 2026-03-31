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
import { isGuideV2 } from "@/types/ai.types";
import type { DestinationGuideContent, DestinationGuideContentV2 } from "@/types/ai.types";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";

// ─── Constants ────────────────────────────────────────────────────────────────

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
    label: "Atencao",
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

/** Category icons for mustSee items */
const CATEGORY_ICONS: Record<string, string> = {
  nature: "\u{1F333}",
  culture: "\u{1F3DB}",
  food: "\u{1F37D}",
  nightlife: "\u{1F319}",
  sport: "\u{26BD}",
  adventure: "\u{1F3D4}",
};

/** Quick fact icons */
const QUICK_FACT_ICONS: Record<string, string> = {
  climate: "\u{1F321}",
  currency: "\u{1F4B0}",
  language: "\u{1F5E3}",
  timezone: "\u{1F552}",
  plugType: "\u{1F50C}",
  dialCode: "\u{1F4F1}",
};

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
      {/* B1 skeleton -- 6 cols */}
      <div className={`md:col-span-6 ${BENTO_CARD_BASE} overflow-hidden`}>
        <SkeletonPulse className="h-64 w-full !rounded-none" />
        <div className="p-8 space-y-3">
          <SkeletonPulse className="w-full h-4" />
          <SkeletonPulse className="w-[90%] h-4" />
          <SkeletonPulse className="w-[75%] h-4" />
        </div>
      </div>
      {/* B2 skeleton -- 4 cols */}
      <div className={`md:col-span-4 bg-atlas-surface-container-low rounded-xl border border-atlas-outline-variant/15 shadow-[0px_24px_48px_rgba(4,13,27,0.06)] p-8`}>
        <SkeletonPulse className="w-[140px] h-5 mb-6" />
        <div className="grid grid-cols-2 gap-y-8 gap-x-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonPulse key={i} className="w-[80%] h-[42px]" />
          ))}
        </div>
      </div>
      {/* B3 skeleton -- 5 cols */}
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
      {/* B4 skeleton -- 5 cols */}
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
      {/* B5 skeleton -- 10 cols */}
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

// ─── V2 Bento Card Sub-components ────────────────────────────────────────────

/** B1 -- "Sobre o Destino" card with hero image and overview */
function AboutDestinationCardV2({ guide, destination }: {
  guide: DestinationGuideContentV2;
  destination: string;
}) {
  const destInfo = guide.destination;

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
        <div className="absolute bottom-4 left-6 text-white">
          <span className="font-atlas-headline font-bold text-base block">
            {destInfo?.name ?? destination}
          </span>
          {destInfo?.nickname && (
            <span className="text-white/80 text-xs font-atlas-body italic">
              {destInfo.nickname}
            </span>
          )}
        </div>
      </div>
      {/* Content area */}
      <div className="p-6">
        <h2 className="text-lg font-bold font-atlas-headline mb-3 flex items-center gap-2">
          <span className="text-atlas-secondary-container" aria-hidden="true">
            {"\u2139\uFE0F"}
          </span>
          Sobre o Destino
        </h2>
        {destInfo?.subtitle && (
          <p className="text-sm font-medium text-atlas-on-surface mb-3 font-atlas-body">
            {destInfo.subtitle}
          </p>
        )}
        {destInfo?.overview && destInfo.overview.length > 0 ? (
          destInfo.overview.map((paragraph, i) => (
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

/** B2 -- "Informacoes Rapidas" quick facts 2x3 grid */
function QuickFactsCardV2({ guide }: { guide: DestinationGuideContentV2 }) {
  const qf = guide.quickFacts;
  if (!qf) return null;

  const facts = [
    { key: "climate", icon: QUICK_FACT_ICONS.climate, label: qf.climate?.label ?? "Clima", value: qf.climate?.value },
    { key: "currency", icon: QUICK_FACT_ICONS.currency, label: qf.currency?.label ?? "Moeda", value: qf.currency?.value },
    { key: "language", icon: QUICK_FACT_ICONS.language, label: qf.language?.label ?? "Idioma", value: qf.language?.value },
    { key: "timezone", icon: QUICK_FACT_ICONS.timezone, label: qf.timezone?.label ?? "Fuso", value: qf.timezone?.value },
    { key: "plugType", icon: QUICK_FACT_ICONS.plugType, label: qf.plugType?.label ?? "Tomada", value: qf.plugType?.value },
    { key: "dialCode", icon: QUICK_FACT_ICONS.dialCode, label: qf.dialCode?.label ?? "DDI", value: qf.dialCode?.value },
  ];

  return (
    <div
      className="md:col-span-4 bg-atlas-surface-container-low rounded-xl p-5 shadow-[0px_24px_48px_rgba(4,13,27,0.06)] border border-atlas-outline-variant/15"
      data-testid="quick-facts-card"
    >
      <h2 className="text-lg font-bold font-atlas-headline mb-4 text-atlas-on-surface">
        {"Informacoes Rapidas"}
      </h2>
      <div className="grid grid-cols-2 gap-y-4 gap-x-3">
        {facts.map((fact) => (
          <div key={fact.key} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-atlas-secondary">
              <span aria-hidden="true" className="text-sm">{fact.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-atlas-on-surface-variant font-atlas-body">
                {fact.label}
              </span>
            </div>
            <span className="text-sm font-bold text-atlas-on-surface font-atlas-body">
              {fact.value ?? "\u2014"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** B3 -- "Dicas de Seguranca" safety card with level badge and emergency numbers */
function SafetyCardV2({ guide, locale }: { guide: DestinationGuideContentV2; locale: string }) {
  const safety = guide.safety;
  if (!safety) return null;

  const level: SafetyLevel = safety.level ?? "safe";
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
            {"Dicas de Seguranca"}
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
        {safety.tips.length > 0 ? (
          <ul className="space-y-4">
            {safety.tips.map((tip, i) => (
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
        ) : null}
      </div>
      {/* Emergency numbers */}
      {safety.emergencyNumbers && (
        <div className="mt-4 p-3 bg-atlas-surface-container-low rounded-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-atlas-on-surface-variant mb-2 font-atlas-body">
            Emergencia
          </p>
          <div className="flex flex-wrap gap-3 text-xs font-atlas-body text-atlas-on-surface">
            <span>Policia: {safety.emergencyNumbers.police}</span>
            <span>Ambulancia: {safety.emergencyNumbers.ambulance}</span>
            {safety.emergencyNumbers.tourist && (
              <span>Turismo: {safety.emergencyNumbers.tourist}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** B4 -- "Custos Medios Diarios" three-column cost comparison table */
function CostsCardV2({ guide }: { guide: DestinationGuideContentV2 }) {
  const costs = guide.dailyCosts;
  if (!costs) return null;

  return (
    <div
      className={`md:col-span-10 ${BENTO_CARD_BASE} p-6 overflow-hidden`}
      data-testid="costs-card"
    >
      <h2 className="text-lg font-bold font-atlas-headline mb-4 text-atlas-on-surface">
        {"Custos Médios Diários"}
      </h2>

      {/* Table layout for better readability */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-atlas-body">
          <thead>
            <tr className="border-b border-atlas-surface-container">
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-atlas-on-surface-variant pb-2 pr-4" />
              <th className="text-center text-[10px] font-bold uppercase tracking-widest text-atlas-on-surface-variant pb-2 px-3 whitespace-nowrap">Econômico</th>
              <th className="text-center text-[10px] font-bold uppercase tracking-widest text-atlas-on-surface-variant pb-2 px-3 whitespace-nowrap">Moderado</th>
              <th className="text-center text-[10px] font-bold uppercase tracking-widest text-atlas-on-surface-variant pb-2 px-3 whitespace-nowrap">Premium</th>
            </tr>
          </thead>
          <tbody>
            {costs.items.map((item, i) => (
              <tr
                key={i}
                className={i < costs.items.length - 1 ? "border-b border-atlas-surface-container" : ""}
              >
                <td className="text-atlas-on-surface-variant font-medium py-2.5 pr-4 whitespace-nowrap">
                  {item.category}
                </td>
                <td className="font-bold text-atlas-on-surface text-center py-2.5 px-3">
                  {item.budget}
                </td>
                <td className="font-bold text-atlas-on-surface text-center py-2.5 px-3">
                  {item.mid}
                </td>
                <td className="font-bold text-atlas-on-surface text-center py-2.5 px-3">
                  {item.premium}
                </td>
              </tr>
            ))}
          </tbody>
          {costs.dailyTotal && (
            <tfoot>
              <tr className="bg-atlas-surface-container-low">
                <td className="font-bold text-atlas-on-surface py-2.5 pr-4 rounded-l-lg pl-2">Total/dia</td>
                <td className="font-bold text-atlas-secondary text-center py-2.5 px-3">
                  {costs.dailyTotal.budget}
                </td>
                <td className="font-bold text-atlas-secondary text-center py-2.5 px-3">
                  {costs.dailyTotal.mid}
                </td>
                <td className="font-bold text-atlas-secondary text-center py-2.5 px-3 rounded-r-lg">
                  {costs.dailyTotal.premium}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Money-saving tip */}
      {costs.tip && (
        <div className="mt-4 p-3 bg-atlas-surface-container-low rounded-lg flex items-center gap-3">
          <span className="text-atlas-secondary flex-shrink-0" aria-hidden="true">
            {"\u{1F4A1}"}
          </span>
          <p className="text-xs text-atlas-on-surface-variant font-atlas-body">
            {costs.tip}
          </p>
        </div>
      )}
    </div>
  );
}

/** B5 -- "O que nao perder" mustSee horizontal carousel */
function MustSeeCardV2({ guide }: { guide: DestinationGuideContentV2 }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const mustSee = guide.mustSee;
  if (!mustSee || mustSee.length === 0) return null;

  return (
    <div
      className={`md:col-span-10 ${BENTO_CARD_BASE} p-6`}
      data-testid="attractions-card"
    >
      <h2 className="text-lg font-bold font-atlas-headline mb-4 text-atlas-on-surface">
        {"O que nao perder"}
      </h2>
      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-6 scroll-smooth [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-atlas-surface-container-low [&::-webkit-scrollbar-thumb]:bg-atlas-secondary-container [&::-webkit-scrollbar-thumb]:rounded-full"
        role="region"
        aria-label="Attractions carousel"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {mustSee.map((item, i) => (
          <div
            key={i}
            className="min-w-[280px] bg-white rounded-xl overflow-hidden shadow-sm group focus-visible:outline-2 focus-visible:outline-atlas-secondary-container focus-visible:outline-offset-2"
            tabIndex={0}
          >
            {/* Gradient placeholder for image */}
            <div className="h-40 relative overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-atlas-surface-container-high to-atlas-secondary-container/30 group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-500" />
              {/* Category chip */}
              <span className="absolute top-3 left-3 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-atlas-body flex items-center gap-1">
                <span aria-hidden="true">{CATEGORY_ICONS[item.category] ?? "\u{1F4CD}"}</span>
                {item.category}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-bold font-atlas-headline text-atlas-on-surface mb-1">
                {item.name}
              </h3>
              <div className="flex gap-3 text-[10px] text-atlas-on-surface-variant font-atlas-body mb-2">
                <span>{item.estimatedTime}</span>
                <span>{item.costRange}</span>
              </div>
              <p className="text-xs text-atlas-on-surface-variant font-atlas-body line-clamp-2">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── V1 Fallback ──────────────────────────────────────────────────────────────

/** Renders a simplified fallback for legacy v1 guide data with a regenerate prompt */
function LegacyGuideFallback({ onRegenerate }: { onRegenerate: () => void }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm font-atlas-body text-atlas-on-surface-variant mb-4">
        Este guia foi gerado em uma versao anterior. Regenere para obter o novo formato com custos, atracoes e mais.
      </p>
      <AtlasButton variant="primary" onClick={onRegenerate}>
        Regenerar Guia
      </AtlasButton>
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

  const [guide, setGuide] = useState<DestinationGuideContent | null>(initialGuide?.content ?? null);
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

  const insufficientPA = paBalance < guideCost;

  // Auto-regenerate when trip data has changed since last guide generation
  const hasCheckedHashRef = useRef(false);
  useEffect(() => {
    if (!hasCheckedHashRef.current && initialGuide && tripDataHash && storedDataHash && tripDataHash !== storedDataHash) {
      hasCheckedHashRef.current = true;
      // Data changed -- auto-regenerate without user prompt
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

  // ─── Determine guide version ──────────────────────────────────────────────

  const guideIsV2 = guide !== null && isGuideV2(guide);
  const guideV2 = guideIsV2 ? (guide as DestinationGuideContentV2) : null;

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
      {/* V2 Page Header */}
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

      {/* Empty state -- no guide yet, manual generation */}
      {!guide && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="text-5xl mb-4" aria-hidden="true">{"\uD83D\uDDFA\uFE0F"}</div>
          <h2 className="text-xl font-bold font-atlas-headline text-atlas-on-surface mb-2">
            {t("emptyStateTitle", { destination })}
          </h2>
          <p className="text-sm text-atlas-on-surface-variant font-atlas-body mb-2 max-w-md">
            {t("emptyStateDescription", { destination })}
          </p>
          <p className="text-sm font-semibold text-atlas-on-tertiary-container mb-6">
            {t("emptyStateCost", { cost: guideCost })}
          </p>
          <AtlasButton onClick={handleRequestGenerate} disabled={isGenerating || insufficientPA}>
            {isGenerating ? t("generating") : t("generateCta")}
          </AtlasButton>
          {insufficientPA && (
            <p className="text-xs text-destructive mt-2">{t("insufficientPA")}</p>
          )}
        </div>
      )}

      {/* Legacy v1 guide -- show fallback with regenerate prompt */}
      {guide && !guideIsV2 && (
        <>
          <LegacyGuideFallback onRegenerate={handleRequestGenerate} />
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

      {/* V2 Guide content -- bento grid layout */}
      {guideV2 && (
        <>
          <div
            className="grid grid-cols-1 md:grid-cols-10 gap-6 max-w-7xl"
            data-testid="guide-v2-bento"
          >
            {/* B1 -- Sobre o Destino (6 cols) */}
            <AboutDestinationCardV2 guide={guideV2} destination={destination} />

            {/* B2 -- Informacoes Rapidas (4 cols) */}
            <QuickFactsCardV2 guide={guideV2} />

            {/* B3 -- Dicas de Seguranca (5 cols) */}
            <SafetyCardV2 guide={guideV2} locale={locale} />

            {/* B4 -- Custos Medios Diarios (5 cols) */}
            <CostsCardV2 guide={guideV2} />

            {/* B5 -- O que nao perder (10 cols full width) */}
            <MustSeeCardV2 guide={guideV2} />
          </div>

          {/* AI disclaimer */}
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
