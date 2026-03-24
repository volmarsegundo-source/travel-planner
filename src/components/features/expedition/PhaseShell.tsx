"use client";

import { useTranslations } from "next-intl";
import { DesignBranch } from "@/components/ui";
import { UnifiedProgressBar } from "./UnifiedProgressBar";
import { StepProgressIndicator } from "./StepProgressIndicator";
import { WizardFooter } from "./WizardFooter";
import { PhaseShellV2 } from "./PhaseShellV2";

interface PhaseShellProps {
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
    /** Save handler — enables the save/discard dialog in WizardFooter */
    onSave?: () => void | Promise<void>;
    /** Whether the form has unsaved changes */
    isDirty?: boolean;
    /** Whether the last save succeeded */
    saveSuccess?: boolean;
  };
  /** Phase content */
  children: React.ReactNode;
}

/**
 * V1 implementation — consistent wrapper for all expedition phase pages (1-6).
 * Extracted from original PhaseShell to support DesignBranch V1/V2 switching.
 *
 * Layout (top to bottom):
 * 1. UnifiedProgressBar (always)
 * 2. StepProgressIndicator (conditional, for multi-step phases)
 * 3. Phase header (h1 title + subtitle, centered)
 * 4. Edit mode banner (conditional)
 * 5. Content slot (children)
 * 6. WizardFooter (except Phase 6)
 *
 * Spec ref: SPEC-UX-019 Section 4.2
 */
function PhaseShellV1({
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
}: PhaseShellProps) {
  const t = useTranslations("expedition");

  const widthClass = contentMaxWidth === "4xl" ? "max-w-4xl" : "max-w-2xl";
  const showStepIndicator = currentStep !== undefined && totalSteps !== undefined && totalSteps > 1;

  return (
    <div className="flex min-h-[60vh] flex-col" data-testid="phase-shell">
      {/* 1. Unified Progress Bar */}
      <UnifiedProgressBar
        tripId={tripId}
        viewingPhase={viewingPhase}
        tripCurrentPhase={tripCurrentPhase}
        completedPhases={completedPhases}
      />

      {/* 2. Step Progress Indicator (multi-step phases only) */}
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
        {/* 3. Phase header */}
        <div className="mt-6 text-center">
          <h1 className="text-2xl font-bold text-foreground" data-testid="phase-label">
            {phaseTitle}
          </h1>
          {phaseSubtitle && (
            <p className="mt-1 text-muted-foreground">
              {phaseSubtitle}
            </p>
          )}
        </div>

        {/* 4. Edit mode banner */}
        {isEditMode && (
          <div
            className="mt-4 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950/30"
            role="status"
            aria-live="polite"
            data-testid="edit-mode-banner"
          >
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t("editBanner", { phase: viewingPhase, fallback: `Voce esta revisitando a Fase ${viewingPhase}. Suas alteracoes serao salvas quando voce confirmar.` })}
            </p>
          </div>
        )}

        {/* 5. Content slot */}
        <div className="mt-6 pb-24">
          {children}
        </div>
      </div>

      {/* 6. WizardFooter */}
      {showFooter && footerProps && (
        <WizardFooter {...footerProps} />
      )}
    </div>
  );
}

/**
 * PhaseShell — public API used by all phase wizards.
 * Delegates to V1 or V2 based on the NEXT_PUBLIC_DESIGN_V2 feature flag.
 */
export function PhaseShell(props: PhaseShellProps) {
  return (
    <DesignBranch
      v1={<PhaseShellV1 {...props} />}
      v2={<PhaseShellV2 {...props} />}
    />
  );
}
