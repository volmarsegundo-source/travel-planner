"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AtlasPhaseProgress } from "@/components/ui";
import { StepProgressIndicator } from "./StepProgressIndicator";
import { WizardFooter } from "./WizardFooter";
import {
  getPhaseState,
  getPhaseUrl,
  TOTAL_ACTIVE_PHASES,
} from "@/lib/engines/phase-navigation.engine";
import { PHASE_DEFINITIONS } from "@/lib/engines/phase-config";
import type { PhaseSegment, SegmentState } from "@/components/ui";

interface PhaseShellV2Props {
  /** Trip ID for navigation URLs */
  tripId: string;
  /** Which phase this shell is rendering */
  viewingPhase: number;
  /** The trip's actual current phase from DB */
  tripCurrentPhase: number;
  /** Array of completed phase numbers from DB */
  completedPhases: number[];
  /** Phase title (h1) */
  phaseTitle: string;
  /** Phase subtitle (p below h1) */
  phaseSubtitle?: string;
  /** Current step within phase (for multi-step phases) */
  currentStep?: number;
  /** Total steps within phase (for multi-step phases) */
  totalSteps?: number;
  /** Whether user is revisiting a completed phase */
  isEditMode?: boolean;
  /** Whether to show WizardFooter (Phase 6 sets false) */
  showFooter?: boolean;
  /** Content width: "2xl" for most phases, "4xl" for Phase 6 */
  contentMaxWidth?: "2xl" | "4xl";
  /** Footer props when showFooter is true */
  footerProps?: {
    onBack?: () => void;
    onPrimary: () => void;
    primaryLabel: string;
    isLoading?: boolean;
    isDisabled?: boolean;
    secondaryActions?: Array<{ label: string; onClick: () => void }>;
    onSave?: () => void | Promise<void>;
    isDirty?: boolean;
    saveSuccess?: boolean;
  };
  /** Phase content */
  children: React.ReactNode;
}

/**
 * V2 phase shell using Atlas Design System tokens.
 *
 * Layout:
 * - Desktop: Left sidebar with AtlasPhaseProgress (wizard mode) + breadcrumb
 * - Mobile: Top horizontal progress + content
 * - Phase header with font-atlas-headline
 * - Content area with proper spacing
 * - WizardFooter preserved (same behavior as V1)
 */
export function PhaseShellV2({
  tripId,
  viewingPhase,
  tripCurrentPhase,
  completedPhases,
  phaseTitle,
  phaseSubtitle,
  currentStep,
  totalSteps,
  isEditMode = false,
  showFooter = true,
  contentMaxWidth = "2xl",
  footerProps,
  children,
}: PhaseShellV2Props) {
  const t = useTranslations("expedition");
  const tShell = useTranslations("phaseShellV2");
  const router = useRouter();

  const widthClass = contentMaxWidth === "4xl" ? "max-w-4xl" : "max-w-2xl";
  const showStepIndicator =
    currentStep !== undefined && totalSteps !== undefined && totalSteps > 1;

  // Build phase segments for AtlasPhaseProgress (all 8 phases, 7-8 always locked)
  const segments: PhaseSegment[] = Array.from(
    { length: PHASE_DEFINITIONS.length },
    (_, i) => {
      const phase = i + 1;
      const phaseDef = PHASE_DEFINITIONS[i];

      // Phases 7-8 are always locked (coming soon)
      if (phase > TOTAL_ACTIVE_PHASES) {
        return {
          phase,
          label: phaseDef?.name ?? `Phase ${phase}`,
          state: "locked" as SegmentState,
        };
      }

      const phaseState = getPhaseState(
        phase,
        tripCurrentPhase,
        completedPhases
      );

      const stateMap: Record<string, SegmentState> = {
        completed: "completed",
        current: "active",
        available: "pending",
        locked: "locked",
        viewing: "active",
      };

      return {
        phase,
        label: phaseDef?.name ?? `Phase ${phase}`,
        state: stateMap[phaseState] ?? "locked",
        href: getPhaseUrl(tripId, phase),
      };
    }
  );

  function handleSegmentClick(phase: number) {
    const url = getPhaseUrl(tripId, phase);
    if (url) {
      router.push(url);
    }
  }

  // Breadcrumb items
  const breadcrumbItems = [
    { label: tShell("breadcrumb.expeditions"), href: "/expeditions" },
    { label: tShell("breadcrumb.currentTrip"), href: `/expedition/${tripId}/summary` },
    { label: phaseTitle },
  ];

  return (
    <div className="flex min-h-[60vh]" data-testid="phase-shell-v2">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-atlas-outline-variant/20 lg:bg-atlas-surface-container-lowest lg:p-6">
        {/* Breadcrumb */}
        <nav aria-label={tShell("breadcrumb.label")} className="mb-6">
          <ol className="flex flex-wrap items-center gap-1 text-xs font-atlas-body text-atlas-on-surface-variant">
            {breadcrumbItems.map((item, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <span className="text-atlas-outline-variant" aria-hidden="true">
                    /
                  </span>
                )}
                {item.href ? (
                  <a
                    href={item.href}
                    className="hover:text-atlas-on-surface transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring rounded"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="font-semibold text-atlas-on-surface">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Phase progress */}
        <AtlasPhaseProgress
          segments={segments}
          layout="wizard"
          onSegmentClick={handleSegmentClick}
          className="flex-col"
        />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile breadcrumb + progress bar */}
        <div className="px-4 pt-4 lg:hidden">
          <nav aria-label={tShell("breadcrumb.label")} className="mb-3">
            <ol className="flex flex-wrap items-center gap-1 text-xs font-atlas-body text-atlas-on-surface-variant">
              {breadcrumbItems.map((item, i) => (
                <li key={i} className="flex items-center gap-1">
                  {i > 0 && (
                    <span className="text-atlas-outline-variant" aria-hidden="true">
                      /
                    </span>
                  )}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-atlas-on-surface transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring rounded"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className="font-semibold text-atlas-on-surface">
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <AtlasPhaseProgress
            segments={segments}
            layout="dashboard"
            onSegmentClick={handleSegmentClick}
          />
        </div>

        {/* Step indicator (multi-step phases) */}
        {showStepIndicator && (
          <div className="mt-2">
            <StepProgressIndicator
              currentStep={currentStep!}
              totalSteps={totalSteps!}
            />
          </div>
        )}

        {/* Content area with max-width */}
        <div className={`mx-auto w-full ${widthClass} px-4 sm:px-6`}>
          {/* Phase header */}
          <div className="mt-6 text-center lg:text-left">
            <h1
              className="font-atlas-headline text-2xl font-bold text-atlas-on-surface"
              data-testid="phase-label"
            >
              {phaseTitle}
            </h1>
            {phaseSubtitle && (
              <p className="mt-1 font-atlas-body text-atlas-on-surface-variant">
                {phaseSubtitle}
              </p>
            )}
          </div>

          {/* Edit mode banner */}
          {isEditMode && (
            <div
              className="mt-4 rounded-lg border-l-4 border-atlas-info bg-atlas-info-container p-4"
              role="status"
              aria-live="polite"
              data-testid="edit-mode-banner"
            >
              <p className="text-sm font-atlas-body text-atlas-info">
                {t("editBanner", {
                  phase: viewingPhase,
                  fallback: `Voce esta revisitando a Fase ${viewingPhase}. Suas alteracoes serao salvas quando voce confirmar.`,
                })}
              </p>
            </div>
          )}

          {/* Content slot */}
          <div className="mt-6 pb-24">{children}</div>
        </div>

        {/* WizardFooter */}
        {showFooter && footerProps && <WizardFooter {...footerProps} />}
      </div>
    </div>
  );
}
