"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasCard } from "@/components/ui/AtlasCard";
import { AtlasBadge } from "@/components/ui/AtlasBadge";
import { getNextRankProgress, RANK_THRESHOLDS } from "@/lib/gamification/rank-calculator";
import { DestinationImage } from "@/components/ui/DestinationImage";
import type { Rank } from "@/types/gamification.types";
import type { ExpeditionDTO } from "@/types/expedition.types";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_EXPEDITION_PHASES = 8;
const MAX_RECENT_BADGES = 3;
const MAX_TRIP_CARDS = 3;

const PHASE_NAMES_KEYS = [
  "theCalling",
  "theExplorer",
  "thePreparation",
  "theLogistics",
  "theDestinationGuide",
  "theItinerary",
  "theExpedition",
  "theLegacy",
] as const;

// Status-to-sort priority: IN_PROGRESS (active) → DRAFT (planned) → PLANNED (completed/other)
const STATUS_SORT_PRIORITY: Record<string, number> = {
  active: 0,
  planned: 1,
  overdue: 1,
  completed: 2,
};

// ─── Inline Icons ────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ShoppingIcon() {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function MedalIcon() {
  return (
    <svg
      className="size-8"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      className="size-12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      className="size-10 text-atlas-on-surface-variant/40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BadgeDTO {
  badgeKey: string;
  earnedAt: string;
  icon: string;
  nameKey: string;
}

export interface GamificationData {
  totalPoints: number;
  availablePoints: number;
  currentRank: Rank;
}

export interface DashboardV2Props {
  userName: string;
  gamification: GamificationData;
  expeditions: ExpeditionDTO[];
  recentBadges: BadgeDTO[];
  isLoading?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getActiveExpedition(expeditions: ExpeditionDTO[]): ExpeditionDTO | null {
  // Find the most recently updated non-completed expedition
  const active = expeditions.filter(
    (exp) => exp.completedPhases.length < exp.totalPhases
  );
  if (active.length === 0) return null;
  // Sort by createdAt descending, return most recent
  return active.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

function getDaysUntilTrip(startDate: string | null): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = start.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : null;
}

function calculateXpProgress(totalPoints: number): {
  currentMin: number;
  nextMin: number;
  percent: number;
} {
  const sortedAsc = [...RANK_THRESHOLDS].reverse();
  let currentMin = 0;
  let nextMin = sortedAsc[1]?.minPoints ?? 300;

  for (let i = sortedAsc.length - 1; i >= 0; i--) {
    const threshold = sortedAsc[i]!;
    if (totalPoints >= threshold.minPoints) {
      currentMin = threshold.minPoints;
      const nextThreshold = sortedAsc[i + 1];
      nextMin = nextThreshold ? nextThreshold.minPoints : threshold.minPoints;
      break;
    }
  }

  if (currentMin === nextMin) {
    return { currentMin, nextMin, percent: 100 };
  }

  const range = nextMin - currentMin;
  const progress = totalPoints - currentMin;
  const percent = Math.min(100, Math.round((progress / range) * 100));

  return { currentMin, nextMin, percent };
}

function calculateLevel(totalPoints: number): number {
  return Math.min(Math.floor(totalPoints / 100) + 1, 99);
}

function getSortedExpeditions(expeditions: ExpeditionDTO[]): ExpeditionDTO[] {
  // Deduplicate by ID (safety guard against data duplication)
  const seen = new Set<string>();
  const unique = expeditions.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  return unique.sort((a, b) => {
    const aPriority = STATUS_SORT_PRIORITY[a.status] ?? 2;
    const bPriority = STATUS_SORT_PRIORITY[b.status] ?? 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function getTripDurationLabel(startDate: string | null, endDate: string | null): string | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[start.getMonth()] ?? "";
  return `${days}d - ${month}`;
}

function getTripProgressPercent(exp: ExpeditionDTO): number {
  if (exp.totalPhases === 0) return 0;
  return Math.round((exp.completedPhases.length / exp.totalPhases) * 100);
}

function getStatusBadgeColor(status: string): "success" | "warning" | "info" {
  switch (status) {
    case "active":
      return "warning";
    case "planned":
    case "overdue":
      return "success";
    default:
      return "info";
  }
}

function getStatusLabelKey(status: string): string {
  switch (status) {
    case "active":
      return "inProgress";
    case "planned":
    case "overdue":
      return "planned";
    default:
      return "draft";
  }
}

// Gradient fallbacks for trip cards (atlas-compliant)
const CARD_GRADIENTS = [
  "from-atlas-secondary-container/70 to-atlas-primary/60",
  "from-atlas-tertiary-fixed/70 to-atlas-primary/50",
  "from-atlas-secondary/50 to-atlas-primary/60",
];

// Known destination → Unsplash image mapping (verified CDN URLs via redirect)
// To add a destination: 1) Find photo on unsplash.com 2) curl -sI -L "https://unsplash.com/photos/{ID}/download?w=600" 3) Use the Location header URL hash
// DESTINATION_IMAGES map and getDestinationImage are imported from @/lib/utils/destination-images

// ─── Phase Progress Section (extracted for reorder) ──────────────────────────

function PhaseProgressSection({
  activeTrip,
  t,
  tPhases,
}: {
  activeTrip: ExpeditionDTO;
  t: (key: string, values?: Record<string, string | number>) => string;
  tPhases: (key: string) => string;
}) {
  const phaseSegments = Array.from({ length: TOTAL_EXPEDITION_PHASES }, (_, i) => {
    const phase = i + 1;
    const completed = activeTrip.completedPhases.includes(phase);
    const active = phase === activeTrip.currentPhase;
    return {
      phase,
      label: tPhases(PHASE_NAMES_KEYS[i] ?? "theCalling"),
      state: completed ? "completed" : active ? "active" : "pending",
    };
  });

  return (
    <section className="space-y-4" data-testid="trip-status-section">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <AtlasBadge variant="category-overline">
            {t("tripStatus")}
          </AtlasBadge>
          <h2 className="text-2xl font-extrabold text-atlas-primary font-atlas-headline lg:text-3xl">
            {t("phaseLabel", {
              number: activeTrip.currentPhase,
              name: tPhases(PHASE_NAMES_KEYS[activeTrip.currentPhase - 1] ?? "theCalling"),
            })}
          </h2>
        </div>
        <p className="text-sm font-medium font-atlas-body text-atlas-on-surface-variant">
          {t("phasesCompleted", {
            completed: activeTrip.completedPhases.length,
            total: TOTAL_EXPEDITION_PHASES,
          })}
        </p>
      </div>
      <div className="flex w-full gap-2" data-testid="phase-progress-bar">
        {phaseSegments.map((seg) => (
          <div
            key={seg.phase}
            className={[
              "h-1.5 flex-1 rounded-full transition-colors",
              seg.state === "completed"
                ? "bg-atlas-secondary-container"
                : seg.state === "active"
                  ? "bg-atlas-secondary-container shadow-[0_0_12px_rgba(254,147,44,0.4)]"
                  : "bg-atlas-surface-container-high",
            ].join(" ")}
            title={`${seg.label} - ${seg.state}`}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardV2({
  userName,
  gamification,
  expeditions,
  recentBadges,
  isLoading = false,
}: DashboardV2Props) {
  const t = useTranslations("dashboardV2");
  const tPhases = useTranslations("gamification.phases");
  const tRanks = useTranslations("gamification.ranks");
  const tBadges = useTranslations("gamification.badges");

  const activeTrip = useMemo(() => getActiveExpedition(expeditions), [expeditions]);
  const rankProgress = useMemo(
    () => getNextRankProgress(gamification.totalPoints),
    [gamification.totalPoints],
  );
  const xpProgress = useMemo(
    () => calculateXpProgress(gamification.totalPoints),
    [gamification.totalPoints],
  );
  const level = useMemo(
    () => calculateLevel(gamification.totalPoints),
    [gamification.totalPoints],
  );
  const daysUntil = useMemo(
    () => (activeTrip ? getDaysUntilTrip(activeTrip.startDate) : null),
    [activeTrip],
  );

  // Build phase segments for active trip — now 8 phases
  const phaseSegments = useMemo(() => {
    if (!activeTrip) return [];
    return Array.from({ length: TOTAL_EXPEDITION_PHASES }, (_, i) => {
      const phase = i + 1;
      const isCompleted = activeTrip.completedPhases.includes(phase);
      const isActive = phase === activeTrip.currentPhase && !isCompleted;
      return {
        phase,
        label: tPhases(PHASE_NAMES_KEYS[i]!),
        state: isCompleted ? "completed" as const : isActive ? "active" as const : "pending" as const,
      };
    });
  }, [activeTrip, tPhases]);

  // Sort expeditions for the grid
  const sortedExpeditions = useMemo(() => getSortedExpeditions(expeditions), [expeditions]);
  const displayedExpeditions = sortedExpeditions
    .filter((e) => e.id !== activeTrip?.id)
    .slice(0, MAX_TRIP_CARDS);
  const hasMoreExpeditions = expeditions.length > (activeTrip ? MAX_TRIP_CARDS + 1 : MAX_TRIP_CARDS);

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-8" data-testid="dashboard-v2-loading">
        <div className="space-y-4">
          <div className="h-10 w-2/3 animate-pulse rounded-atlas-lg bg-atlas-surface-container-high motion-reduce:animate-none" />
          <div className="h-5 w-1/2 animate-pulse rounded-atlas-lg bg-atlas-surface-container-high motion-reduce:animate-none" />
        </div>
        <AtlasCard loading />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8"><AtlasCard loading /></div>
          <div className="lg:col-span-4"><AtlasCard loading /></div>
        </div>
      </div>
    );
  }

  // ─── Main Dashboard ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-12 lg:space-y-16" data-testid="dashboard-v2">
      {/* ── Section 2: Greeting ────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-col gap-2">
          <h2
            className="text-3xl font-extrabold tracking-tight text-atlas-primary font-atlas-headline lg:text-4xl"
            data-testid="dashboard-greeting"
          >
            {t("greeting", { name: userName })}
          </h2>
          <p className="max-w-xl text-lg font-atlas-body text-atlas-on-surface-variant">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* ── Section 3: ACTIVE ROUTE STATUS — Phase progress (before trip card) */}
      {activeTrip && (
        <PhaseProgressSection activeTrip={activeTrip} t={t} tPhases={tPhases} />
      )}

      {/* ── Section 4: NEXT STOP — Active trip card ────────────────────────── */}
      <section data-testid="featured-trip-section">
        {activeTrip ? (
          <div className="group relative h-80 overflow-hidden rounded-atlas-xl bg-atlas-primary-container shadow-atlas-xl lg:h-[480px]">
            {/* Destination image (with gradient overlay for text legibility) */}
            <DestinationImage
              destination={activeTrip.destination}
              alt={activeTrip.destination}
              fill
              priority
              sizes="100vw"
              quality={85}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-atlas-primary/90 via-atlas-primary/40 to-transparent" />
            {/* View details link - top right */}
            <div className="absolute right-4 top-4 z-10 lg:right-6 lg:top-6">
              <Link
                href={`/expedition/${activeTrip.id}`}
                className="text-sm font-medium text-atlas-on-primary/80 underline-offset-4 hover:text-atlas-on-primary hover:underline font-atlas-body transition-colors"
                data-testid="view-details-link"
              >
                {t("viewDetails")}
              </Link>
            </div>
            {/* Content at bottom */}
            <div className="absolute bottom-0 left-0 w-full p-6 lg:p-10">
              <div className="mb-4 flex items-center gap-3">
                <AtlasBadge variant="status" color="warning" size="sm">
                  {t("nextStop")}
                </AtlasBadge>
                {daysUntil !== null && (
                  <span className="flex items-center gap-1 text-sm font-medium font-atlas-body text-atlas-on-primary/80">
                    {t("daysUntil", { days: daysUntil })}
                  </span>
                )}
              </div>
              <h4
                className="mb-4 text-3xl font-black tracking-tight text-atlas-on-primary font-atlas-headline lg:text-5xl"
                data-testid="featured-destination"
              >
                {activeTrip.destination}
              </h4>
              <div className="flex gap-4">
                <Link href={`/expedition/${activeTrip.id}`}>
                  <AtlasButton
                    variant="secondary"
                    size="lg"
                    rightIcon={<ArrowRightIcon />}
                    data-testid="continue-planning-btn"
                  >
                    {t("continuePlanning")}
                  </AtlasButton>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-6 rounded-atlas-xl bg-atlas-surface-container-low py-16 text-center"
            data-testid="no-active-trip"
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-atlas-secondary-container/20 text-atlas-on-surface-variant">
              <CompassIcon />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-atlas-on-surface font-atlas-headline">
                {t("noActiveTrip")}
              </h3>
              <p className="max-w-sm font-atlas-body text-atlas-on-surface-variant">
                {t("noActiveTripSubtitle")}
              </p>
            </div>
            <Link href="/expedition/new">
              <AtlasButton size="lg" leftIcon={<PlusIcon />} data-testid="start-expedition-btn">
                {t("startNewExpedition")}
              </AtlasButton>
            </Link>
          </div>
        )}
      </section>

      {/* ── (Phase progress moved to Section 3 above) ── */}

      {/* ── Section 5: MY EXPEDITIONS — Grid of trips ─────────────────────── */}
      <section data-testid="my-expeditions-section">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-atlas-on-surface-variant/60 font-atlas-body">
            {t("myExpeditions")}
          </h3>
          <Link href="/expedition/new">
            <AtlasButton
              variant="ghost"
              size="sm"
              leftIcon={<PlusIcon />}
              data-testid="new-expedition-header-btn"
            >
              {t("newExpedition")}
            </AtlasButton>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Trip cards */}
          {displayedExpeditions.map((exp, idx) => {
            const progressPercent = getTripProgressPercent(exp);
            const durationLabel = getTripDurationLabel(exp.startDate, exp.endDate);
            const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length]!;
            const statusKey = getStatusLabelKey(exp.status);
            const badgeColor = getStatusBadgeColor(exp.status);

            return (
              <Link
                key={exp.id}
                href={`/expedition/${exp.id}`}
                className="block"
              >
                <div
                  className="group overflow-hidden rounded-atlas-xl bg-atlas-surface-container-lowest shadow-atlas-sm transition-transform hover:-translate-y-1 motion-reduce:hover:translate-y-0"
                  data-testid="trip-card"
                >
                  {/* Destination image */}
                  <div className={`h-[200px] relative overflow-hidden bg-gradient-to-br ${gradient}`}>
                    <DestinationImage
                      destination={exp.destination}
                      alt={exp.destination}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                    <div className="absolute left-3 top-3">
                      <AtlasBadge variant="status" color={badgeColor} size="sm">
                        {t(statusKey)}
                      </AtlasBadge>
                    </div>
                  </div>
                  {/* Card body */}
                  <div className="p-4 space-y-3">
                    <h4 className="font-bold text-atlas-primary font-atlas-headline truncate">
                      {exp.destination}
                    </h4>
                    {durationLabel && (
                      <div className="flex items-center gap-1.5 text-xs text-atlas-on-surface-variant font-atlas-body">
                        <CalendarIcon />
                        <span>{durationLabel}</span>
                      </div>
                    )}
                    {/* Mini progress bar */}
                    <div className="space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-atlas-surface-container-high">
                        <div
                          className="h-full rounded-full bg-atlas-secondary-container transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-atlas-on-surface-variant/60 font-atlas-body">
                        {progressPercent}%
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* "New Destination" card (always last) */}
          <Link href="/expedition/new" className="block" data-testid="new-destination-card">
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 rounded-atlas-xl bg-atlas-surface-container-low p-6 text-center transition-transform hover:-translate-y-1 motion-reduce:hover:translate-y-0">
              <MapPinIcon />
              <div className="space-y-1">
                <h4 className="font-bold text-atlas-primary font-atlas-headline">
                  {t("newDestination")}
                </h4>
                <p className="text-sm font-atlas-body text-atlas-on-surface-variant">
                  {t("newDestinationDesc")}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* View all link */}
        {hasMoreExpeditions && (
          <div className="mt-6 text-center">
            <Link
              href="/expeditions"
              className="text-sm font-medium text-atlas-primary hover:underline font-atlas-body"
              data-testid="view-all-expeditions-link"
            >
              {t("viewAllExpeditions")}
            </Link>
          </div>
        )}
      </section>

      {/* ── Section 6: LEVEL & POINTS ─────────────────────────────────────── */}
      <section>
        <AtlasCard
          variant="base"
          className="!shadow-atlas-sm !border-atlas-outline-variant/10"
          data-testid="xp-bar-card"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-atlas-lg bg-atlas-primary-container">
                <span className="text-atlas-secondary-container">
                  <MedalIcon />
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-atlas-primary font-atlas-headline">
                  {t("levelLabel", { level, rank: tRanks(gamification.currentRank) })}
                </h3>
                <p className="text-sm font-medium font-atlas-body text-atlas-secondary">
                  {t("pointsLabel", { points: gamification.totalPoints.toLocaleString() })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-atlas-on-surface-variant/60 font-atlas-body">
                {t("nextRankLabel")}
              </p>
              <p className="text-sm font-semibold text-atlas-primary font-atlas-body">
                {rankProgress.pointsToNext !== null
                  ? t("pointsToNext", { points: rankProgress.pointsToNext })
                  : t("maxRank")}
              </p>
            </div>
          </div>
          <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-atlas-surface-container-high">
            <div
              className="h-full rounded-full bg-gradient-to-r from-atlas-primary to-atlas-secondary-container transition-all duration-1000 motion-reduce:transition-none"
              style={{ width: `${xpProgress.percent}%` }}
              role="progressbar"
              aria-valuenow={xpProgress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("progressPercent", { percent: xpProgress.percent })}
              data-testid="xp-progress-bar"
            />
          </div>
        </AtlasCard>
      </section>

      {/* ── Section 7: RECENT BADGES ──────────────────────────────────────── */}
      <section data-testid="recent-badges-section">
        <h3 className="mb-4 px-1 text-xs font-bold uppercase tracking-widest text-atlas-on-surface-variant/60 font-atlas-body">
          {t("recentBadges")}
        </h3>
        {recentBadges.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {recentBadges.slice(0, MAX_RECENT_BADGES).map((badge) => (
              <div
                key={badge.badgeKey}
                className="flex flex-col items-center gap-2 rounded-atlas-xl bg-atlas-surface-container-low p-4 text-center transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
                data-testid="badge-card"
              >
                <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-atlas-secondary-fixed text-2xl">
                  {badge.icon}
                </div>
                <p className="text-xs font-bold leading-tight text-atlas-primary font-atlas-body">
                  {tBadges(`${badge.badgeKey}.name`)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center gap-2 rounded-atlas-xl bg-atlas-surface-container-low p-6 text-center"
            data-testid="no-badges"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-atlas-surface-container-high text-atlas-on-surface-variant/40">
              <CompassIcon />
            </div>
            <p className="text-xs font-atlas-body text-atlas-on-surface-variant">
              {t("noBadges")}
            </p>
          </div>
        )}
      </section>

      {/* ── Section 8: QUICK ACTIONS — Only 2 ─────────────────────────────── */}
      <section data-testid="quick-actions-section">
        <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-atlas-on-surface-variant/60 font-atlas-body">
          {t("quickActions")}
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* New Expedition action */}
          <Link href="/expedition/new" className="block">
            <AtlasCard
              variant="interactive"
              className="!p-6"
              data-testid="action-new-expedition"
            >
              <div className="flex flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-atlas-lg bg-atlas-tertiary-fixed-dim text-atlas-on-tertiary-fixed-variant transition-transform group-hover:scale-110">
                  <PlusIcon />
                </div>
                <div>
                  <h5 className="font-bold text-atlas-primary font-atlas-headline">
                    {t("newExpedition")}
                  </h5>
                  <p className="text-sm font-atlas-body text-atlas-on-surface-variant">
                    {t("newExpeditionDesc")}
                  </p>
                </div>
              </div>
            </AtlasCard>
          </Link>

          {/* Buy PA action */}
          <Link href="/meu-atlas/comprar-pa" className="block">
            <AtlasCard
              variant="interactive"
              className="!p-6"
              data-testid="action-buy-pa"
            >
              <div className="flex flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-atlas-lg bg-atlas-primary-fixed text-atlas-on-primary-fixed-variant transition-transform group-hover:scale-110">
                  <ShoppingIcon />
                </div>
                <div>
                  <h5 className="font-bold text-atlas-primary font-atlas-headline">
                    {t("buyPA")}
                  </h5>
                  <p className="text-sm font-atlas-body text-atlas-on-surface-variant">
                    {t("buyPADesc")}
                  </p>
                </div>
              </div>
            </AtlasCard>
          </Link>
        </div>
      </section>
    </div>
  );
}
