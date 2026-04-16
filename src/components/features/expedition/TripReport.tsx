"use client";

import { useTranslations } from "next-intl";
import { isPhaseReorderEnabled } from "@/lib/flags/phase-reorder";
import type { TripReportDTO } from "@/server/services/report-generation.service";
import type {
  ReportPhase3,
  ReportPhase5,
  ReportPhase6,
} from "@/server/services/report-generation.service";
import type {
  ExpeditionSummaryPhase4,
} from "@/server/services/expedition-summary.service";

interface TripReportProps {
  data: TripReportDTO;
}

export function TripReport({ data }: TripReportProps) {
  const t = useTranslations("report");
  const tEnums = useTranslations("report.enums");
  const reordered = isPhaseReorderEnabled();

  // Build section render order based on flag
  // Flag OFF: 1-Inspiration, 2-Profile, 3-Checklist, 4-Logistics, 5-Guide, 6-Itinerary
  // Flag ON:  1-Inspiration, 2-Profile, 3-Guide, 4-Itinerary, 5-Logistics, 6-Checklist
  const contentSections = reordered
    ? buildReorderedSections(data, t, tEnums)
    : buildOriginalSections(data, t, tEnums);

  return (
    <article className="space-y-6" data-testid="trip-report">
      {/* Report header */}
      <header>
        <h1 className="text-2xl font-bold text-foreground" data-testid="report-title">
          {data.tripTitle || t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground" data-testid="report-generated-at">
          {t("generatedAt", { date: data.generatedAt.split("T")[0] })}
        </p>
      </header>

      {contentSections}
    </article>
  );
}

// ─── Section builders ───────────────────────────────────────────────────────

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function buildOriginalSections(
  data: TripReportDTO,
  t: TranslateFn,
  tEnums: TranslateFn,
): React.ReactNode {
  return (
    <>
      <Phase1Section data={data} t={t} tEnums={tEnums} />
      <Phase2Section data={data} t={t} tEnums={tEnums} />
      <ChecklistSection data={data.phase3} title={t("phase3Title")} testId="report-phase-3" t={t} />
      <LogisticsSection data={data.phase4} title={t("phase4Title")} testId="report-phase-4" t={t} />
      <GuideSection data={data.phase5} title={t("phase5Title")} testId="report-phase-5" />
      <ItinerarySection data={data.phase6} title={t("phase6Title")} testId="report-phase-6" t={t} />
    </>
  );
}

function buildReorderedSections(
  data: TripReportDTO,
  t: TranslateFn,
  tEnums: TranslateFn,
): React.ReactNode {
  return (
    <>
      <Phase1Section data={data} t={t} tEnums={tEnums} />
      <Phase2Section data={data} t={t} tEnums={tEnums} />
      <GuideSection data={data.phase5} title={t("phase5Title")} testId="report-phase-guide" />
      <ItinerarySection data={data.phase6} title={t("phase6Title")} testId="report-phase-itinerary" t={t} />
      <LogisticsSection data={data.phase4} title={t("phase4Title")} testId="report-phase-logistics" t={t} />
      <ChecklistSection data={data.phase3} title={t("phase3Title")} testId="report-phase-checklist" t={t} />
    </>
  );
}

// ─── Phase 1 — Inspiration ─────────────────────────────────────────────────

function Phase1Section({
  data,
  t,
  tEnums,
}: {
  data: TripReportDTO;
  t: TranslateFn;
  tEnums: TranslateFn;
}) {
  if (!data.phase1) return null;
  return (
    <ReportSection title={t("phase1Title")} testId="report-phase-1">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("destination")}</dt>
        <dd className="font-medium">{data.phase1.destination}</dd>
        {data.phase1.origin && (
          <>
            <dt className="text-muted-foreground">{t("origin")}</dt>
            <dd className="font-medium">{data.phase1.origin}</dd>
          </>
        )}
        {data.phase1.startDate && (
          <>
            <dt className="text-muted-foreground">{t("dates")}</dt>
            <dd className="font-medium">
              {data.phase1.startDate}
              {data.phase1.endDate && ` \u2013 ${data.phase1.endDate}`}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">{t("tripType")}</dt>
        <dd className="font-medium">{tEnums(`tripType.${data.phase1.tripType}`)}</dd>
      </dl>
    </ReportSection>
  );
}

// ─── Phase 2 — Profile ──────────────────────────────────────────────────────

function Phase2Section({
  data,
  t,
  tEnums,
}: {
  data: TripReportDTO;
  t: TranslateFn;
  tEnums: TranslateFn;
}) {
  if (!data.phase2) return null;
  return (
    <ReportSection title={t("phase2Title")} testId="report-phase-2">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("travelerType")}</dt>
        <dd className="font-medium">{tEnums(`travelerType.${data.phase2.travelerType}`)}</dd>
        {data.phase2.accommodationStyle && (
          <>
            <dt className="text-muted-foreground">{t("accommodationStyle")}</dt>
            <dd className="font-medium">{tEnums(`accommodationStyle.${data.phase2.accommodationStyle}`)}</dd>
          </>
        )}
        {data.phase2.travelPace != null && (
          <>
            <dt className="text-muted-foreground">{t("travelPace")}</dt>
            <dd className="font-medium">{t("paceValue", { value: data.phase2.travelPace })}</dd>
          </>
        )}
        {data.phase2.budget != null && (
          <>
            <dt className="text-muted-foreground">{t("budgetLabel")}</dt>
            <dd className="font-medium">
              {data.phase2.currency ? `${data.phase2.currency} ` : ""}{data.phase2.budget.toLocaleString()}
            </dd>
          </>
        )}
        {data.phase2.passengers && (
          <>
            <dt className="text-muted-foreground">{t("passengerCounts")}</dt>
            <dd className="font-medium">
              {t("passengersDetail", {
                adults: data.phase2.passengers.adults,
                children: data.phase2.passengers.children,
                seniors: data.phase2.passengers.seniors,
                infants: data.phase2.passengers.infants,
              })}
            </dd>
          </>
        )}
      </dl>
    </ReportSection>
  );
}

// ─── Checklist Section ──────────────────────────────────────────────────────

function ChecklistSection({
  data,
  title,
  testId,
  t,
}: {
  data: ReportPhase3 | null;
  title: string;
  testId: string;
  t: TranslateFn;
}) {
  if (!data) return null;
  return (
    <ReportSection title={title} testId={testId}>
      <p className="mb-3 text-sm text-muted-foreground">
        {t("checklistProgress", {
          done: data.completedCount,
          total: data.totalCount,
        })}
      </p>
      {data.completedCount < data.totalCount && (
        <p
          className="mb-3 text-sm font-medium text-amber-600 dark:text-amber-400"
          data-testid="report-pending-required"
        >
          {t("pendingRequiredCount", {
            count: data.totalCount - data.completedCount,
          })}
        </p>
      )}
      <ul className="space-y-1">
        {data.items.map((item) => (
          <li
            key={item.itemKey}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border ${
                item.completed
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-muted-foreground/40"
              }`}
              aria-hidden="true"
            >
              {item.completed && "\u2713"}
            </span>
            <span className={item.completed ? "text-foreground" : "text-muted-foreground"}>
              {item.itemKey}
            </span>
            {item.required && (
              <span className="text-xs text-amber-500">*</span>
            )}
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}

// ─── Logistics Section ──────────────────────────────────────────────────────

function LogisticsSection({
  data,
  title,
  testId,
  t,
}: {
  data: ExpeditionSummaryPhase4 | null;
  title: string;
  testId: string;
  t: TranslateFn;
}) {
  if (!data) return null;
  return (
    <ReportSection title={title} testId={testId}>
      {data.transportSegments.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-foreground">{t("transport")}</h4>
          <ul className="mt-1 space-y-1">
            {data.transportSegments.map((seg, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {seg.type}: {seg.departurePlace} {"\u2192"} {seg.arrivalPlace}
                {seg.maskedBookingCode && (
                  <span className="ml-2 text-xs">({seg.maskedBookingCode})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.accommodations.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-foreground">{t("accommodation")}</h4>
          <ul className="mt-1 space-y-1">
            {data.accommodations.map((acc, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {acc.type}: {acc.name}
                {acc.maskedBookingCode && (
                  <span className="ml-2 text-xs">({acc.maskedBookingCode})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.mobility.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-foreground">{t("mobility")}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{data.mobility.join(", ")}</p>
        </div>
      )}
    </ReportSection>
  );
}

// ─── Guide Section ──────────────────────────────────────────────────────────

function GuideSection({
  data,
  title,
  testId,
}: {
  data: ReportPhase5 | null;
  title: string;
  testId: string;
}) {
  if (!data) return null;
  return (
    <ReportSection title={title} testId={testId}>
      <p className="mb-3 text-xs text-muted-foreground">
        {data.destination} &middot; {data.generatedAt}
      </p>
      <div className="space-y-3">
        {data.sections.map((section) => (
          <div key={section.key} className="rounded-md border border-border/40 p-3">
            <h4 className="text-sm font-medium text-foreground">
              {section.icon && <span aria-hidden="true">{section.icon} </span>}
              {section.title}
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">{section.content}</p>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

// ─── Itinerary Section ──────────────────────────────────────────────────────

function ItinerarySection({
  data,
  title,
  testId,
  t,
}: {
  data: ReportPhase6 | null;
  title: string;
  testId: string;
  t: TranslateFn;
}) {
  if (!data) return null;
  return (
    <ReportSection title={title} testId={testId}>
      <p className="mb-3 text-sm text-muted-foreground">
        {t("itineraryDays", { count: data.days.length })} &middot;{" "}
        {t("activities", { count: data.totalActivities })}
      </p>
      <div className="space-y-4">
        {data.days.map((day) => (
          <div key={day.dayNumber} className="rounded-md border border-border/40 p-3">
            <h4 className="text-sm font-semibold text-foreground">
              {t("dayLabel", { number: day.dayNumber })}
              {day.date && <span className="ml-2 text-xs font-normal text-muted-foreground">{day.date}</span>}
            </h4>
            {day.notes && (
              <p className="mt-1 text-xs text-muted-foreground">{day.notes}</p>
            )}
            {day.activities.length > 0 && (
              <ul className="mt-2 space-y-1">
                {day.activities.map((activity, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    {activity.startTime && (
                      <span className="mr-1 font-medium text-foreground">{activity.startTime}</span>
                    )}
                    {activity.title}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

// ─── Reusable section card ──────────────────────────────────────────────────

function ReportSection({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-lg border border-border bg-card p-6"
      data-testid={testId}
    >
      <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
