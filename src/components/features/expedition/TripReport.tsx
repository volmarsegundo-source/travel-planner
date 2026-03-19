"use client";

import { useTranslations } from "next-intl";
import type { TripReportDTO } from "@/server/services/report-generation.service";

interface TripReportProps {
  data: TripReportDTO;
}

export function TripReport({ data }: TripReportProps) {
  const t = useTranslations("report");
  const tEnums = useTranslations("report.enums");

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

      {/* Phase 1 — O Chamado */}
      {data.phase1 && (
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
            <dd className="font-medium">{tEnums(`tripType.${data.phase1.tripType}` as Parameters<typeof tEnums>[0])}</dd>
          </dl>
        </ReportSection>
      )}

      {/* Phase 2 — O Explorador */}
      {data.phase2 && (
        <ReportSection title={t("phase2Title")} testId="report-phase-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("travelerType")}</dt>
            <dd className="font-medium">{tEnums(`travelerType.${data.phase2.travelerType}` as Parameters<typeof tEnums>[0])}</dd>
            {data.phase2.accommodationStyle && (
              <>
                <dt className="text-muted-foreground">{t("accommodationStyle")}</dt>
                <dd className="font-medium">{tEnums(`accommodationStyle.${data.phase2.accommodationStyle}` as Parameters<typeof tEnums>[0])}</dd>
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
      )}

      {/* Phase 3 — O Preparo */}
      {data.phase3 && (
        <ReportSection title={t("phase3Title")} testId="report-phase-3">
          <p className="mb-3 text-sm text-muted-foreground">
            {t("checklistProgress", {
              done: data.phase3.completedCount,
              total: data.phase3.totalCount,
            })}
          </p>
          {data.phase3.completedCount < data.phase3.totalCount && (
            <p
              className="mb-3 text-sm font-medium text-amber-600 dark:text-amber-400"
              data-testid="report-pending-required"
            >
              {t("pendingRequiredCount", {
                count: data.phase3.totalCount - data.phase3.completedCount,
              })}
            </p>
          )}
          <ul className="space-y-1">
            {data.phase3.items.map((item) => (
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
      )}

      {/* Phase 4 — A Logistica */}
      {data.phase4 && (
        <ReportSection title={t("phase4Title")} testId="report-phase-4">
          {data.phase4.transportSegments.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-foreground">{t("transport")}</h4>
              <ul className="mt-1 space-y-1">
                {data.phase4.transportSegments.map((seg, i) => (
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
          {data.phase4.accommodations.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-foreground">{t("accommodation")}</h4>
              <ul className="mt-1 space-y-1">
                {data.phase4.accommodations.map((acc, i) => (
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
          {data.phase4.mobility.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground">{t("mobility")}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{data.phase4.mobility.join(", ")}</p>
            </div>
          )}
        </ReportSection>
      )}

      {/* Phase 5 — Guia do Destino */}
      {data.phase5 && (
        <ReportSection title={t("phase5Title")} testId="report-phase-5">
          <p className="mb-3 text-xs text-muted-foreground">
            {data.phase5.destination} &middot; {data.phase5.generatedAt}
          </p>
          <div className="space-y-3">
            {data.phase5.sections.map((section) => (
              <div key={section.key} className="rounded-md border border-border/40 p-3">
                <h4 className="text-sm font-medium text-foreground">
                  <span aria-hidden="true">{section.icon}</span> {section.title}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">{section.content}</p>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {/* Phase 6 — O Roteiro */}
      {data.phase6 && (
        <ReportSection title={t("phase6Title")} testId="report-phase-6">
          <p className="mb-3 text-sm text-muted-foreground">
            {t("itineraryDays", { count: data.phase6.days.length })} &middot;{" "}
            {t("activities", { count: data.phase6.totalActivities })}
          </p>
          <div className="space-y-4">
            {data.phase6.days.map((day) => (
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
      )}
    </article>
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
