"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { PhaseShell } from "./PhaseShell";
import { DestinationImage } from "@/components/ui/DestinationImage";
import { PhaseFooter } from "./PhaseFooter";
import { AiGenerationProgress } from "./AiGenerationProgress";
import { PAConfirmationModal } from "@/components/features/gamification/PAConfirmationModal";
import { AiConsentModal } from "@/components/features/consent/AiConsentModal";
import { toast } from "@/lib/toast";
import {
  completePhase3Action,
  completePhase5Action,
  bulkViewGuideSectionsAction,
} from "@/server/actions/expedition.actions";
import { streamDestinationGuide } from "@/lib/ai/guide-stream-client";
import { spendPAForAIAction, refundPAForAIAction } from "@/server/actions/gamification.actions";
import { AI_COSTS } from "@/types/gamification.types";
import { isGuideV2 } from "@/types/ai.types";
import type { DestinationGuideContent, DestinationGuideContentV2 } from "@/types/ai.types";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";

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

/** Personalization categories (SPEC-GUIA-PERSONALIZACAO) */
const GUIDE_CATEGORIES = [
  { key: "festivals_events", emoji: "\uD83C\uDF89" },
  { key: "nightlife_clubs", emoji: "\uD83C\uDF19" },
  { key: "beaches", emoji: "\uD83C\uDFD6\uFE0F" },
  { key: "shows_entertainment", emoji: "\uD83C\uDFAD" },
  { key: "recommended_restaurants", emoji: "\uD83C\uDF7D\uFE0F" },
  { key: "shopping_markets", emoji: "\uD83D\uDECD\uFE0F" },
  { key: "museums_galleries", emoji: "\uD83C\uDFDB\uFE0F" },
  { key: "parks_nature", emoji: "\uD83C\uDF3F" },
  { key: "local_experiences", emoji: "\uD83C\uDF0D" },
] as const;

/** Maximum re-generations per expedition (BR-003) */
const MAX_REGENS = 5;
/** PA cost for re-generation (BR-001) */
const REGEN_COST = 50;

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
    regenCount?: number;
    extraCategories?: string[];
    personalNotes?: string | null;
  } | null;
  tripDataHash?: string | null;
  storedDataHash?: string | null;
  accessMode?: PhaseAccessMode;
  tripCurrentPhase?: number;
  completedPhases?: number[];
  availablePoints?: number;
  /**
   * True when the server detects the guide was generated within a short
   * window before the current render (post-generation remount). Suppresses
   * the revisit banner on the first-time generation flow. Sprint 43 QA UX.
   */
  isJustGenerated?: boolean;
  /** When true, all AI generation CTAs are disabled with an age restriction tooltip. */
  isAgeRestricted?: boolean;
  /** AI consent status from UserProfile. null = never asked, false = refused, true = consented. */
  aiConsentGiven?: boolean | null;
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
        <DestinationImage
          destination={destination}
          alt={destination}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
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

/** B2 -- "Informações Rápidas" quick facts 2x3 grid */
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
        {"Informações Rápidas"}
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
      className={`md:col-span-10 ${BENTO_CARD_BASE} p-6 flex flex-col justify-between`}
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

/** Category translation key map for mustSee items */
const CATEGORY_I18N_KEYS: Record<string, string> = {
  nature: "categoryNature",
  culture: "categoryCulture",
  food: "categoryFood",
  nightlife: "categoryNightlife",
  sport: "categorySport",
  adventure: "categoryAdventure",
};

/** B5 -- "O que não perder" mustSee horizontal carousel */
function MustSeeCardV2({ guide, t, destination }: { guide: DestinationGuideContentV2; t: (key: string) => string; destination: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const mustSee = guide.mustSee;
  if (!mustSee || mustSee.length === 0) return null;

  return (
    <div
      className={`md:col-span-10 ${BENTO_CARD_BASE} p-6`}
      data-testid="attractions-card"
    >
      <h2 className="text-lg font-bold font-atlas-headline mb-4 text-atlas-on-surface">
        {t("mustSeeTitle")}
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
            {/* Attraction image via Unsplash */}
            <div className="h-40 relative overflow-hidden">
              <DestinationImage
                destination={`${item.name} ${destination}`}
                alt={item.name}
                fill
                className="object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-500"
                sizes="280px"
              />
              {/* Category chip */}
              <span className="absolute top-3 left-3 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-atlas-body flex items-center gap-1">
                <span aria-hidden="true">{CATEGORY_ICONS[item.category] ?? "\u{1F4CD}"}</span>
                {CATEGORY_I18N_KEYS[item.category] ? t(CATEGORY_I18N_KEYS[item.category]!) : item.category}
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
              <p className="text-xs text-atlas-on-surface-variant font-atlas-body">
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
  isJustGenerated = false,
  isAgeRestricted = false,
  aiConsentGiven,
}: DestinationGuideV2Props) {
  const t = useTranslations("expedition.phase5");
  const tErrors = useTranslations("errors");
  const tAge = useTranslations("ageRestriction");
  const tConsent = useTranslations("consent.modal");
  const router = useRouter();

  const [guide, setGuide] = useState<DestinationGuideContent | null>(initialGuide?.content ?? null);
  const [_generationCount, setGenerationCount] = useState(initialGuide?.generationCount ?? 0);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentGranted, setConsentGranted] = useState(aiConsentGiven === true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bulkPointsAwarded, setBulkPointsAwarded] = useState(false);
  const [showPAConfirm, setShowPAConfirm] = useState(false);
  const [paBalance, setPABalance] = useState(availablePoints);
  const [isSpending, setIsSpending] = useState(false);

  // Personalization state (SPEC-GUIA-PERSONALIZACAO)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialGuide?.extraCategories ?? []
  );
  const [personalNotes, setPersonalNotes] = useState(
    initialGuide?.personalNotes ?? ""
  );
  const [regenCount, setRegenCount] = useState(initialGuide?.regenCount ?? 0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenMessage, setRegenMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [streamingPhase, setStreamingPhase] = useState<
    "idle" | "starting" | "in_progress" | "finalizing"
  >("idle");
  const streamAbortRef = useRef<AbortController | null>(null);

  const guideCost = AI_COSTS.ai_accommodation;

  // Personalization handlers (SPEC-GUIA-PERSONALIZACAO)
  const toggleCategory = useCallback((key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleRegenerate = useCallback(async () => {
    // Map specific stream error codes (AI_TIMEOUT, AI_PARSE_ERROR,
    // PERSIST_FAILED, aborted, network) to their own i18n strings so the
    // user sees what actually went wrong — not the generic "try again".
    // Sprint 44.
    const knownErrorKeys = new Set([
      "AI_TIMEOUT",
      "AI_PARSE_ERROR",
      "AI_SCHEMA_ERROR",
      "PERSIST_FAILED",
      "network",
      "aborted",
    ]);
    const resolveRegenErrorText = (errorCode: string | undefined): string => {
      if (!errorCode) return t("regenError");
      const key = errorCode.startsWith("errors.")
        ? errorCode.slice("errors.".length)
        : errorCode;
      return knownErrorKeys.has(key) ? tErrors(key) : t("regenError");
    };

    setIsRegenerating(true);
    setRegenMessage(null);
    setErrorMessage(null);
    setStreamingPhase("starting");
    const controller = new AbortController();
    streamAbortRef.current = controller;
    try {
      const result = await streamDestinationGuide({
        tripId,
        destination,
        language: locale.startsWith("pt") ? "pt-BR" : "en",
        locale,
        regen: true,
        extraCategories: selectedCategories,
        personalNotes,
        signal: controller.signal,
        onStart: () => setStreamingPhase("in_progress"),
        onChunk: () => setStreamingPhase("in_progress"),
      });

      if (result.kind === "complete") {
        setStreamingPhase("finalizing");
        setGuide(result.content);
        setRegenCount(result.regenCount ?? regenCount + 1);
        setPABalance((prev) => prev - REGEN_COST);
        setRegenMessage({ type: "success", text: t("regenSuccess", { cost: REGEN_COST }) });
        // Invalidate RSC so the navbar PA balance reflects the debit.
        // Without this, the header stays stale until the user changes
        // screens (Bug 1, Sprint 43 QA).
        router.refresh();
      } else {
        setRegenMessage({
          type: "error",
          text: resolveRegenErrorText(result.errorCode),
        });
      }
    } catch {
      setRegenMessage({ type: "error", text: resolveRegenErrorText(undefined) });
    } finally {
      setIsRegenerating(false);
      setStreamingPhase("idle");
      streamAbortRef.current = null;
    }
  }, [tripId, destination, locale, selectedCategories, personalNotes, regenCount, t, tErrors, router]);

  const handleRequestGenerate = useCallback(() => {
    // Gate: require AI consent before proceeding (SPEC-PROD-056)
    if (!consentGranted && aiConsentGiven !== true) {
      setShowConsentModal(true);
      return;
    }
    setShowPAConfirm(true);
  }, [consentGranted, aiConsentGiven]);

  /**
   * Refund the upfront PA debit when a guide generation ultimately fails
   * (Sprint 43 QA Bug 2). Idempotent server-side within 10 minutes, so
   * re-fires from retries are safe.
   */
  const refundGuideGeneration = useCallback(
    async (reason: "timeout" | "stream_failed" | "generation_failed") => {
      try {
        const result = await refundPAForAIAction(tripId, "ai_accommodation", reason);
        if (result.success && result.data) {
          setPABalance(result.data.newBalance);
          router.refresh();
        }
      } catch { /* non-critical — server logs the error */ }
    },
    [tripId, router],
  );

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setStreamingPhase("starting");
    const controller = new AbortController();
    streamAbortRef.current = controller;
    try {
      const result = await streamDestinationGuide({
        tripId,
        destination,
        language: locale.startsWith("pt") ? "pt-BR" : "en",
        locale,
        regen: false,
        signal: controller.signal,
        onStart: () => setStreamingPhase("in_progress"),
        onChunk: () => setStreamingPhase("in_progress"),
      });

      if (result.kind === "complete") {
        setStreamingPhase("finalizing");
        setGuide(result.content);
        setGenerationCount(result.generationCount ?? 1);
        router.refresh();
      } else {
        setErrorMessage(result.errorCode ?? "errors.generic");
        refundGuideGeneration("stream_failed");
      }
    } catch {
      setErrorMessage("errors.generic");
      refundGuideGeneration("timeout");
    } finally {
      setIsGenerating(false);
      setStreamingPhase("idle");
      streamAbortRef.current = null;
    }
  }, [tripId, destination, locale, router, refundGuideGeneration]);

  // Cancel any in-flight stream when the component unmounts
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  // Stable ref for handleGenerate to use in effects without dependency issues
  const handleGenerateRef = useRef(handleGenerate);
  handleGenerateRef.current = handleGenerate;

  // Sync server-provided initialGuide into local state when it changes
  // (e.g. after router.refresh() following a successful generation).
  // Prevents the "empty state flash" where RSC refresh lands before setGuide
  // would otherwise reset the UI back to the generation CTA.
  useEffect(() => {
    if (initialGuide?.content) {
      setGuide((prev) => prev ?? initialGuide.content);
      setGenerationCount((prev) => prev || initialGuide.generationCount);
    }
  }, [initialGuide]);

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
      // Refresh the RSC so the navbar PA badge updates immediately.
      // Sprint 43 QA Bug 1 — without this the header stays stale if
      // streaming fails mid-way after PA has been debited server-side.
      router.refresh();
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
    // Flag-aware: Guide is phase-5 URL (flag OFF) or phase-3 URL (flag ON).
    // After Guide, the next phase is Itinerary: phase-6 (flag OFF) or phase-4 (flag ON).
    // The engine's internal phaseNumber for Guide differs per ordering —
    // 5 when flag OFF (original), 3 when flag ON (reordered) — so we must
    // call the matching completePhaseN action, otherwise PHASE_ORDER_VIOLATION
    // is swallowed and trip.currentPhase never advances.
    // SPEC-UX-REORDER-PHASES §5.2
    const reordered = isPhaseReorderEnabled();
    const nextPath = reordered ? "phase-4" : "phase-6";
    const guidePhaseNumber = reordered ? 3 : 5;
    const completeAction = reordered ? completePhase3Action : completePhase5Action;
    if (accessMode === "revisit" && completedPhases.includes(guidePhaseNumber)) {
      router.push(`/expedition/${tripId}/${nextPath}`);
      return;
    }
    try {
      const result = await completeAction(tripId);
      if (!result.success) {
        setErrorMessage(result.error);
        setIsCompleting(false);
        return;
      }
      router.push(`/expedition/${tripId}/${nextPath}`);
    } catch {
      setErrorMessage("errors.generic");
      setIsCompleting(false);
    }
  }, [tripId, accessMode, completedPhases, router]);

  const regenDisabled =
    isAgeRestricted ||
    isRegenerating ||
    (selectedCategories.length === 0 && !personalNotes.trim()) ||
    regenCount >= MAX_REGENS ||
    paBalance < REGEN_COST;

  // Flag-aware navigation paths for WizardFooter (SPEC-UX-REORDER-PHASES §5.2)
  // Back: flag OFF = Logistics (phase-4), flag ON = Profile (phase-2)
  // Next: flag OFF = Itinerary (phase-6), flag ON = Itinerary (phase-4)
  const guideBackPath = isPhaseReorderEnabled() ? "phase-2" : "phase-4";

  const regenDisabledReasonId = "regen-disabled-reason";

  // ─── Loading / Generating state ──────────────────────────────────────────

  if (isGenerating || isRegenerating) {
    const streamingMsgKey =
      streamingPhase === "starting"
        ? "streaming.starting"
        : streamingPhase === "finalizing"
        ? "streaming.finalizing"
        : "streaming.inProgress";
    const handleCancelGuide = () => streamAbortRef.current?.abort();
    return (
      <PhaseShell
        tripId={tripId}
        viewingPhase={5}
        tripCurrentPhase={tripCurrentPhase}
        completedPhases={completedPhases}
        phaseTitle={t("title")}
        phaseSubtitle={isPhaseReorderEnabled() ? t("subtitleReordered") : t("subtitle")}
        showFooter={false}
      >
        <AiGenerationProgress
          type="guide"
          progressMessage={t(streamingMsgKey)}
          onCancel={handleCancelGuide}
        />
        <p
          className="sr-only"
          aria-live="polite"
          data-testid="guide-streaming-status"
        >
          {t(streamingMsgKey)}
        </p>
        <div className="mt-6" aria-hidden="true">
          <HeaderSkeleton />
          <BentoSkeleton />
        </div>
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
      isEditMode={accessMode === "revisit" && !isJustGenerated}
      showFooter={false}
    >
      {/* V2 Page Header — only shown when guide exists (empty state has its own title) */}
      {guide && (
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
            {t("subtitle")}
          </p>
        </header>
      )}

      {/* Error display — retry is via the empty state CTA below */}
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

      {/* AI Consent Modal (SPEC-PROD-056) */}
      <AiConsentModal
        open={showConsentModal}
        onAccepted={() => {
          setShowConsentModal(false);
          setConsentGranted(true);
          // Proceed to PA confirmation after consent
          setShowPAConfirm(true);
        }}
        onDeclined={() => {
          setShowConsentModal(false);
          toast.info(tConsent("declinedToast"));
          router.push("/expeditions");
        }}
      />

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

      {/* Empty state — no guide yet, manual generation */}
      {!guide && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-3xl mx-auto">
          {/* Sparkles icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-atlas-primary/10 mb-6">
            <svg className="w-8 h-8 text-atlas-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold font-atlas-headline text-atlas-on-surface mb-3">
            {t("emptyStateTitle", { destination })}
          </h2>

          {/* Description */}
          <p className="text-base text-atlas-on-surface-variant font-atlas-body mb-8 max-w-lg">
            {t("emptyStateDescription", { destination })}
          </p>

          {/* Feature cards - 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 w-full">
            <div className="p-5 rounded-xl bg-atlas-surface-container border border-atlas-outline-variant/30">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-atlas-primary/10 mb-3 mx-auto">
                <span className="text-atlas-primary text-lg" aria-hidden="true">{"\uD83C\uDF24\uFE0F"}</span>
              </div>
              <h3 className="font-bold font-atlas-headline text-sm text-atlas-on-surface mb-1">{t("featureClimate")}</h3>
              <p className="text-xs text-atlas-on-surface-variant font-atlas-body">{t("featureClimateDesc")}</p>
            </div>
            <div className="p-5 rounded-xl bg-atlas-surface-container border border-atlas-outline-variant/30">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 mb-3 mx-auto">
                <span className="text-emerald-600 text-lg" aria-hidden="true">{"\uD83D\uDEE1\uFE0F"}</span>
              </div>
              <h3 className="font-bold font-atlas-headline text-sm text-atlas-on-surface mb-1">{t("featureSafety")}</h3>
              <p className="text-xs text-atlas-on-surface-variant font-atlas-body">{t("featureSafetyDesc")}</p>
            </div>
            <div className="p-5 rounded-xl bg-atlas-surface-container border border-atlas-outline-variant/30">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-atlas-tertiary/10 mb-3 mx-auto">
                <span className="text-atlas-tertiary text-lg" aria-hidden="true">{"\uD83C\uDFAD"}</span>
              </div>
              <h3 className="font-bold font-atlas-headline text-sm text-atlas-on-surface mb-1">{t("featureCulture")}</h3>
              <p className="text-xs text-atlas-on-surface-variant font-atlas-body">{t("featureCultureDesc")}</p>
            </div>
          </div>

          {/* PA Cost */}
          <p className="text-sm font-semibold text-atlas-on-tertiary-container mb-4">
            {t("emptyStateCost", { cost: guideCost })}
          </p>

          {/* CTA Button */}
          <AtlasButton
            onClick={handleRequestGenerate}
            disabled={isGenerating || insufficientPA || isAgeRestricted}
            size="lg"
            title={isAgeRestricted ? tAge("tooltip") : undefined}
            aria-disabled={isAgeRestricted || undefined}
          >
            {isGenerating ? t("generating") : t("generateCta")} {"\u2728"}
          </AtlasButton>
          {isAgeRestricted && (
            <p className="text-xs text-atlas-gold mt-2">{tAge("tooltip")}</p>
          )}
          {insufficientPA && !isAgeRestricted && (
            <p className="text-xs text-destructive mt-2">{t("insufficientPA")}</p>
          )}

          {/* Footer note */}
          <p className="text-xs text-atlas-on-surface-variant/60 font-atlas-body mt-6">
            {t("processingNote")}
          </p>

          {/* Navigation: Back / Advance (skip guide) */}
          <div className="mt-8 w-full">
            <PhaseFooter
              onNext={handleComplete}
              onBack={() => router.push(`/expedition/${tripId}/${guideBackPath}`)}
            />
          </div>
        </div>
      )}

      {/* Legacy v1 guide -- show fallback with regenerate prompt */}
      {guide && !guideIsV2 && (
        <>
          <LegacyGuideFallback onRegenerate={handleRequestGenerate} />
          <div className="mt-3">
            <PhaseFooter
              onNext={handleComplete}
              onBack={() => router.push(`/expedition/${tripId}/${guideBackPath}`)}
              isSubmitting={isCompleting}
              canAdvance={!isCompleting}
            />
          </div>
        </>
      )}

      {/* V2 Guide content -- bento grid layout */}
      {guideV2 && (
        <>
          {/* Show selected categories if guide was personalized */}
          {selectedCategories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 max-w-7xl" data-testid="personalized-categories">
              <span className="text-xs font-bold font-atlas-body text-atlas-on-surface-variant">{t("personalizedWith")}:</span>
              {selectedCategories.map((cat) => (
                <span key={cat} className="text-xs px-2 py-1 rounded-full bg-atlas-primary/10 text-atlas-primary font-atlas-body">
                  {GUIDE_CATEGORIES.find(c => c.key === cat)?.emoji} {t(`category_${cat}`)}
                </span>
              ))}
            </div>
          )}
          <div
            className="grid grid-cols-1 md:grid-cols-10 gap-6 max-w-7xl"
            data-testid="guide-v2-bento"
          >
            {/* B1 -- Sobre o Destino (6 cols) */}
            <AboutDestinationCardV2 guide={guideV2} destination={destination} />

            {/* B2 -- Informações Rápidas (4 cols) */}
            <QuickFactsCardV2 guide={guideV2} />

            {/* B3 -- Dicas de Seguranca (5 cols) */}
            <SafetyCardV2 guide={guideV2} locale={locale} />

            {/* B4 -- Custos Medios Diarios (5 cols) */}
            <CostsCardV2 guide={guideV2} />

            {/* B5 -- O que não perder (10 cols full width) */}
            <MustSeeCardV2 guide={guideV2} t={t} destination={destination} />
          </div>

          {/* Personalization section (SPEC-GUIA-PERSONALIZACAO) */}
          <div
            className="mt-8 p-6 bg-atlas-surface-container rounded-xl max-w-7xl"
            data-testid="guide-personalization"
          >
            <h3 className="text-base font-bold font-atlas-headline text-atlas-primary mb-4">
              {t("personalizeTitle")}
            </h3>

            {/* Category chips */}
            <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label={t("personalizeTitle")}>
              {GUIDE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    role="switch"
                    aria-pressed={isSelected}
                    aria-label={t(`category_${cat.key}`)}
                    onClick={() => toggleCategory(cat.key)}
                    className={`min-h-[44px] px-3 py-1.5 rounded-full text-sm font-atlas-body border transition-colors focus-visible:ring-2 ring-atlas-focus-ring ${
                      isSelected
                        ? "bg-atlas-secondary-container text-atlas-on-secondary-container border-transparent"
                        : "bg-atlas-surface-variant text-atlas-on-surface-variant border-atlas-outline-variant hover:border-atlas-primary"
                    }`}
                  >
                    <span aria-hidden="true">{cat.emoji}</span>{" "}
                    {t(`category_${cat.key}`)}
                  </button>
                );
              })}
            </div>

            {/* Personal notes */}
            <div className="mb-4">
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value.slice(0, 500))}
                placeholder={t("personalNotesPlaceholder")}
                aria-label={t("personalNotesPlaceholder")}
                className="w-full p-3 rounded-lg border border-atlas-outline-variant bg-white text-sm font-atlas-body resize-none h-24 focus-visible:ring-2 ring-atlas-focus-ring"
                maxLength={500}
              />
              <p
                className="text-xs text-atlas-on-surface-variant mt-1"
                aria-live="polite"
              >
                {personalNotes.length}/500
              </p>
            </div>

            {/* Re-generate button + counter */}
            <div className="flex flex-wrap items-center gap-4">
              <AtlasButton
                onClick={handleRegenerate}
                disabled={regenDisabled}
                aria-describedby={regenDisabled ? regenDisabledReasonId : undefined}
              >
                {regenCount >= MAX_REGENS
                  ? t("regenLimitReached")
                  : paBalance < REGEN_COST
                    ? t("insufficientPALabel")
                    : t("regenerateGuideCta", { cost: REGEN_COST })}
              </AtlasButton>
              <span className="text-xs text-atlas-on-surface-variant">
                {t("regenCounter", { used: regenCount, max: MAX_REGENS })}
              </span>
            </div>

            {/* Disabled reason for screen readers */}
            {regenDisabled && (
              <p id={regenDisabledReasonId} className="sr-only">
                {regenCount >= MAX_REGENS
                  ? t("regenLimitReached")
                  : paBalance < REGEN_COST
                    ? t("insufficientPALabel")
                    : selectedCategories.length === 0 && !personalNotes.trim()
                      ? "Select a category or add personal notes"
                      : ""}
              </p>
            )}

            {/* Inline feedback messages */}
            {regenMessage && (
              <div
                className={`mt-3 text-sm font-atlas-body ${
                  regenMessage.type === "success"
                    ? "text-atlas-on-tertiary-container"
                    : "text-atlas-error"
                }`}
                role="alert"
                aria-live="assertive"
              >
                {regenMessage.text}
              </div>
            )}
          </div>

          {/* AI disclaimer */}
          <footer className="mt-12 mb-20 text-center max-w-2xl mx-auto" role="note" data-testid="ai-disclaimer">
            <p className="text-[10px] text-atlas-on-surface-variant/60 leading-relaxed italic font-atlas-body">
              {t("aiDisclaimer")}
            </p>
          </footer>

          {/* Navigation footer */}
          <div className="mt-3">
            <PhaseFooter
              onNext={handleComplete}
              onBack={() => router.push(`/expedition/${tripId}/${guideBackPath}`)}
              isSubmitting={isCompleting}
              canAdvance={!isCompleting}
            />
          </div>
        </>
      )}
    </PhaseShell>
  );
}
