"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasCard } from "@/components/ui/AtlasCard";
import { AtlasBadge } from "@/components/ui/AtlasBadge";
import { AtlasChip } from "@/components/ui/AtlasChip";
import { PointsAnimation } from "./PointsAnimation";
import { TripCountdown } from "./TripCountdown";
import { DestinationImage } from "@/components/ui/DestinationImage";
import { getPhaseStatusVisual, deriveCanonicalStatus, type PhaseStatus } from "@/lib/utils/phase-status";
import { Link } from "@/i18n/navigation";
import type { ExpeditionSummary as ExpeditionSummaryData } from "@/server/services/expedition-summary.service";
import type { TripReadinessResult } from "@/server/services/trip-readiness.service";
import type { BadgeKey } from "@/types/gamification.types";
import type { UserPreferences } from "@/lib/validations/preferences.schema";

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_ICONS = ["\uD83E\uDDED", "\uD83D\uDD0D", "\uD83D\uDCCB", "\uD83D\uDE97", "\uD83D\uDDFA\uFE0F", "\uD83D\uDC8E"] as const;
const PHASE_NAME_KEYS = [
  "theCalling", "theExplorer", "thePreparation",
  "theLogistics", "theDestinationGuide", "theItinerary",
] as const;

const TRANSPORT_EMOJIS: Record<string, string> = {
  flight: "\u2708\uFE0F",
  bus: "\uD83D\uDE8C",
  train: "\uD83D\uDE84",
  car: "\uD83D\uDE97",
  ship: "\uD83D\uDEA2",
  other: "\uD83D\uDE8D",
};

const MAX_PENDING_DISPLAY = 5;
const MAX_TRANSPORT_DISPLAY = 3;
const MAX_ACCOMMODATION_DISPLAY = 3;
const TOTAL_PHASES = 6;

const TRIP_TYPE_KEYS: Record<string, string> = {
  domestic: "tripTypeDomestic",
  mercosul: "tripTypeMercosul",
  international: "tripTypeInternational",
  schengen: "tripTypeSchengen",
};

const CHECKLIST_ITEM_KEYS: Record<string, string> = {
  // Legacy / EXTRA_CHECKLIST_ITEMS keys
  passport_valid_6m: "phase3ItemPassport",
  visa_required: "phase3ItemVisa",
  travel_insurance: "phase3ItemInsurance",
  yellow_fever_vaccine: "phase3ItemYellowFever",
  etias_eta: "phase3ItemEtias",
  emergency_contacts: "phase3ItemEmergency",
  copies_documents: "phase3ItemDocuments",
  local_currency: "phase3ItemCurrency",
  // Checklist rules keys (all trip types)
  national_id: "phase3ItemNationalId",
  passport: "phase3ItemPassportDoc",
  passport_validity: "phase3ItemPassportValidity",
  flight_tickets: "phase3ItemFlightTickets",
  accommodation: "phase3ItemAccommodation",
  travel_insurance_rec: "phase3ItemInsuranceRec",
  travel_insurance_30k: "phase3ItemInsurance30k",
  currency_exchange: "phase3ItemCurrencyExchange",
  visa_check: "phase3ItemVisaCheck",
  vaccinations: "phase3ItemVaccinations",
  notify_bank: "phase3ItemNotifyBank",
  international_sim: "phase3ItemInternationalSim",
  power_adapter: "phase3ItemPowerAdapter",
  schengen_visa: "phase3ItemSchengenVisa",
  eta_etias: "phase3ItemEtaEtias",
};

const TRANSPORT_TYPE_KEYS: Record<string, string> = {
  flight: "phase4TransportFlight",
  bus: "phase4TransportBus",
  train: "phase4TransportTrain",
  car: "phase4TransportCar",
  ferry: "phase4TransportFerry",
  other: "phase4TransportOther",
};

const ACCOMMODATION_TYPE_KEYS: Record<string, string> = {
  hotel: "phase4AccomHotel",
  hostel: "phase4AccomHostel",
  airbnb: "phase4AccomAirbnb",
  friends_house: "phase4AccomFriends",
  camping: "phase4AccomCamping",
  other: "phase4AccomOther",
};

const MOBILITY_TYPE_KEYS: Record<string, string> = {
  public_transit: "phase4MobilityPublicTransit",
  taxi_rideshare: "phase4MobilityTaxiRideshare",
  walking: "phase4MobilityWalking",
  bicycle: "phase4MobilityBicycle",
  private_transfer: "phase4MobilityPrivateTransfer",
  car_rental: "phase4MobilityCarRental",
  other: "phase4MobilityOther",
};

const PACE_LABELS: Record<string, string> = {
  1: "phase2PaceRelaxed",
  2: "phase2PaceRelaxed",
  3: "phase2PaceRelaxed",
  4: "phase2PaceModerate",
  5: "phase2PaceModerate",
  6: "phase2PaceModerate",
  7: "phase2PaceIntense",
  8: "phase2PaceIntense",
  9: "phase2PaceIntense",
  10: "phase2PaceIntense",
};

const FITNESS_KEYS: Record<string, string> = {
  low: "phase2FitnessLow",
  moderate: "phase2FitnessModerate",
  high: "phase2FitnessHigh",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpeditionSummaryV2Props {
  tripId: string;
  summary: ExpeditionSummaryData;
  readiness?: TripReadinessResult;
  startDate?: string | null;
  endDate?: string | null;
  celebration?: {
    pointsEarned: number;
    badgeAwarded: string | null;
  } | null;
  gamification?: {
    totalPA: number;
    rank: string;
    rankLabel: string;
    badgesEarned: number;
    phasesCompleted: number;
    pointsToNextRank: number;
    nextRankLabel: string;
    progressPercent: number;
  } | null;
}

// PhaseStatus imported from @/lib/utils/phase-status

// ─── Helpers ──────────────────────────────────────────────────────────────────

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-3.5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function calculateDuration(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round(diffMs / MS_PER_DAY) + 1;
}

function calculateTotalPassengers(passengers: { adults: number; children: number; infants: number; seniors: number } | null): number {
  if (!passengers) return 0;
  return passengers.adults + passengers.children + passengers.infants + passengers.seniors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExpeditionSummaryV2({
  tripId,
  summary,
  readiness,
  startDate,
  endDate,
  celebration,
  gamification,
}: ExpeditionSummaryV2Props) {
  const t = useTranslations("expedition.summaryV2");
  const tPhases = useTranslations("gamification.phases");
  const tPrefValue = useTranslations("expedition.phase2.step5.prefValue");
  const router = useRouter();
  const locale = useLocale();

  const [showCelebration, setShowCelebration] = useState(!!celebration);

  useEffect(() => {
    if (!celebration) setShowCelebration(false);
  }, [celebration]);

  if (showCelebration && celebration) {
    return (
      <PointsAnimation
        points={celebration.pointsEarned}
        badge={celebration.badgeAwarded as BadgeKey | null}
        onDismiss={() => setShowCelebration(false)}
      />
    );
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString(locale, {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch { return dateStr; }
  }

  function getPhaseStatus(phaseNum: number): PhaseStatus {
    if (!readiness) {
      const phaseKey = `phase${phaseNum}` as keyof typeof summary;
      return summary[phaseKey] ? "completed" : "not_started";
    }
    const phase = readiness.phases.find((p) => p.phase === phaseNum);
    if (!phase) return "not_started";

    // Detect pending items for Phase 3 (checklist) and Phase 4 (undecided)
    const hasPendingItems = detectPendingItems(phaseNum, summary);
    const currentPhaseNum = readiness.phases.find(
      (p) => p.status === "partial"
    )?.phase;

    return deriveCanonicalStatus({
      readinessStatus: phase.status,
      phaseNumber: phaseNum,
      isCurrentPhase: phaseNum === currentPhaseNum,
      hasPendingItems,
    });
  }

  function detectPendingItems(phaseNum: number, data: ExpeditionSummaryData): boolean {
    if (phaseNum === 3 && data.phase3) {
      return data.phase3.total > 0 && data.phase3.done < data.phase3.total;
    }
    if (phaseNum === 4 && data.phase4) {
      return !!(
        data.phase4.transportUndecided ||
        data.phase4.accommodationUndecided ||
        data.phase4.mobilityUndecided
      );
    }
    return false;
  }

  function getPhaseUrl(phaseNum: number): string {
    return `/expedition/${tripId}/phase-${phaseNum}`;
  }

  function getStatusBadgeColor(status: PhaseStatus): "success" | "warning" | "info" {
    return getPhaseStatusVisual(status).badgeColor;
  }

  function getStatusLabel(status: PhaseStatus): string {
    return t(getPhaseStatusVisual(status).badgeTextKey);
  }

  function getCtaLabel(status: PhaseStatus): string {
    return t(getPhaseStatusVisual(status).ctaTextKey);
  }

  function getBorderClass(status: PhaseStatus): string {
    return getPhaseStatusVisual(status).borderClass;
  }

  const completedCount = Array.from({ length: TOTAL_PHASES }, (_, i) => i + 1)
    .filter((n) => getPhaseStatus(n) === "completed").length;

  const destination = summary.phase1?.destination ?? null;
  const origin = summary.phase1?.origin ?? null;
  // coverImageUrl removed — DestinationImage component handles Unsplash API
  const duration = calculateDuration(
    summary.phase1?.startDate ?? null,
    summary.phase1?.endDate ?? null,
  );
  const totalPassengers = summary.phase2?.passengers
    ? calculateTotalPassengers(summary.phase2.passengers)
    : 0;

  // P0 #1: Use trip title with destination fallback
  const heroTitle = summary.tripTitle || destination || t("heroDestinationFallback");

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" data-testid="summary-v2">
      {/* ─── Hero Header ──────────────────────────────────────────────────── */}
      <section data-testid="summary-hero-v2" aria-labelledby="hero-heading">
        <div
          className="relative h-[200px] md:h-[240px] lg:h-[280px] rounded-atlas-2xl overflow-hidden"
          data-testid="hero-cover"
        >
          {destination ? (
            <>
              <DestinationImage
                destination={destination}
                alt={`Imagem de ${destination}`}
                fill
                sizes="100vw"
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />
            </>
          ) : (
            <div className="absolute inset-0 bg-atlas-surface-container-high" />
          )}

          <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
            {/* P0 #1: Trip title as H1, destination as subtitle */}
            <h1
              id="hero-heading"
              className="font-atlas-headline text-[28px] md:text-[36px] font-extrabold text-white"
              data-testid="hero-title"
            >
              {heroTitle}
            </h1>

            {origin && destination && (
              <p className="mt-1 text-base font-atlas-body text-white/80" data-testid="hero-route">
                {t("heroRoute", { origin, destination })}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {summary.phase1?.startDate && summary.phase1?.endDate ? (
                <p className="text-base font-atlas-body text-white/80">
                  {formatDate(summary.phase1.startDate)} - {formatDate(summary.phase1.endDate)}
                </p>
              ) : (
                <p className="text-base font-atlas-body text-white/60 italic">
                  {t("heroDatesUndefined")}
                </p>
              )}

              {duration !== null && (
                <AtlasBadge variant="status" color="info" size="md">
                  {t("heroDuration", { count: duration })}
                </AtlasBadge>
              )}

              {/* HERO-06: Traveler count badge */}
              {totalPassengers > 0 && (
                <span data-testid="hero-travelers">
                  <AtlasBadge variant="status" color="info" size="md">
                    {t("heroTravelers", { count: totalPassengers })}
                  </AtlasBadge>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Countdown below hero */}
        <div className="mt-4">
          <TripCountdown
            startDate={startDate ? new Date(startDate) : null}
            endDate={endDate ? new Date(endDate) : null}
          />
        </div>
      </section>

      {/* ─── Phase Progress Bar (moved above phase cards, clickable) ─────── */}
      <section className="mt-8" data-testid="phase-progress-bar">
        {/* Visible progress count label */}
        <p className="text-sm font-atlas-body font-bold text-atlas-on-surface mb-3" data-testid="progress-count-label">
          {t("progressCountLabel", { completed: completedCount, total: TOTAL_PHASES })}
        </p>
        <div
          role="navigation"
          aria-label={t("progressLabel", { completed: completedCount, total: TOTAL_PHASES })}
          className="flex items-center justify-between"
        >
          {Array.from({ length: TOTAL_PHASES }, (_, i) => {
            const phaseNum = i + 1;
            const status = getPhaseStatus(phaseNum);
            const isLast = phaseNum === TOTAL_PHASES;

            return (
              <div key={phaseNum} className="flex items-center flex-1 last:flex-none">
                {/* Circle — clickable, navigates to phase */}
                <Link href={getPhaseUrl(phaseNum)} className="flex flex-col items-center group cursor-pointer">
                  {(() => {
                    const visual = getPhaseStatusVisual(status);
                    return (
                      <>
                        <div
                          className={`
                            flex items-center justify-center rounded-full
                            size-7 md:size-8
                            ${visual.circleBg} ${visual.circleText} ${visual.circleBorder}
                            ${status === "in_progress" ? "shadow-atlas-glow-amber animate-pulse motion-reduce:animate-none" : ""}
                          `}
                          data-testid={`progress-circle-${phaseNum}`}
                        >
                          {visual.icon === "check" && <CheckIcon className="size-3.5 text-white" />}
                          {visual.icon === "number" && (
                            <span className="text-xs font-bold text-white">{phaseNum}</span>
                          )}
                          {visual.icon === "outline" && (
                            <span className="text-xs font-semibold text-atlas-on-surface-variant">{phaseNum}</span>
                          )}
                          {visual.icon === "lock" && (
                            <span className="text-xs" aria-hidden="true">🔒</span>
                          )}
                        </div>
                        <span
                          className={`
                            mt-1 text-[10px] md:text-xs font-atlas-body font-semibold text-center
                            ${status === "completed"
                              ? "text-[#059669]"
                              : status === "in_progress" || status === "pending"
                                ? "text-atlas-on-surface font-bold"
                                : "text-atlas-on-surface-variant"
                            }
                          `}
                        >
                          <span className="hidden sm:inline">{tPhases(PHASE_NAME_KEYS[i])}</span>
                          <span className="sm:hidden">{phaseNum}</span>
                        </span>
                      </>
                    );
                  })()}
                </Link>

                {/* Connecting line */}
                {!isLast && (
                  <div
                    className={`
                      flex-1 h-0.5 mx-1
                      ${status === "completed"
                        ? "bg-atlas-success"
                        : "bg-atlas-surface-container-high"
                      }
                    `}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Phase Cards ───────────────────────────────────────────────────── */}
      <section className="mt-8" aria-labelledby="phases-heading">
        <h2
          id="phases-heading"
          className="font-atlas-headline text-[28px] font-bold text-atlas-on-surface mb-4"
        >
          {t("phasesTitle")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="phase-cards-v2">
          {Array.from({ length: TOTAL_PHASES }, (_, i) => {
            const phaseNum = i + 1;
            const status = getPhaseStatus(phaseNum);
            const icon = PHASE_ICONS[i];
            const name = tPhases(PHASE_NAME_KEYS[i]);

            return (
              <AtlasCard
                key={phaseNum}
                variant="base"
                className={`${getBorderClass(status)} ${status === "not_started" ? "opacity-60" : ""}`}
                data-testid={`phase-card-v2-${phaseNum}`}
              >
                {/* Card header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl" aria-hidden="true">{icon}</span>
                    <div>
                      <h3 className="font-atlas-headline text-lg font-bold text-atlas-on-surface">
                        {name}
                      </h3>
                      <AtlasBadge variant="status" color={getStatusBadgeColor(status)} size="sm">
                        {getStatusLabel(status)}
                      </AtlasBadge>
                    </div>
                  </div>
                  <Link href={getPhaseUrl(phaseNum)}>
                    <AtlasButton variant="ghost" size="sm" data-testid={`edit-phase-v2-${phaseNum}`}>
                      {getCtaLabel(status)}
                    </AtlasButton>
                  </Link>
                </div>

                {/* Card body */}
                {status === "not_started" ? (
                  <div
                    className="mt-3 rounded-atlas-lg bg-atlas-surface-container-low px-3 py-2"
                    data-testid={`phase-placeholder-v2-${phaseNum}`}
                  >
                    <p className="text-xs italic font-atlas-body text-atlas-on-surface-variant">
                      {t("phaseEmptyText")}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <PhaseContent
                      phaseNum={phaseNum}
                      summary={summary}
                      formatDate={formatDate}
                      t={t}
                      tPrefValue={tPrefValue}
                      tripId={tripId}
                    />
                  </div>
                )}
              </AtlasCard>
            );
          })}
        </div>
      </section>

      {/* ─── Gamification Card ─────────────────────────────────────────────── */}
      {gamification && gamification.totalPA > 0 && (
        <section className="mt-8" data-testid="gamification-card">
          <AtlasCard variant="dark">
            <AtlasBadge variant="category-overline" className="text-atlas-secondary-fixed-dim">
              {t("gamificationTitle")}
            </AtlasBadge>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <AtlasBadge variant="pa" points={gamification.totalPA} />
              <AtlasBadge variant="rank" rankKey={gamification.rank}>
                {gamification.rankLabel}
              </AtlasBadge>
              {gamification.badgesEarned > 0 && (
                <span className="text-sm font-atlas-body text-atlas-on-primary">
                  {t("gamificationBadges", { count: gamification.badgesEarned })}
                </span>
              )}
            </div>

            {/* Rank progress bar */}
            {gamification.pointsToNextRank > 0 && (
              <div className="mt-4">
                <div
                  className="h-1 w-full rounded-full bg-atlas-primary overflow-hidden"
                  role="progressbar"
                  aria-valuenow={gamification.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t("gamificationNextRank", { rank: gamification.nextRankLabel, points: gamification.pointsToNextRank })}
                >
                  <div
                    className="h-full rounded-full bg-atlas-secondary-container transition-all duration-500 motion-reduce:transition-none"
                    style={{ width: `${gamification.progressPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs font-atlas-body text-atlas-primary-fixed-dim">
                  {t("gamificationNextRank", { rank: gamification.nextRankLabel, points: gamification.pointsToNextRank })}
                </p>
              </div>
            )}
          </AtlasCard>
        </section>
      )}

      {/* ─── Actions Bar ───────────────────────────────────────────────────── */}
      <nav
        className="mt-8 md:flex md:items-center md:justify-between fixed bottom-0 left-0 right-0 md:static bg-atlas-surface-container-lowest md:bg-transparent border-t border-atlas-outline-variant/20 md:border-0 px-4 py-3 md:px-0 md:py-0 shadow-[0_-2px_8px_rgba(0,0,0,0.1)] md:shadow-none z-10"
        role="navigation"
        aria-label={t("actionsLabel")}
        data-testid="actions-bar"
      >
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <AtlasButton
            variant="ghost"
            size="md"
            onClick={() => router.push(`/expedition/${tripId}/phase-6`)}
            data-testid="back-to-last-phase"
          >
            {t("actionsBackToPhase")}
          </AtlasButton>
          <AtlasButton
            variant="primary"
            size="lg"
            className="w-full md:w-auto"
            onClick={() => router.push("/expeditions")}
            data-testid="back-to-dashboard"
          >
            {t("actionsBack")}
          </AtlasButton>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <AtlasButton
            variant="secondary"
            size="md"
            disabled
            title={t("actionsComingSoon")}
            aria-disabled="true"
            data-testid="export-pdf-btn"
          >
            {t("actionsExportPdf")}
          </AtlasButton>
          <AtlasButton
            variant="secondary"
            size="md"
            disabled
            title={t("actionsComingSoon")}
            aria-disabled="true"
            data-testid="share-btn"
          >
            {t("actionsShare")}
          </AtlasButton>
        </div>
      </nav>

      {/* Spacer for sticky bottom bar on mobile */}
      <div className="h-20 md:hidden" aria-hidden="true" />
    </div>
  );
}


// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  const fillColor = percent >= 80 ? "bg-atlas-success" : "bg-atlas-secondary-container";

  return (
    <div
      className="h-1.5 w-full rounded-full bg-atlas-surface-container-high overflow-hidden"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full ${fillColor} transition-all duration-500 motion-reduce:transition-none`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

// ─── Phase Content Renderer ──────────────────────────────────────────────────

function PhaseContent({
  phaseNum,
  summary,
  formatDate,
  t,
  tPrefValue,
  tripId,
}: {
  phaseNum: number;
  summary: ExpeditionSummaryData;
  formatDate: (d: string | null) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
  tPrefValue: (key: string) => string;
  tripId: string;
}) {
  const rowClasses = "text-sm font-atlas-body text-atlas-on-surface-variant";

  switch (phaseNum) {
    case 1: {
      const p = summary.phase1;
      if (!p) return null;
      const dur = calculateDuration(p.startDate, p.endDate);
      const passengers = summary.phase2?.passengers ?? null;
      return (
        <div className="space-y-1" data-testid="phase-content-1">
          <p className={rowClasses}>
            <span className="font-semibold">{t("phase1Origin")}:</span>{" "}
            {p.origin ?? "-"}
          </p>
          <p className={rowClasses}>
            <span className="font-semibold">{t("phase1Destination")}:</span>{" "}
            <span className="font-bold text-atlas-on-surface">{p.destination}</span>
          </p>
          <p className={rowClasses}>
            <span className="font-semibold">{t("phase1Dates")}:</span>{" "}
            {formatDate(p.startDate)} - {formatDate(p.endDate)}
            {dur !== null && <>{" ("}{t("phase1Duration", { count: dur })}{")"}</>}
          </p>
          {p.tripType && (
            <p className={rowClasses}>
              <span className="font-semibold">{t("phase1TripType")}:</span>{" "}
              {t(TRIP_TYPE_KEYS[p.tripType] ?? "tripTypeDomestic")}
            </p>
          )}
          {passengers && (
            <p className={rowClasses}>
              <span className="font-semibold">{t("phase1TravelerBreakdown")}:</span>{" "}
              {formatPassengersCompact(passengers, t)}
            </p>
          )}
          {p.flexibleDates && (
            <p className={rowClasses}>
              <span className="font-semibold">{t("phase1FlexibleDates")}:</span>{" "}
              {t("phase1Yes")}
            </p>
          )}
        </div>
      );
    }

    case 2: {
      const p = summary.phase2;
      if (!p) return null;
      return (
        <Phase2Content phase2={p} t={t} tPrefValue={tPrefValue} formatDate={formatDate} />
      );
    }

    case 3: {
      const p = summary.phase3;
      if (!p) return null;
      const pendingRequired = p.items.filter((i) => i.required && !i.completed);
      const pendingRecommended = p.items.filter((i) => !i.required && !i.completed);
      const showPending = pendingRequired.length > 0 || pendingRecommended.length > 0;

      return (
        <div className="space-y-2" data-testid="phase-content-3">
          <p className={rowClasses}>
            {t("phase3Progress", { done: p.done, total: p.total })}
          </p>
          <MiniProgressBar
            value={p.done}
            max={p.total}
            label={t("phase3Progress", { done: p.done, total: p.total })}
          />
          {showPending ? (
            <div className="mt-2 rounded-lg border-l-4 border-atlas-warning bg-atlas-warning-container p-3" role="alert">
              <p className="text-xs font-semibold font-atlas-body text-atlas-on-surface flex items-center gap-1.5">
                <span aria-hidden="true">⚠️</span>
                {t("phase3Pending")}
              </p>
              <ul className="mt-1 space-y-0.5">
                {pendingRequired.slice(0, MAX_PENDING_DISPLAY).map((item) => (
                  <li key={item.itemKey} className="text-xs font-atlas-body text-atlas-on-error-container flex items-center gap-1">
                    <span aria-hidden="true">!</span>
                    <span>{CHECKLIST_ITEM_KEYS[item.itemKey] ? t(CHECKLIST_ITEM_KEYS[item.itemKey]) : item.itemKey}</span>
                  </li>
                ))}
                {pendingRecommended.slice(0, Math.max(0, MAX_PENDING_DISPLAY - pendingRequired.length)).map((item) => (
                  <li key={item.itemKey} className="text-xs font-atlas-body text-atlas-on-surface-variant flex items-center gap-1">
                    <span aria-hidden="true">&middot;</span>
                    <span>{CHECKLIST_ITEM_KEYS[item.itemKey] ? t(CHECKLIST_ITEM_KEYS[item.itemKey]) : item.itemKey}</span>
                  </li>
                ))}
              </ul>
              {(pendingRequired.length + pendingRecommended.length) > MAX_PENDING_DISPLAY && (
                <Link href={`/expedition/${tripId}/phase-3`} className="text-xs font-atlas-body text-atlas-secondary-container font-semibold mt-1 inline-block">
                  {t("phase3More", { count: (pendingRequired.length + pendingRecommended.length) - MAX_PENDING_DISPLAY })}
                </Link>
              )}
            </div>
          ) : p.done === p.total && p.total > 0 ? (
            <p className="text-xs font-atlas-body text-[#059669] flex items-center gap-1">
              <CheckIcon className="size-3" />
              {t("phase3AllDone")}
            </p>
          ) : null}
        </div>
      );
    }

    case 4: {
      const p = summary.phase4;
      if (!p) return null;
      const hasTransport = p.transportSegments.length > 0;
      const hasAccommodation = p.accommodations.length > 0;
      const hasMobility = p.mobility.length > 0;

      return (
        <div className="space-y-3" data-testid="phase-content-4">
          {/* Transport segments */}
          <div>
            <p className={`${rowClasses} font-semibold`}>
              {t("phase4Transport", { count: p.transportSegments.length })}
            </p>
            {hasTransport ? (
              <ul className="mt-1 space-y-1">
                {p.transportSegments.slice(0, MAX_TRANSPORT_DISPLAY).map((seg, idx) => (
                  <li key={idx} className="text-xs font-atlas-body text-atlas-on-surface-variant">
                    <span aria-hidden="true">{TRANSPORT_EMOJIS[seg.type] ?? TRANSPORT_EMOJIS.other}</span>
                    {" "}
                    {t(TRANSPORT_TYPE_KEYS[seg.type] ?? "phase4TransportOther")}
                    {": "}
                    {seg.departurePlace ?? "\u2014"} {"\u2192"} {seg.arrivalPlace ?? "\u2014"}
                    {seg.departureAt && <>{" \u00B7 "}{formatDate(seg.departureAt)}</>}
                    {seg.provider && <>{" \u00B7 "}{seg.provider}</>}
                    {seg.maskedBookingCode && (
                      <span className="ml-2 font-atlas-body text-atlas-on-surface-variant">
                        {t("phase4BookingCode", { code: seg.maskedBookingCode })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs font-atlas-body text-atlas-on-surface-variant italic">{t("phase4Undecided")}</p>
            )}
          </div>

          {/* Accommodations */}
          <div>
            <p className={`${rowClasses} font-semibold`}>
              {t("phase4Accommodation", { count: p.accommodations.length })}
            </p>
            {hasAccommodation ? (
              <ul className="mt-1 space-y-1">
                {p.accommodations.slice(0, MAX_ACCOMMODATION_DISPLAY).map((acc, idx) => (
                  <li key={idx} className="text-xs font-atlas-body text-atlas-on-surface-variant">
                    {t(ACCOMMODATION_TYPE_KEYS[acc.type] ?? "phase4AccomOther")}
                    {acc.name && <>: {acc.name}</>}
                    {(acc.checkIn || acc.checkOut) && (
                      <>{" \u00B7 "}{formatDate(acc.checkIn)} - {formatDate(acc.checkOut)}</>
                    )}
                    {acc.maskedBookingCode && (
                      <span className="ml-2 font-atlas-body text-atlas-on-surface-variant">
                        {t("phase4BookingCode", { code: acc.maskedBookingCode })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs font-atlas-body text-atlas-on-surface-variant italic">{t("phase4Undecided")}</p>
            )}
          </div>

          {/* Mobility */}
          {hasMobility ? (
            <div>
              <p className={`${rowClasses} font-semibold mb-1`}>
                {t("phase4Mobility")}
              </p>
              <div className="flex flex-wrap gap-1">
                {p.mobility.map((m) => (
                  <AtlasChip key={m} mode="selectable" disabled size="sm">
                    {t(MOBILITY_TYPE_KEYS[m] ?? "phase4MobilityOther")}
                  </AtlasChip>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className={`${rowClasses} font-semibold`}>{t("phase4Mobility")}</p>
              <p className="text-xs font-atlas-body text-atlas-on-surface-variant italic">{t("phase4Undecided")}</p>
            </div>
          )}

          {/* Car rental info from phase metadata */}
          {p.mobility.includes("car_rental") && (
            <p className={rowClasses}>
              <span className="font-semibold">{t("phase4CarRental")}:</span>{" "}
              {t("phase4CarRentalYes")}
            </p>
          )}

          {/* Undecided steps alert */}
          {/* Undecided steps alert — uses centralized pending visual */}
          {(p.transportUndecided || p.accommodationUndecided || p.mobilityUndecided) && (() => {
            const pendingVisual = getPhaseStatusVisual("pending");
            return (
              <div className={`mt-2 rounded-lg border p-3 ${pendingVisual.alertBg} ${pendingVisual.alertBorder}`} role="alert">
                <p className={`text-xs font-semibold font-atlas-body ${pendingVisual.alertText} flex items-center gap-1.5`}>
                  <span aria-hidden="true">⚠️</span>
                  {t("phase4PendingDecisions")}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {p.transportUndecided && (
                    <li className={`text-xs font-atlas-body ${pendingVisual.alertText} flex items-center gap-1`}>
                      <span aria-hidden="true">&bull;</span>
                      <span>{t("phase4TransportUndecided")}</span>
                    </li>
                  )}
                  {p.accommodationUndecided && (
                    <li className={`text-xs font-atlas-body ${pendingVisual.alertText} flex items-center gap-1`}>
                      <span aria-hidden="true">&bull;</span>
                      <span>{t("phase4AccommodationUndecided")}</span>
                    </li>
                  )}
                  {p.mobilityUndecided && (
                    <li className={`text-xs font-atlas-body ${pendingVisual.alertText} flex items-center gap-1`}>
                      <span aria-hidden="true">&bull;</span>
                      <span>{t("phase4MobilityUndecided")}</span>
                    </li>
                  )}
                </ul>
              </div>
            );
          })()}
        </div>
      );
    }

    case 5: {
      const p = summary.phase5;
      if (!p) return null;

      const SAFETY_BADGE_COLORS: Record<string, "success" | "warning" | "info"> = {
        safe: "success",
        moderate: "warning",
        caution: "warning",
      };
      const SAFETY_LABEL_KEYS: Record<string, string> = {
        safe: "phase5SafeSafe",
        moderate: "phase5SafeModerate",
        caution: "phase5SafeCaution",
      };

      return (
        <div className="space-y-2" data-testid="phase-content-5">
          <div className="flex items-center gap-2">
            <p className={rowClasses}>
              {t("phase5GeneratedAt", { date: formatDate(p.generatedAt) })}
            </p>
            <AtlasBadge variant="ai-tip">AI</AtlasBadge>
          </div>

          {/* Safety level badge */}
          {p.safetyLevel && (
            <div className="flex items-center gap-2" data-testid="phase5-safety">
              <span className={`${rowClasses} font-semibold`}>{t("phase5SafetyLevel")}:</span>
              <AtlasBadge
                variant="status"
                color={SAFETY_BADGE_COLORS[p.safetyLevel] ?? "info"}
                size="sm"
              >
                {t(SAFETY_LABEL_KEYS[p.safetyLevel] ?? "phase5SafeModerate")}
              </AtlasBadge>
            </div>
          )}

          {/* Key facts (one-line summary) */}
          {p.keyFacts.length > 0 && (
            <div data-testid="phase5-keyfacts">
              <p className="text-xs font-semibold font-atlas-body text-atlas-on-surface-variant">
                {t("phase5KeyFacts")}
              </p>
              <p className="text-xs font-atlas-body text-atlas-on-surface-variant mt-0.5">
                {p.keyFacts.map((f) => `${f.label}: ${f.value}`).join(" | ")}
              </p>
            </div>
          )}

          {/* Top attractions */}
          {p.topAttractions.length > 0 ? (
            <div data-testid="phase5-attractions">
              <p className="text-xs font-semibold font-atlas-body text-atlas-on-surface-variant">
                {t("phase5Attractions")} ({t("phase5AttractionsCount", { count: p.topAttractions.length })})
              </p>
              <ul className="mt-1 space-y-0.5">
                {p.topAttractions.map((a, idx) => (
                  <li key={idx} className="text-xs font-atlas-body text-atlas-on-surface-variant flex items-center gap-1">
                    <span aria-hidden="true">&middot;</span>
                    <span className="font-semibold">{a.name}</span>
                    {a.description && <span className="text-atlas-outline-variant">— {a.description}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ) : p.highlights.length > 0 ? (
            <div>
              <p className="text-xs font-semibold font-atlas-body text-atlas-on-surface-variant">
                {t("phase5Highlights")}
              </p>
              <ul className="mt-1 space-y-0.5">
                {p.highlights.map((h, idx) => (
                  <li key={idx} className="text-xs font-atlas-body text-atlas-on-surface-variant flex items-center gap-1">
                    <span aria-hidden="true">&middot;</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      );
    }

    case 6: {
      const p = summary.phase6;
      if (!p) return null;
      return (
        <div className="space-y-2" data-testid="phase-content-6">
          <p className={rowClasses}>
            {t("phase6Days", { count: p.dayCount })}
            {" \u00B7 "}
            {t("phase6Activities", { count: p.totalActivities })}
          </p>
          {/* Day-by-day summary with activity names */}
          {p.days && p.days.length > 0 && (
            <div className="mt-2 space-y-2">
              {p.days.map((day) => (
                <div
                  key={day.dayNumber}
                  className="text-xs font-atlas-body text-atlas-on-surface-variant"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center size-5 rounded-full bg-atlas-secondary-container/20 text-atlas-secondary text-[10px] font-bold shrink-0">
                      {day.dayNumber}
                    </span>
                    <span className="font-semibold">
                      {day.title || t("phase6DayDefault", { num: day.dayNumber })}
                    </span>
                    <span className="text-atlas-outline-variant">&middot;</span>
                    <span className="shrink-0">{t("phase6DayActivities", { count: day.activitiesCount })}</span>
                  </div>
                  {day.activityNames && day.activityNames.length > 0 && (
                    <ul className="ml-7 mt-0.5 space-y-0">
                      {day.activityNames.map((name, idx) => (
                        <li key={idx} className="text-atlas-on-surface-variant flex items-center gap-1">
                          <span aria-hidden="true" className="text-[8px]">•</span>
                          <span>{name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── Phase 2 Content (P0 #2: show ALL preferences) ──────────────────────────

function Phase2Content({
  phase2,
  t,
  tPrefValue,
  formatDate: _formatDate,
}: {
  phase2: NonNullable<ExpeditionSummaryData["phase2"]>;
  t: (key: string, values?: Record<string, string | number>) => string;
  tPrefValue: (key: string) => string;
  formatDate: (d: string | null) => string;
}) {
  const rowClasses = "text-sm font-atlas-body text-atlas-on-surface-variant";
  const prefs = phase2.preferences as UserPreferences | null;

  // Collect activity/interest chips from preferences
  const interestChips = prefs?.interests ?? [];
  const foodChips = (prefs?.foodPreferences ?? []).filter((f) => f !== "no_restrictions");
  const accommodationPrefChips = prefs?.accommodationStyle ?? [];
  const socialChips = prefs?.socialPreference ?? [];

  // Translate a pref value key
  function translatePref(key: string): string {
    try { return tPrefValue(key); } catch { return key; }
  }

  return (
    <div className="space-y-2" data-testid="phase-content-2">
      {/* Traveler type + accommodation style chips */}
      <div className="flex flex-wrap gap-2">
        {phase2.travelerType && (
          <AtlasChip mode="selectable" selected disabled size="sm">
            {translatePref(phase2.travelerType)}
          </AtlasChip>
        )}
        {phase2.accommodationStyle && (
          <AtlasChip mode="selectable" selected disabled size="sm">
            {translatePref(phase2.accommodationStyle)}
          </AtlasChip>
        )}
      </div>

      {/* Activity/interest preferences as chips */}
      {interestChips.length > 0 && (
        <div data-testid="phase2-interests">
          <p className="text-xs font-semibold font-atlas-body text-atlas-on-surface-variant mb-1">
            {t("phase2Interests")}
          </p>
          <div className="flex flex-wrap gap-1">
            {interestChips.map((interest) => (
              <AtlasChip key={interest} mode="selectable" disabled size="sm">
                {translatePref(interest)}
              </AtlasChip>
            ))}
          </div>
        </div>
      )}

      {/* Dietary restrictions */}
      {foodChips.length > 0 && (
        <div data-testid="phase2-dietary">
          <p className="text-xs font-semibold font-atlas-body text-atlas-on-surface-variant mb-1">
            {t("phase2Dietary")}
          </p>
          <div className="flex flex-wrap gap-1">
            {foodChips.map((food) => (
              <AtlasChip key={food} mode="selectable" disabled size="sm">
                {translatePref(food)}
              </AtlasChip>
            ))}
          </div>
        </div>
      )}

      {/* Accommodation preferences */}
      {accommodationPrefChips.length > 0 && (
        <div data-testid="phase2-accommodation-pref">
          <p className="text-xs font-semibold font-atlas-body text-atlas-on-surface-variant mb-1">
            {t("phase2AccommodationPrefLabel")}
          </p>
          <div className="flex flex-wrap gap-1">
            {accommodationPrefChips.map((acc) => (
              <AtlasChip key={acc} mode="selectable" disabled size="sm">
                {translatePref(acc)}
              </AtlasChip>
            ))}
          </div>
        </div>
      )}

      {/* Social preference / hobbies */}
      {socialChips.length > 0 && (
        <div data-testid="phase2-social">
          <p className="text-xs font-semibold font-atlas-body text-atlas-on-surface-variant mb-1">
            {t("phase2HobbiesLabel")}
          </p>
          <div className="flex flex-wrap gap-1">
            {socialChips.map((s) => (
              <AtlasChip key={s} mode="selectable" disabled size="sm">
                {translatePref(s)}
              </AtlasChip>
            ))}
          </div>
        </div>
      )}

      {/* Pace (translated label) + budget line */}
      <p className={rowClasses}>
        {phase2.travelPace !== null && (
          <><span className="font-semibold">{t("phase2TravelPace")}:</span>{" "}
          {t(PACE_LABELS[String(phase2.travelPace)] ?? "phase2PaceModerate")}</>
        )}
        {phase2.budget !== null && (
          <>{phase2.travelPace !== null ? " · " : ""}<span className="font-semibold">{t("phase2Budget")}:</span>{" "}{formatBudget(phase2.budget, phase2.currency, phase2.budgetRange, translatePref)}</>
        )}
      </p>

      {/* Passengers */}
      {phase2.passengers && (
        <p className={rowClasses}>
          <span className="font-semibold">{t("phase2Passengers")}:</span>{" "}
          {formatPassengersCompact(phase2.passengers, t)}
        </p>
      )}

      {/* Fitness level (translated) */}
      {prefs?.fitnessLevel && (
        <p className={rowClasses} data-testid="phase2-fitness">
          <span className="font-semibold">{t("phase2FitnessLabel")}:</span>{" "}
          {t(FITNESS_KEYS[prefs.fitnessLevel] ?? "phase2FitnessModerate")}
        </p>
      )}
    </div>
  );
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

function formatPassengersCompact(
  passengers: { adults: number; children: number; infants: number; seniors: number } | null,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (!passengers) return "";
  const parts: string[] = [];
  if (passengers.adults > 0) parts.push(t("phase2Adults", { count: passengers.adults }));
  if (passengers.children > 0) parts.push(t("phase2Children", { count: passengers.children }));
  if (passengers.seniors > 0) parts.push(t("phase2Seniors", { count: passengers.seniors }));
  if (passengers.infants > 0) parts.push(t("phase2Infants", { count: passengers.infants }));
  return parts.join(", ");
}

function formatBudget(
  budget: number | null,
  currency: string | null,
  budgetRange: string | null,
  translatePref?: (key: string) => string,
): string {
  if (budget !== null && currency) {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(budget);
    } catch {
      return `${currency} ${budget}`;
    }
  }
  if (budgetRange) return translatePref ? translatePref(budgetRange) : budgetRange;
  return "-";
}
