"use client";

import { useState, useRef, useCallback, useEffect, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { track } from "@vercel/analytics";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasCard } from "@/components/ui/AtlasCard";
import { PhaseShell } from "./PhaseShell";
import { AiDisclaimer } from "./AiDisclaimer";
import { PhaseFooter } from "./PhaseFooter";
import { AiGenerationProgress } from "./AiGenerationProgress";
import { PAConfirmationModal } from "@/components/features/gamification/PAConfirmationModal";
import { AiConsentModal } from "@/components/features/consent/AiConsentModal";
import { toast } from "@/lib/toast";
import {
  getProgressPhase,
  getProgressMessageKey,
  countDaysInStream,
  calculateTotalDays,
  calculateProgressPercent,
} from "@/lib/utils/stream-progress";
import { syncPhase6CompletionAction } from "@/server/actions/expedition.actions";
import { spendPAForAIAction, refundPAForAIAction } from "@/server/actions/gamification.actions";
import { AI_COSTS } from "@/types/gamification.types";
import {
  addActivityAction,
  updateActivityAction,
  deleteActivityAction,
} from "@/server/actions/itinerary.actions";
import { getItineraryDaysAction } from "@/server/actions/itinerary.actions";
import type { ItineraryDayWithActivities, ActivityData } from "@/server/actions/itinerary.actions";
import type { TravelStyle, ExpeditionContext } from "@/types/ai.types";
import type { PhaseAccessMode } from "@/lib/engines/phase-navigation.engine";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";

const ItineraryMap = dynamic(() => import("./ItineraryMap"), { ssr: false });

// ─── Category System ─────────────────────────────────────────────────────────

/**
 * Activity categories for the V2 timeline.
 * Each category maps to specific atlas design tokens per SPEC-PROD-PHASE6-REDESIGN Bloco 7.
 */
type ActivityCategory =
  | "logistics"
  | "culture"
  | "food"
  | "nature"
  | "nightlife"
  | "sport"
  | "shopping"
  | "adventure";

interface CategoryStyle {
  dotBg: string;
  borderClass: string;
  chipBg: string;
  chipText: string;
  timeColor: string;
}

const CATEGORY_STYLES: Record<ActivityCategory, CategoryStyle> = {
  logistics: {
    dotBg: "bg-atlas-secondary-container",
    borderClass: "",
    chipBg: "bg-atlas-surface-container-low",
    chipText: "text-atlas-on-surface-variant",
    timeColor: "text-atlas-secondary-container",
  },
  culture: {
    dotBg: "bg-atlas-on-tertiary-container",
    borderClass: "border-l-8 border-atlas-on-tertiary-container",
    chipBg: "bg-atlas-tertiary-fixed",
    chipText: "text-atlas-on-tertiary-fixed-variant",
    timeColor: "text-atlas-on-tertiary-container",
  },
  food: {
    dotBg: "bg-atlas-secondary-container",
    borderClass: "border-l-8 border-atlas-secondary-container",
    chipBg: "bg-atlas-secondary-fixed",
    chipText: "text-atlas-on-secondary-fixed-variant",
    timeColor: "text-atlas-secondary-container",
  },
  nature: {
    dotBg: "bg-atlas-success",
    borderClass: "border-l-8 border-atlas-success",
    chipBg: "bg-atlas-success/10",
    chipText: "text-atlas-success",
    timeColor: "text-atlas-success",
  },
  nightlife: {
    dotBg: "bg-atlas-info",
    borderClass: "border-l-8 border-atlas-info",
    chipBg: "bg-atlas-info/10",
    chipText: "text-atlas-info",
    timeColor: "text-atlas-info",
  },
  sport: {
    dotBg: "bg-atlas-warning",
    borderClass: "border-l-8 border-atlas-warning",
    chipBg: "bg-atlas-warning/10",
    chipText: "text-atlas-warning",
    timeColor: "text-atlas-warning",
  },
  shopping: {
    dotBg: "bg-atlas-secondary",
    borderClass: "border-l-8 border-atlas-secondary",
    chipBg: "bg-atlas-secondary/10",
    chipText: "text-atlas-secondary",
    timeColor: "text-atlas-secondary",
  },
  adventure: {
    dotBg: "bg-atlas-tertiary-fixed",
    borderClass: "border-l-8 border-atlas-tertiary-fixed",
    chipBg: "bg-atlas-tertiary-fixed/20",
    chipText: "text-atlas-on-tertiary-fixed-variant",
    timeColor: "text-atlas-tertiary-fixed",
  },
};

const VALID_CATEGORIES = new Set<string>(Object.keys(CATEGORY_STYLES));
const FALLBACK_CATEGORY: ActivityCategory = "logistics";

function resolveCategory(raw: string | null | undefined): ActivityCategory {
  if (!raw) return FALLBACK_CATEGORY;
  const lower = raw.toLowerCase();
  if (VALID_CATEGORIES.has(lower)) return lower as ActivityCategory;
  // Map v1 types to v2 categories
  const V1_MAP: Record<string, ActivityCategory> = {
    sightseeing: "culture",
    food: "food",
    transport: "logistics",
    accommodation: "logistics",
    leisure: "nature",
    shopping: "shopping",
  };
  return V1_MAP[lower] ?? FALLBACK_CATEGORY;
}

function getCategoryStyle(category: ActivityCategory): CategoryStyle {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES[FALLBACK_CATEGORY];
}

// ─── Category label i18n keys ────────────────────────────────────────────────

const CATEGORY_LABEL_KEYS: Record<ActivityCategory, string> = {
  logistics: "categoryLogistics",
  culture: "categoryCulture",
  food: "categoryFood",
  nature: "categoryNature",
  nightlife: "categoryNightlife",
  sport: "categorySport",
  shopping: "categoryShopping",
  adventure: "categoryAdventure",
};

// ─── Inline Icons ────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CostIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="size-7 text-atlas-secondary-container" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** V2 activity shape from the AI-generated JSON (PROMPT-ROTEIRO-PERSONALIZADO). */
interface V2Activity {
  id?: string;
  time: string;
  endTime?: string;
  name: string;
  description: string;
  duration: string;
  estimatedCost: string;
  category: string;
  coordinates?: { lat: number; lng: number } | null;
  tip?: string | null;
  /** True if the activity was manually added by the user (SPEC-ROTEIRO-REGEN-INTELIGENTE). */
  isManual?: boolean;
}

/** V2 day shape from the AI-generated JSON. */
interface V2Day {
  id?: string;
  dayNumber: number;
  date: string;
  title: string;
  activities: V2Activity[];
  summary?: {
    activitiesCount: number;
    totalDuration: string;
    totalCost: string;
  };
}

interface Phase6ItineraryV2Props {
  tripId: string;
  destination: string;
  locale: string;
  startDate: string | null;
  endDate: string | null;
  initialDays: ItineraryDayWithActivities[];
  travelStyle?: TravelStyle;
  budgetTotal?: number;
  budgetCurrency?: string;
  travelers?: number;
  travelNotes?: string;
  expeditionContext?: ExpeditionContext;
  accessMode?: PhaseAccessMode;
  tripCurrentPhase?: number;
  completedPhases?: number[];
  availablePoints?: number;
  /**
   * True when the server detects the itinerary was generated within a short
   * window before the current page render (post-generation remount). When
   * set, the revisit banner is suppressed so users who just generated for
   * the first time don't see "você está revisitando" seconds after success.
   * Sprint 43 QA UX bug.
   */
  isJustGenerated?: boolean;
  /** When true, AI generation CTAs are disabled with an age restriction tooltip. */
  isAgeRestricted?: boolean;
  /** AI consent status from UserProfile. null = never asked, false = refused, true = consented. */
  aiConsentGiven?: boolean | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROGRESS_UPDATE_INTERVAL_MS = 1000;
const PA_COST = AI_COSTS.ai_itinerary;
const MAX_REGEN_COUNT = 5;
const PERSONAL_NOTES_MAX_LENGTH = 500;

/** Itinerary personalization categories — same pattern as Phase 5 guide. */
const ITINERARY_CATEGORIES = [
  { key: "gastronomic", emoji: "\uD83C\uDF7D\uFE0F" },
  { key: "cultural", emoji: "\uD83C\uDFDB\uFE0F" },
  { key: "adventure", emoji: "\uD83E\uDDD7" },
  { key: "relaxation", emoji: "\uD83E\uDDD8" },
  { key: "nightlife", emoji: "\uD83C\uDF19" },
  { key: "family", emoji: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67" },
  { key: "shopping", emoji: "\uD83D\uDECD\uFE0F" },
  { key: "sports", emoji: "\u26BD" },
  { key: "religious", emoji: "\uD83D\uDD4C" },
] as const;

function mapStatusToErrorKey(status: number, errorBody?: string): string {
  // Check for specific AI policy error codes from the gateway
  if (errorBody === "kill_switch") return "errorKillSwitch";
  if (errorBody === "cost_budget") return "errorCostBudget";
  if (errorBody === "rate_limit" && status === 429) return "errorRateLimit";

  const statusMap: Record<number, string> = {
    401: "errorAuth", 400: "errorGenerate", 403: "errorAgeRestricted",
    404: "errorGenerate", 409: "errorGenerate", 429: "errorRateLimit",
  };
  return statusMap[status] ?? "errorGenerate";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert ItineraryDayWithActivities (DB shape) to V2Day (UI shape). */
function convertToV2Days(
  dbDays: ItineraryDayWithActivities[],
  startDate: string,
): V2Day[] {
  return dbDays.map((day) => {
    const dayDate = day.date
      ? new Date(day.date).toISOString().split("T")[0]!
      : addDays(startDate, day.dayNumber - 1);

    const activities: V2Activity[] = day.activities.map((act) => ({
      id: act.id,
      time: act.startTime ?? "09:00",
      endTime: act.endTime ?? undefined,
      name: act.title,
      description: act.notes ?? "",
      duration: computeDuration(act.startTime, act.endTime),
      estimatedCost: "",
      category: act.activityType ?? "logistics",
      coordinates:
        act.latitude != null && act.longitude != null
          ? { lat: act.latitude, lng: act.longitude }
          : null,
      tip: null,
      isManual: act.isManual ?? false,
    }));

    return {
      id: day.id,
      dayNumber: day.dayNumber,
      date: dayDate,
      title: day.notes ?? "",
      activities,
      summary: {
        activitiesCount: activities.length,
        totalDuration: sumDurations(activities),
        totalCost: "",
      },
    };
  });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0]!;
}

function computeDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "1h";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalMin = (eh! - sh!) * 60 + (em! - sm!);
  if (totalMin <= 0) return "1h";
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0 && mins > 0) return `${hours}h${mins.toString().padStart(2, "0")}`;
  if (hours > 0) return `${hours}h`;
  return `${mins}min`;
}

function sumDurations(activities: V2Activity[]): string {
  let totalMin = 0;
  for (const a of activities) {
    const match = a.duration.match(/^(?:(\d+)h)?(?:(\d+)(?:min)?)?$/);
    if (match) {
      totalMin += (Number(match[1] ?? 0)) * 60 + Number(match[2] ?? 0);
    }
  }
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0 && mins > 0) return `${hours}h${mins.toString().padStart(2, "0")}`;
  if (hours > 0) return `${hours}h`;
  return `${totalMin}min`;
}

function formatDate(dateStr: string, locale: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

/** Day Selector Pills — horizontal scrollable strip. AC-P6-023 to AC-P6-030 */
function DaySelectorPills({
  days,
  selectedDay,
  onSelect,
  locale,
}: {
  days: V2Day[];
  selectedDay: number;
  onSelect: (dayNumber: number) => void;
  locale: string;
}) {
  const pillRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Auto-scroll active pill into view (AC-P6-030)
  useEffect(() => {
    const el = pillRefs.current.get(selectedDay);
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedDay]);

  function handleKeyDown(e: React.KeyboardEvent) {
    const idx = days.findIndex((d) => d.dayNumber === selectedDay);
    if (e.key === "ArrowRight" && idx < days.length - 1) {
      e.preventDefault();
      const next = days[idx + 1]!;
      onSelect(next.dayNumber);
      pillRefs.current.get(next.dayNumber)?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      const prev = days[idx - 1]!;
      onSelect(prev.dayNumber);
      pillRefs.current.get(prev.dayNumber)?.focus();
    }
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto py-2 hide-scrollbar"
      role="tablist"
      aria-label="Day selector"
      onKeyDown={handleKeyDown}
      data-testid="day-selector-pills"
    >
      {days.map((day) => {
        const isActive = day.dayNumber === selectedDay;
        return (
          <button
            key={day.dayNumber}
            ref={(el) => {
              if (el) pillRefs.current.set(day.dayNumber, el);
            }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`day-panel-${day.dayNumber}`}
            id={`day-tab-${day.dayNumber}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(day.dayNumber)}
            className={[
              "flex flex-col items-center justify-center min-w-[100px] h-20 rounded-xl transition-all duration-200 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-atlas-secondary-container text-atlas-primary shadow-lg"
                : "bg-atlas-surface-container-lowest text-atlas-on-surface-variant hover:bg-atlas-surface-container-low",
            ].join(" ")}
            data-testid={`day-pill-${day.dayNumber}`}
          >
            <span className="text-sm font-bold font-atlas-body">
              Dia {day.dayNumber}
            </span>
            <span className={`text-xs font-atlas-body ${isActive ? "opacity-80" : ""}`}>
              {formatDate(day.date, locale)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Day Header — "Dia N -- Title" with left amber accent. AC-P6-031 */
function DayHeader({ day }: { day: V2Day }) {
  return (
    <h2
      className="text-2xl font-atlas-headline font-bold text-atlas-on-surface border-l-4 border-atlas-secondary-container pl-6 mb-4"
      data-testid={`day-header-${day.dayNumber}`}
    >
      Dia {day.dayNumber} {day.title ? `\u2014 ${day.title}` : ""}
    </h2>
  );
}

function PencilIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ─── Activity Edit Form ─────────────────────────────────────────────────────

interface ActivityFormData {
  name: string;
  startTime: string;
  endTime: string;
  description: string;
  category: string;
}

const EMPTY_FORM: ActivityFormData = {
  name: "",
  startTime: "09:00",
  endTime: "",
  description: "",
  category: "logistics",
};

function ActivityEditForm({
  initial,
  onSave,
  onCancel,
  isSaving,
  t,
}: {
  initial?: ActivityFormData;
  onSave: (data: ActivityFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
  t: (key: string) => string;
}) {
  const [form, setForm] = useState<ActivityFormData>(initial ?? EMPTY_FORM);
  const [nameError, setNameError] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setNameError(true);
      nameInputRef.current?.focus();
      return;
    }
    setNameError(false);
    onSave({ ...form, name: trimmedName });
  }

  const categoryOptions: { value: string; label: string }[] = [
    { value: "logistics", label: t("categoryLogistics") },
    { value: "culture", label: t("categoryCulture") },
    { value: "food", label: t("categoryFood") },
    { value: "nature", label: t("categoryNature") },
    { value: "nightlife", label: t("categoryNightlife") },
    { value: "sport", label: t("categorySport") },
    { value: "shopping", label: t("categoryShopping") },
    { value: "adventure", label: t("categoryAdventure") },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 bg-atlas-surface-container-lowest p-4 md:p-6 rounded-xl shadow-sm border border-atlas-outline-variant/30"
      data-testid="activity-edit-form"
    >
      {/* Activity name */}
      <div className="mb-3">
        <label htmlFor="activity-name" className="block text-sm font-bold font-atlas-body text-atlas-on-surface mb-1">
          {t("activityName")} *
        </label>
        <input
          ref={nameInputRef}
          id="activity-name"
          type="text"
          value={form.name}
          onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameError(false); }}
          maxLength={200}
          required
          aria-invalid={nameError}
          aria-describedby={nameError ? "activity-name-error" : undefined}
          className={[
            "w-full rounded-lg border px-3 py-2 text-sm font-atlas-body",
            "bg-atlas-surface text-atlas-on-surface",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring",
            nameError ? "border-atlas-error" : "border-atlas-outline-variant/50",
          ].join(" ")}
          data-testid="activity-name-input"
        />
        {nameError && (
          <p id="activity-name-error" className="mt-1 text-xs text-atlas-error font-atlas-body" role="alert">
            {t("activityNameRequired")}
          </p>
        )}
      </div>

      {/* Time row */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <label htmlFor="activity-start-time" className="block text-sm font-bold font-atlas-body text-atlas-on-surface mb-1">
            {t("activityTime")}
          </label>
          <input
            id="activity-start-time"
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            className="w-full rounded-lg border border-atlas-outline-variant/50 px-3 py-2 text-sm font-atlas-body bg-atlas-surface text-atlas-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
            data-testid="activity-start-time-input"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="activity-end-time" className="block text-sm font-bold font-atlas-body text-atlas-on-surface mb-1">
            {t("activityEndTime")}
          </label>
          <input
            id="activity-end-time"
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            className="w-full rounded-lg border border-atlas-outline-variant/50 px-3 py-2 text-sm font-atlas-body bg-atlas-surface text-atlas-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
            data-testid="activity-end-time-input"
          />
        </div>
      </div>

      {/* Category */}
      <div className="mb-3">
        <label htmlFor="activity-category" className="block text-sm font-bold font-atlas-body text-atlas-on-surface mb-1">
          {t("activityCategory")}
        </label>
        <select
          id="activity-category"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          className="w-full rounded-lg border border-atlas-outline-variant/50 px-3 py-2 text-sm font-atlas-body bg-atlas-surface text-atlas-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
          data-testid="activity-category-select"
        >
          {categoryOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label htmlFor="activity-description" className="block text-sm font-bold font-atlas-body text-atlas-on-surface mb-1">
          {t("activityDescription")}
        </label>
        <textarea
          id="activity-description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          maxLength={2000}
          rows={2}
          className="w-full rounded-lg border border-atlas-outline-variant/50 px-3 py-2 text-sm font-atlas-body bg-atlas-surface text-atlas-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring resize-y"
          data-testid="activity-description-input"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <AtlasButton
          type="submit"
          size="sm"
          disabled={isSaving}
          data-testid="activity-save-btn"
        >
          {isSaving ? t("activitySaving") : t("saveActivity")}
        </AtlasButton>
        <AtlasButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
          data-testid="activity-cancel-btn"
        >
          {t("cancelEdit")}
        </AtlasButton>
      </div>
    </form>
  );
}

/** Single activity card in the timeline. AC-P6-036 to AC-P6-040 */
function ActivityCard({
  activity,
  t,
  onEdit,
  onDelete,
}: {
  activity: V2Activity;
  t: (key: string) => string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const category = resolveCategory(activity.category);
  const style = getCategoryStyle(category);
  const labelKey = CATEGORY_LABEL_KEYS[category];

  return (
    <article
      className={[
        "flex-1 bg-atlas-surface-container-lowest p-6 md:p-6 p-4 rounded-xl",
        "shadow-sm hover:shadow-md transition-shadow duration-200 motion-reduce:transition-none",
        style.borderClass,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={activity.name}
      data-testid="activity-card"
      data-category={category}
    >
      {/* Row 1: Time + Origin badge + Category chip + action buttons */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold font-atlas-body ${style.timeColor}`}>
            {activity.time}
          </span>
          {/* Origin badge — SPEC-ROTEIRO-REGEN-INTELIGENTE AC-002 */}
          <span
            className={
              activity.isManual
                ? "text-[10px] px-2 py-0.5 rounded-full font-bold font-atlas-body bg-atlas-primary-container text-atlas-on-primary-container"
                : "text-[10px] px-2 py-0.5 rounded-full font-bold font-atlas-body bg-atlas-on-tertiary-container text-white"
            }
            data-testid="origin-badge"
          >
            {activity.isManual ? t("badgeManual") : t("badgeAI")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`${style.chipBg} ${style.chipText} px-3 py-1 rounded-full text-xs font-bold font-atlas-body`}
            data-testid="category-chip"
          >
            {t(labelKey)}
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-atlas-on-surface-variant hover:bg-atlas-surface-container-high transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
              aria-label={t("editActivity")}
              data-testid="activity-edit-btn"
            >
              <PencilIcon />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-atlas-error/70 hover:bg-atlas-error/10 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
              aria-label={t("deleteActivity")}
              data-testid="activity-delete-btn"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Activity name */}
      <h3 className="text-xl font-bold font-atlas-headline text-atlas-on-surface mb-1">
        {activity.name}
      </h3>

      {/* Row 3: Description */}
      {activity.description && (
        <p className="text-atlas-on-surface-variant leading-relaxed font-atlas-body mb-4">
          {activity.description}
        </p>
      )}

      {/* Row 4: Metadata — duration + cost */}
      <div className="flex gap-4 text-xs font-bold text-atlas-on-surface-variant/70 uppercase tracking-wider font-atlas-body">
        {activity.duration && (
          <span className="flex items-center gap-1">
            <ClockIcon /> {activity.duration}
          </span>
        )}
        {activity.estimatedCost && (
          <span className="flex items-center gap-1">
            <CostIcon /> {activity.estimatedCost}
          </span>
        )}
      </div>

      {/* Row 5: Optional tip */}
      {activity.tip && (
        <div className="mt-3 flex items-start gap-2 bg-atlas-secondary-fixed text-atlas-on-secondary-fixed-variant px-4 py-2 rounded-lg text-sm italic font-atlas-body" data-testid="activity-tip">
          <LightbulbIcon />
          <span>{activity.tip}</span>
        </div>
      )}

      {/* Delete confirmation inline */}
      {showDeleteConfirm && (
        <div className="mt-3 flex items-center gap-3 bg-atlas-error-container/20 px-4 py-3 rounded-lg" role="alertdialog" aria-label={t("deleteConfirm")} data-testid="activity-delete-confirm">
          <p className="text-sm font-atlas-body text-atlas-on-surface flex-1">{t("deleteConfirm")}</p>
          <AtlasButton size="sm" variant="danger" onClick={onDelete} data-testid="activity-delete-confirm-yes">
            {t("deleteConfirmYes")}
          </AtlasButton>
          <AtlasButton size="sm" variant="secondary" onClick={() => setShowDeleteConfirm(false)} data-testid="activity-delete-confirm-no">
            {t("deleteConfirmNo")}
          </AtlasButton>
        </div>
      )}
    </article>
  );
}

/** Vertical timeline with category dots, activity cards, and CRUD controls. AC-P6-033 to AC-P6-035 */
function ActivityTimeline({
  activities,
  dayId,
  tripId,
  t,
  onMutate,
}: {
  activities: V2Activity[];
  dayId?: string;
  tripId: string;
  t: (key: string) => string;
  onMutate: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /** Map V2 category to DB activityType */
  function mapCategoryToActivityType(category: string): ActivityData["activityType"] {
    const CATEGORY_TO_TYPE: Record<string, ActivityData["activityType"]> = {
      logistics: "TRANSPORT",
      culture: "SIGHTSEEING",
      food: "FOOD",
      nature: "LEISURE",
      nightlife: "LEISURE",
      sport: "LEISURE",
      shopping: "SHOPPING",
      adventure: "SIGHTSEEING",
    };
    return CATEGORY_TO_TYPE[category] ?? undefined;
  }

  async function handleAdd(data: ActivityFormData) {
    if (!dayId) return;
    setIsSaving(true);
    try {
      const result = await addActivityAction(tripId, dayId, {
        title: data.name,
        notes: data.description || undefined,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        activityType: mapCategoryToActivityType(data.category),
      });
      if (result.success) {
        setIsAdding(false);
        onMutate();
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(activityId: string, data: ActivityFormData) {
    setIsSaving(true);
    try {
      const result = await updateActivityAction(activityId, tripId, {
        title: data.name,
        notes: data.description || undefined,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        activityType: mapCategoryToActivityType(data.category),
      });
      if (result.success) {
        setEditingId(null);
        onMutate();
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(activityId: string) {
    setIsSaving(true);
    try {
      const result = await deleteActivityAction(activityId, tripId);
      if (result.success) {
        onMutate();
      }
    } finally {
      setIsSaving(false);
    }
  }

  /** Map V2 activityType back to V2 category for the edit form */
  function resolveFormCategory(raw: string): string {
    if (VALID_CATEGORIES.has(raw.toLowerCase())) return raw.toLowerCase();
    return FALLBACK_CATEGORY;
  }

  return (
    <div className="flex flex-col gap-8 relative" data-testid="activity-timeline">
      {/* Vertical line — desktop only (AC-P6-033/034) */}
      <div
        className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-atlas-surface-container-high hidden md:block"
        aria-hidden="true"
      />

      {activities.map((activity, idx) => {
        const category = resolveCategory(activity.category);
        const style = getCategoryStyle(category);
        const isEditing = editingId != null && activity.id === editingId;

        return (
          <div key={activity.id ?? idx} className="flex gap-8 group">
            {/* Category dot (AC-P6-035) */}
            <div className="relative z-10 pt-1" aria-hidden="true">
              <div
                className={`w-4 h-4 rounded-full ${style.dotBg} ring-4 ring-atlas-surface`}
                data-testid="timeline-dot"
                data-category={category}
              />
            </div>

            {/* Activity card or edit form */}
            {isEditing ? (
              <ActivityEditForm
                initial={{
                  name: activity.name,
                  startTime: activity.time,
                  endTime: activity.endTime ?? "",
                  description: activity.description,
                  category: resolveFormCategory(activity.category),
                }}
                onSave={(data) => handleUpdate(activity.id!, data)}
                onCancel={() => setEditingId(null)}
                isSaving={isSaving}
                t={t}
              />
            ) : (
              <ActivityCard
                activity={activity}
                t={t}
                onEdit={activity.id ? () => setEditingId(activity.id!) : undefined}
                onDelete={activity.id ? () => handleDelete(activity.id!) : undefined}
              />
            )}
          </div>
        );
      })}

      {/* Add activity form or button */}
      {isAdding ? (
        <div className="flex gap-8">
          <div className="relative z-10 pt-1" aria-hidden="true">
            <div className="w-4 h-4 rounded-full bg-atlas-surface-container-high ring-4 ring-atlas-surface" />
          </div>
          <ActivityEditForm
            onSave={handleAdd}
            onCancel={() => setIsAdding(false)}
            isSaving={isSaving}
            t={t}
          />
        </div>
      ) : dayId ? (
        <div className="flex gap-8">
          <div className="relative z-10 pt-1" aria-hidden="true">
            <div className="w-4 h-4 rounded-full bg-atlas-surface-container-high ring-4 ring-atlas-surface" />
          </div>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border-2 border-dashed border-atlas-outline-variant/40 text-atlas-on-surface-variant hover:border-atlas-secondary-container hover:text-atlas-secondary-container transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring font-atlas-body text-sm font-bold"
            data-testid="add-activity-btn"
          >
            <PlusIcon />
            {t("addActivity")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Day Summary Card at the bottom of each day's timeline. AC-P6-047 to AC-P6-050 */
function DaySummaryCard({
  day,
  t,
}: {
  day: V2Day;
  t: (key: string) => string;
}) {
  const summary = day.summary;
  if (!summary) return null;

  return (
    <div
      className="mt-8 bg-atlas-surface-container p-8 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      role="region"
      aria-label={t("daySummaryLabel")}
      data-testid={`day-summary-${day.dayNumber}`}
    >
      {/* Left: icon + title */}
      <div className="flex items-center gap-6">
        <div className="p-4 bg-atlas-surface-container-lowest rounded-xl">
          <ChartIcon />
        </div>
        <div>
          <h4 className="text-xl font-atlas-headline font-bold text-atlas-on-surface">
            {t("daySummaryTitle")} {day.dayNumber}
          </h4>
          {day.title && (
            <p className="text-atlas-on-surface-variant font-atlas-body">
              {day.title}
            </p>
          )}
        </div>
      </div>

      {/* Right: 3 stats */}
      <div className="flex gap-10">
        <div className="text-center">
          <p className="text-2xl font-atlas-headline font-extrabold text-atlas-on-surface">
            {summary.activitiesCount}
          </p>
          <p className="text-xs uppercase font-bold text-atlas-on-surface-variant/60 font-atlas-body">
            {t("statActivities")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-atlas-headline font-extrabold text-atlas-on-surface">
            {summary.totalDuration}
          </p>
          <p className="text-xs uppercase font-bold text-atlas-on-surface-variant/60 font-atlas-body">
            {t("statDuration")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-atlas-headline font-extrabold text-atlas-on-surface">
            {summary.totalCost || "\u2014"}
          </p>
          <p className="text-xs uppercase font-bold text-atlas-on-surface-variant/60 font-atlas-body">
            {t("statCost")}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Interactive Leaflet map panel for itinerary activities. AC-P6-051 */
function MapPanel({
  activities,
  t,
}: {
  activities: V2Activity[];
  t: (key: string) => string;
}) {
  const locations = activities.filter(
    (a) => a.coordinates?.lat != null && a.coordinates?.lng != null,
  );

  return (
    <aside
      className="w-full md:w-2/5 h-screen sticky top-20 bg-atlas-surface-container-low p-8 hidden md:block"
      aria-hidden="true"
      data-testid="map-panel"
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl border border-white/20 bg-atlas-surface-container">
        {/* Glass-morphism label */}
        <div className="absolute top-6 left-6 z-[1000] px-4 py-2 rounded-lg flex items-center gap-2 border border-white/40 bg-white/70 backdrop-blur-[12px]">
          <MapPinIcon />
          <span className="font-bold text-atlas-on-surface font-atlas-body">
            {t("mapLabel")}
          </span>
        </div>

        {locations.length > 0 ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-atlas-on-surface-variant font-atlas-body">
                  {t("mapLoading")}
                </p>
              </div>
            }
          >
            <ItineraryMap
              activities={locations.map((loc) => ({
                name: loc.name,
                coordinates: loc.coordinates as { lat: number; lng: number },
              }))}
            />
          </Suspense>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-6 pt-16">
            <p className="text-sm text-atlas-on-surface-variant font-atlas-body text-center">
              {t("mapNoLocations")}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function Phase6ItineraryV2({
  tripId,
  destination,
  locale,
  startDate,
  endDate,
  initialDays,
  travelStyle = "CULTURE",
  budgetTotal = 3000,
  budgetCurrency = "USD",
  travelers = 1,
  travelNotes,
  expeditionContext,
  accessMode = "first_visit",
  tripCurrentPhase = 6,
  completedPhases = [],
  availablePoints = 0,
  isJustGenerated = false,
  isAgeRestricted = false,
  aiConsentGiven,
}: Phase6ItineraryV2Props) {
  const t = useTranslations("expedition.phase6");
  const tExpedition = useTranslations("expedition");
  const tAge = useTranslations("ageRestriction");
  const tConsent = useTranslations("consent.modal");
  const router = useRouter();

  // ─── State ───────────────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentGranted, setConsentGranted] = useState(aiConsentGiven === true);
  const [progressMessage, setProgressMessage] = useState("");
  const [daysGenerated, setDaysGenerated] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [viewMode, setViewMode] = useState<"by_day" | "continuous">("by_day");
  const [showPAConfirm, setShowPAConfirm] = useState(false);
  const [paBalance, setPABalance] = useState(availablePoints);
  const [isSpending, setIsSpending] = useState(false);
  // Smart regen dialog (SPEC-ROTEIRO-REGEN-INTELIGENTE)
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [, setKeepManual] = useState(false);

  // Itinerary personalization (same pattern as Phase 5 guide)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [personalNotes, setPersonalNotes] = useState("");
  const [regenCount, setRegenCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamStartRef = useRef<number>(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedRef = useRef("");

  // ─── Local days state (updated after generation) ─────────────────────────
  const [days, setDays] = useState(initialDays);

  // ─── Derived values ──────────────────────────────────────────────────────
  const effectiveStartDate = startDate || new Date().toISOString().split("T")[0]!;
  const effectiveEndDate = endDate || effectiveStartDate;
  const totalDays = calculateTotalDays(effectiveStartDate, effectiveEndDate);
  const language = locale === "pt-BR" ? ("pt-BR" as const) : ("en" as const);
  const hasItinerary = days.length > 0;

  // Manual activity detection (SPEC-ROTEIRO-REGEN-INTELIGENTE AC-003/004)
  const manualActivityCount = useMemo(
    () => days.reduce((count, d) => count + d.activities.filter((a) => a.isManual).length, 0),
    [days],
  );
  const hasManualActivities = manualActivityCount > 0;

  // Convert DB days to V2 format
  const v2Days = useMemo(
    () => (hasItinerary ? convertToV2Days(days, effectiveStartDate) : []),
    [days, effectiveStartDate, hasItinerary],
  );

  const currentDay = v2Days.find((d) => d.dayNumber === selectedDay) ?? v2Days[0] ?? null;

  // ─── Progress timer ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const startProgressTimer = useCallback(() => {
    streamStartRef.current = Date.now();
    const phase = getProgressPhase(0);
    const key = getProgressMessageKey(phase);
    setProgressMessage(t(key));
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - streamStartRef.current;
      const currentPhase = getProgressPhase(elapsed);
      const messageKey = getProgressMessageKey(currentPhase);
      setProgressMessage(t(messageKey));
    }, PROGRESS_UPDATE_INTERVAL_MS);
  }, [t]);

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  // ─── Generation logic ────────────────────────────────────────────────────
  //
  // PA refund contract (Sprint 43 QA Bug 2): PA is debited upfront by
  // `handlePAConfirmAndGenerate`. If the stream ultimately does not produce
  // a persisted itinerary, we call `refundPAForAIAction` to credit the cost
  // back. The refund action is idempotent within a 10-minute window so even
  // if two failure paths both fire, the user only gets one refund.
  const refundGeneration = useCallback(
    async (reason: "timeout" | "stream_failed" | "persist_failed" | "generation_failed") => {
      try {
        const result = await refundPAForAIAction(tripId, "ai_itinerary", reason);
        if (result.success && result.data) {
          setPABalance(result.data.newBalance);
          router.refresh();
        }
      } catch { /* non-critical — log is server-side */ }
    },
    [tripId, router],
  );

  const handleGenerate = useCallback(async () => {
    setError(null);
    setIsGenerating(true);
    setDaysGenerated(0);
    setProgressPercent(0);
    accumulatedRef.current = "";

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    startProgressTimer();
    track("ai_generation_triggered", { phase: 6, tripId });

    try {
      const response = await fetch("/api/ai/plan/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId, destination, startDate: effectiveStartDate, endDate: effectiveEndDate,
          travelStyle, budgetTotal, budgetCurrency, travelers, language, travelNotes, expeditionContext,
          ...(selectedCategories.length > 0 ? { extraCategories: selectedCategories } : {}),
          ...(personalNotes.trim() ? { personalNotes: personalNotes.trim() } : {}),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let errorBody: string | undefined;
        try {
          const body = await response.json() as { error?: string };
          errorBody = body.error;
        } catch { /* response may not be JSON */ }
        setError(t(mapStatusToErrorKey(response.status, errorBody)));
        setIsGenerating(false);
        stopProgressTimer();
        refundGeneration("generation_failed");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setError(t("errorGenerate"));
        setIsGenerating(false);
        stopProgressTimer();
        refundGeneration("generation_failed");
        return;
      }

      // Line-buffered SSE reader — TCP chunks can split `data: [DONE]` or any
      // other line across reads. The previous naive split("\n") dropped half-
      // lines and sometimes never detected [DONE], leaving the UI stuck on
      // the empty state after a successful generation (Bug 3, Sprint 43 QA).
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError: string | null = null;
      let doneReceived = false;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process every complete line in the buffer; carry the trailing
        // partial line over to the next iteration.
        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") {
            doneReceived = true;
            break outer;
          }
          if (data.startsWith('{"error":')) {
            try {
              const errorObj = JSON.parse(data) as { error: string };
              if (errorObj.error === "persist_failed") streamError = "errorPersistFailed";
              else if (errorObj.error === "parse_failed" || errorObj.error === "stream_failed") {
                streamError = "errorTimeout";
              }
            } catch { /* ignore malformed error payload */ }
            continue;
          }
          accumulatedRef.current += data;
          const dayCount = countDaysInStream(accumulatedRef.current);
          if (dayCount > 0) {
            setDaysGenerated(dayCount);
            setProgressPercent(calculateProgressPercent(dayCount, totalDays));
          }
        }
      }
      stopProgressTimer();

      // Post-stream resolution. After [DONE] OR a natural stream end, ask
      // the server for the persisted itinerary. If it's there, render it;
      // if not, surface an explicit error instead of silently bouncing the
      // user back to the empty state.
      const durationMs = Date.now() - streamStartRef.current;
      track("ai_generation_completed", { phase: 6, tripId, durationMs, doneReceived });
      syncPhase6CompletionAction(tripId).catch(() => {});

      let freshDays: ItineraryDayWithActivities[] = [];
      try {
        freshDays = await getItineraryDaysAction(tripId);
      } catch { /* ignore fetch error */ }

      if (freshDays.length > 0) {
        setDays(freshDays);
        router.refresh();
        return;
      }

      // No persisted itinerary: either an upstream error already surfaced,
      // or the stream died silently. Either way, keep the user on a clear
      // error state rather than flashing back to the generation screen.
      setError(t(streamError ?? "errorTimeout"));
      // Refund the upfront PA debit. Uses the specific failure reason when
      // the server reported one so FinOps can track which path burned PA.
      refundGeneration(
        streamError === "errorPersistFailed"
          ? "persist_failed"
          : streamError === "errorTimeout"
          ? "stream_failed"
          : "timeout",
      );
      return;
    } catch (err) {
      stopProgressTimer();
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — refund so an abort doesn't cost PA.
        refundGeneration("generation_failed");
      } else {
        setError(t("errorTimeout"));
        refundGeneration("timeout");
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [tripId, destination, effectiveStartDate, effectiveEndDate, travelStyle, budgetTotal, budgetCurrency, travelers, language, travelNotes, expeditionContext, selectedCategories, personalNotes, t, totalDays, startProgressTimer, stopProgressTimer, router, refundGeneration]);

  // Auto-trigger removed — generation is now manual per SPEC-PROD-055.
  // User must click "Gerar Roteiro com IA" in the empty state.

  // ─── PA + generation handlers ────────────────────────────────────────────
  function handleRequestGenerate() {
    // Gate: require AI consent before proceeding (SPEC-PROD-056)
    if (!consentGranted && aiConsentGiven !== true) {
      setShowConsentModal(true);
      return;
    }
    setShowPAConfirm(true);
  }

  async function handlePAConfirmAndGenerate() {
    setIsSpending(true);
    setError(null);
    try {
      const spendResult = await spendPAForAIAction(tripId, "ai_itinerary");
      if (!spendResult.success) {
        setError(spendResult.error ?? t("errorGenerate"));
        setIsSpending(false);
        return;
      }
      if (spendResult.data && "remainingBalance" in spendResult.data) {
        setPABalance(spendResult.data.remainingBalance);
      }
      // Refresh the RSC so the navbar PA badge reflects the debit before
      // streaming starts. Without this, Bug 1 reappears if the stream
      // subsequently fails (debit applied server-side, navbar stale).
      router.refresh();
      setShowPAConfirm(false);
      setIsSpending(false);
      handleGenerate();
    } catch {
      setError(t("errorGenerate"));
      setIsSpending(false);
    }
  }

  function handleCancel() { abortControllerRef.current?.abort(); }

  /** Smart regen: user chose "Keep my activities" */
  function handleRegenKeepManual() {
    setShowRegenDialog(false);
    setKeepManual(true);
    handleRequestGenerate();
  }

  /** Smart regen: user chose "Regenerate all" */
  function handleRegenAll() {
    setShowRegenDialog(false);
    setKeepManual(false);
    handleRequestGenerate();
  }

  /** Close regen dialog without action */
  function handleRegenDialogClose() {
    setShowRegenDialog(false);
  }

  /** Toggle a personalization category chip */
  function handleToggleCategory(key: string) {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  /** Personalized re-generation with categories + notes */
  function handlePersonalizedRegen() {
    setRegenCount((c) => c + 1);
    if (hasManualActivities) {
      setShowRegenDialog(true);
      return;
    }
    handleRequestGenerate();
  }

  const hasPersonalizationInput = selectedCategories.length > 0 || personalNotes.trim().length > 0;
  const isRegenLimitReached = regenCount >= MAX_REGEN_COUNT;

  // Flag-aware navigation paths for WizardFooter (SPEC-UX-REORDER-PHASES §5.2)
  // Back: flag OFF = Guide (phase-5), flag ON = Guide (phase-3)
  // Next: flag OFF = summary (end), flag ON = Logistics (phase-5)
  const itineraryBackPath = isPhaseReorderEnabled() ? "phase-3" : "phase-5";
  const itineraryNextPath = isPhaseReorderEnabled() ? "phase-5" : null; // null → summary

  /** Refresh page data after an activity add/edit/delete */
  function handleActivityMutate() {
    router.refresh();
  }

  // ─── GENERATING STATE ──────────────────────────────────────────────────
  if (isGenerating) {
    return (
      <PhaseShell
        tripId={tripId} viewingPhase={6} tripCurrentPhase={tripCurrentPhase}
        completedPhases={completedPhases} phaseTitle={t("title")}
        showFooter={false} contentMaxWidth="4xl"
      >
        <AiGenerationProgress
          type="plan"
          progressMessage={progressMessage}
          progressPercent={progressPercent}
          extraDetail={
            daysGenerated > 0
              ? t("progressDaysPlanned", { count: daysGenerated })
              : undefined
          }
          onCancel={handleCancel}
        />
        <div className="mx-auto mt-6 w-full max-w-md space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <AtlasCard key={i} loading className="h-16" />
          ))}
        </div>
      </PhaseShell>
    );
  }

  // ─── EMPTY STATE ───────────────────────────────────────────────────────
  if (!hasItinerary) {
    return (
      <PhaseShell
        tripId={tripId} viewingPhase={6} tripCurrentPhase={tripCurrentPhase}
        completedPhases={completedPhases} phaseTitle={t("title")} phaseSubtitle={isPhaseReorderEnabled() ? t("subtitleReordered") : t("subtitle")}
        showFooter={false} contentMaxWidth="4xl"
      >
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-3xl mx-auto">
          {/* Sparkles icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-atlas-primary/10 mb-6">
            <svg className="w-8 h-8 text-atlas-primary" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
            </svg>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold font-atlas-headline text-atlas-on-surface mb-3">
            {t("emptyTitle", { destination })}
          </h2>

          <p className="text-base text-atlas-on-surface-variant font-atlas-body mb-8 max-w-lg">
            {t("emptyDescription")}
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 w-full">
            <div className="p-5 rounded-xl bg-atlas-surface-container border border-atlas-outline-variant/30">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-atlas-primary/10 mb-3 mx-auto">
                <span className="text-atlas-primary text-lg" aria-hidden="true">{"\uD83D\uDCCD"}</span>
              </div>
              <h3 className="font-bold font-atlas-headline text-sm text-atlas-on-surface mb-1">{t("featureOptimization")}</h3>
              <p className="text-xs text-atlas-on-surface-variant font-atlas-body">{t("featureOptimizationDesc")}</p>
            </div>
            <div className="p-5 rounded-xl bg-atlas-surface-container border border-atlas-outline-variant/30">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 mb-3 mx-auto">
                <span className="text-emerald-600 text-lg" aria-hidden="true">{"\uD83D\uDCA1"}</span>
              </div>
              <h3 className="font-bold font-atlas-headline text-sm text-atlas-on-surface mb-1">{t("featureTips")}</h3>
              <p className="text-xs text-atlas-on-surface-variant font-atlas-body">{t("featureTipsDesc")}</p>
            </div>
            <div className="p-5 rounded-xl bg-atlas-surface-container border border-atlas-outline-variant/30">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-atlas-tertiary/10 mb-3 mx-auto">
                <span className="text-atlas-tertiary text-lg" aria-hidden="true">{"\u2705"}</span>
              </div>
              <h3 className="font-bold font-atlas-headline text-sm text-atlas-on-surface mb-1">{t("featureChecklist")}</h3>
              <p className="text-xs text-atlas-on-surface-variant font-atlas-body">{t("featureChecklistDesc")}</p>
            </div>
          </div>

          <p className="text-sm font-semibold text-atlas-on-tertiary-container mb-4">
            {t("paCost", { cost: PA_COST })}
          </p>

          {error && (
            <p role="alert" className="text-sm font-atlas-body text-atlas-error mb-3">{error}</p>
          )}

          <PAConfirmationModal
            isOpen={showPAConfirm} onClose={() => setShowPAConfirm(false)}
            onConfirm={handlePAConfirmAndGenerate} featureName={t("title")}
            paCost={PA_COST} currentBalance={paBalance} isLoading={isSpending}
          />

          <AtlasButton
            onClick={handleRequestGenerate}
            disabled={isGenerating || isAgeRestricted}
            size="lg"
            title={isAgeRestricted ? tAge("tooltip") : undefined}
            aria-disabled={isAgeRestricted || undefined}
          >
            {t("generateCta")} {"\u2192"}
          </AtlasButton>
          {isAgeRestricted && (
            <p className="text-xs text-atlas-gold mt-2">{tAge("tooltip")}</p>
          )}

          <p className="text-xs text-atlas-on-surface-variant/60 font-atlas-body mt-6">
            {t("processingNote")}
          </p>

          {/* Navigation: Back / Advance (skip itinerary) */}
          <div className="mt-8 w-full">
            <PhaseFooter
              onNext={() =>
                router.push(
                  itineraryNextPath
                    ? `/expedition/${tripId}/${itineraryNextPath}`
                    : `/expedition/${tripId}/summary`
                )
              }
              onBack={() => router.push(`/expedition/${tripId}/${itineraryBackPath}`)}
            />
          </div>
        </div>
      </PhaseShell>
    );
  }

  // ─── GENERATED STATE — Split 60/40 layout ──────────────────────────────
  return (
    <PhaseShell
      tripId={tripId} viewingPhase={6} tripCurrentPhase={tripCurrentPhase}
      completedPhases={completedPhases} phaseTitle={t("title")}
      isEditMode={accessMode === "revisit" && !isJustGenerated} showFooter={false} contentMaxWidth="4xl"
    >
      {/* Main split layout */}
      <div className="flex flex-col md:flex-row min-h-screen -mx-4 sm:-mx-6">
        {/* Left Column — 60% — Itinerary content */}
        <section className="w-full md:w-3/5 px-4 sm:px-8 py-6 md:py-12 bg-atlas-surface">
          {/* Content header */}
          <header className="flex flex-col gap-6 mb-12">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div>
                <h1
                  className="text-3xl md:text-5xl font-atlas-headline font-extrabold tracking-tight text-atlas-on-surface mb-2"
                  data-testid="itinerary-heading"
                >
                  {t("yourItinerary")}: {destination}
                </h1>
                <p className="text-lg text-atlas-on-surface-variant font-medium font-atlas-body">
                  {totalDays} {t("days")} {travelers > 1 ? `\u2022 ${travelers} ${t("travelers")}` : ""}
                  {travelStyle ? ` \u2022 ${t(`style_${travelStyle.toLowerCase()}`)}` : ""}
                </p>
              </div>
            </div>

            {/* View Toggle + Day Selector */}
            <div className="flex items-center gap-3">
              <DaySelectorPills
                days={v2Days}
                selectedDay={selectedDay}
                onSelect={(day) => { setSelectedDay(day); setViewMode("by_day"); }}
                locale={locale}
              />
              <div className="flex shrink-0 rounded-lg border border-atlas-outline-variant/30 overflow-hidden" data-testid="view-toggle">
                <button
                  onClick={() => setViewMode("by_day")}
                  className={`px-3 py-1.5 text-xs font-bold font-atlas-body transition-colors ${viewMode === "by_day" ? "bg-atlas-primary text-atlas-on-primary" : "text-atlas-on-surface-variant hover:bg-atlas-surface-container-high"}`}
                  aria-pressed={viewMode === "by_day"}
                  data-testid="view-toggle-day"
                >
                  {t("viewByDay")}
                </button>
                <button
                  onClick={() => setViewMode("continuous")}
                  className={`px-3 py-1.5 text-xs font-bold font-atlas-body transition-colors ${viewMode === "continuous" ? "bg-atlas-primary text-atlas-on-primary" : "text-atlas-on-surface-variant hover:bg-atlas-surface-container-high"}`}
                  aria-pressed={viewMode === "continuous"}
                  data-testid="view-toggle-continuous"
                >
                  {t("viewContinuous")}
                </button>
              </div>
            </div>
          </header>

          {/* Day content — By Day mode */}
          {viewMode === "by_day" && currentDay && (
            <section
              id={`day-panel-${currentDay.dayNumber}`}
              role="tabpanel"
              aria-labelledby={`day-tab-${currentDay.dayNumber}`}
              aria-label={`Dia ${currentDay.dayNumber} ${currentDay.title ? `\u2014 ${currentDay.title}` : ""}`}
              data-testid={`day-panel-${currentDay.dayNumber}`}
            >
              <DayHeader day={currentDay} />
              <ActivityTimeline activities={currentDay.activities} dayId={currentDay.id} tripId={tripId} t={t} onMutate={handleActivityMutate} />
              <DaySummaryCard day={currentDay} t={t} />
            </section>
          )}

          {/* Day content — Continuous list mode */}
          {viewMode === "continuous" && (
            <div className="space-y-6" data-testid="continuous-view">
              {v2Days.map((day) => (
                <section key={day.dayNumber} data-testid={`continuous-day-${day.dayNumber}`}>
                  <DayHeader day={day} />
                  <ActivityTimeline activities={day.activities} dayId={day.id} tripId={tripId} t={t} onMutate={handleActivityMutate} />
                </section>
              ))}
            </div>
          )}

          {/* AI disclaimer */}
          <div className="mt-6">
            <AiDisclaimer message={t("aiDisclaimer")} />
          </div>

          {/* Itinerary personalization section — visible only when itinerary is generated */}
          <section
            className="mt-8 bg-atlas-surface-container p-6 md:p-8 rounded-xl border border-atlas-outline-variant/30"
            aria-labelledby="personalize-heading"
            data-testid="personalization-section"
          >
            <h3
              id="personalize-heading"
              className="text-xl font-bold font-atlas-headline text-atlas-on-surface mb-4"
            >
              {t("personalizeTitle")}
            </h3>

            {/* Category chips — multi-select */}
            <div
              className="flex flex-wrap gap-2 mb-4"
              role="group"
              aria-label={t("personalizeTitle")}
              data-testid="personalization-chips"
            >
              {ITINERARY_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleToggleCategory(cat.key)}
                    aria-pressed={isSelected}
                    className={[
                      "min-h-[44px] px-4 py-2 rounded-full text-sm font-bold font-atlas-body",
                      "transition-colors duration-150 motion-reduce:transition-none",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring focus-visible:ring-offset-2",
                      isSelected
                        ? "bg-atlas-secondary-container text-atlas-primary"
                        : "bg-atlas-surface-container-lowest text-atlas-on-surface-variant border border-atlas-outline-variant/40 hover:bg-atlas-surface-container-low",
                    ].join(" ")}
                    data-testid={`personalization-chip-${cat.key}`}
                  >
                    <span aria-hidden="true">{cat.emoji}</span>{" "}
                    {t(`category_${cat.key}`)}
                  </button>
                );
              })}
            </div>

            {/* Personal notes textarea */}
            <div className="mb-4">
              <label
                htmlFor="personal-notes-textarea"
                className="sr-only"
              >
                {t("personalizeTitle")}
              </label>
              <textarea
                id="personal-notes-textarea"
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                maxLength={PERSONAL_NOTES_MAX_LENGTH}
                rows={3}
                placeholder={t("personalNotesPlaceholder")}
                className="w-full rounded-lg border border-atlas-outline-variant/50 px-4 py-3 text-sm font-atlas-body bg-atlas-surface text-atlas-on-surface placeholder:text-atlas-on-surface-variant/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring resize-y"
                data-testid="personal-notes-textarea"
              />
              <p className="mt-1 text-xs text-atlas-on-surface-variant/60 font-atlas-body text-right">
                {personalNotes.length}/{PERSONAL_NOTES_MAX_LENGTH}
              </p>
            </div>

            {/* Re-generate button + counter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <AtlasButton
                onClick={handlePersonalizedRegen}
                disabled={isAgeRestricted || !hasPersonalizationInput || isRegenLimitReached || isGenerating}
                data-testid="personalized-regen-btn"
                title={isAgeRestricted ? tAge("tooltip") : undefined}
              >
                {t("regenerateItineraryCta", { cost: PA_COST })}
              </AtlasButton>
              <span
                className="text-xs text-atlas-on-surface-variant/60 font-atlas-body"
                data-testid="regen-counter"
              >
                {t("regenCounter", { used: regenCount, max: MAX_REGEN_COUNT })}
              </span>
            </div>
          </section>

          {/* Error display */}
          {error && (
            <p role="alert" className="mt-4 text-sm font-atlas-body text-atlas-error">{error}</p>
          )}

          {/* Smart regeneration dialog — SPEC-ROTEIRO-REGEN-INTELIGENTE AC-004 */}
          {showRegenDialog && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              role="dialog"
              aria-modal="true"
              aria-labelledby="regen-dialog-title"
              data-testid="regen-dialog"
              onClick={(e) => { if (e.target === e.currentTarget) handleRegenDialogClose(); }}
              onKeyDown={(e) => { if (e.key === "Escape") handleRegenDialogClose(); }}
            >
              <div className="bg-atlas-surface rounded-xl p-6 max-w-md mx-4 space-y-4 shadow-xl relative">
                {/* Close button */}
                <button
                  type="button"
                  onClick={handleRegenDialogClose}
                  className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-atlas-on-surface-variant hover:bg-atlas-surface-container-high transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
                  aria-label={tExpedition("cta.viewExpeditions")}
                  data-testid="regen-dialog-close"
                >
                  <XIcon />
                </button>

                <h3
                  id="regen-dialog-title"
                  className="font-bold font-atlas-headline text-lg text-atlas-on-surface pr-10"
                >
                  {t("regenDialogTitle")}
                </h3>

                <p className="text-sm text-atlas-on-surface-variant font-atlas-body">
                  {t("regenDialogMessage", { count: manualActivityCount })}
                </p>

                <div className="flex flex-col gap-2 pt-2">
                  <AtlasButton
                    onClick={handleRegenKeepManual}
                    data-testid="regen-keep-manual-btn"
                    aria-describedby="regen-keep-desc"
                  >
                    {t("regenKeepManual")}
                  </AtlasButton>
                  <p id="regen-keep-desc" className="text-xs text-atlas-on-surface-variant font-atlas-body -mt-1 mb-1">
                    {t("regenKeepManualDesc")}
                  </p>

                  <AtlasButton
                    variant="secondary"
                    onClick={handleRegenAll}
                    data-testid="regen-all-btn"
                  >
                    {t("regenAll")}
                  </AtlasButton>
                  <p className="text-xs text-atlas-on-surface-variant font-atlas-body -mt-1 mb-1">
                    {t("regenAllDesc")}
                  </p>

                  <AtlasButton
                    variant="ghost"
                    onClick={handleRegenDialogClose}
                    data-testid="regen-cancel-btn"
                  >
                    {t("regenerateConfirmNo")}
                  </AtlasButton>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Column — 40% — Map Panel (AC-P6-051) */}
        <MapPanel
          activities={currentDay?.activities ?? []}
          t={t}
        />
      </div>

      {/* AI Consent Modal (SPEC-PROD-056) */}
      <AiConsentModal
        open={showConsentModal}
        onAccepted={() => {
          setShowConsentModal(false);
          setConsentGranted(true);
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
        isOpen={showPAConfirm} onClose={() => setShowPAConfirm(false)}
        onConfirm={handlePAConfirmAndGenerate} featureName={t("title")}
        paCost={PA_COST} currentBalance={paBalance} isLoading={isSpending}
      />

      {/* Standardized PhaseFooter — flag-aware navigation (SPEC-UX-REORDER-PHASES §5.2) */}
      <PhaseFooter
        onNext={() =>
          router.push(
            itineraryNextPath
              ? `/expedition/${tripId}/${itineraryNextPath}`
              : `/expedition/${tripId}/summary`
          )
        }
        onBack={() => router.push(`/expedition/${tripId}/${itineraryBackPath}`)}
      />
    </PhaseShell>
  );
}
