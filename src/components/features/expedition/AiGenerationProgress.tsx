"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AtlasButton } from "@/components/ui/AtlasButton";

export type AiGenerationType = "guide" | "plan" | "checklist";

export interface AiGenerationProgressProps {
  type: AiGenerationType;
  progressMessage?: string;
  progressPercent?: number;
  extraDetail?: ReactNode;
  onCancel?: () => void;
  estimatedSeconds?: number;
}

const ROTATION_KEYS = ["analyzing", "building", "finalizing"] as const;
const ROTATION_MS = 5000;
const DEFAULT_ESTIMATE_SECONDS = 30;

function XIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function AiGenerationProgress({
  type,
  progressMessage,
  progressPercent,
  extraDetail,
  onCancel,
  estimatedSeconds = DEFAULT_ESTIMATE_SECONDS,
}: AiGenerationProgressProps) {
  const t = useTranslations("expedition.aiProgress");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % ROTATION_KEYS.length),
      ROTATION_MS,
    );
    return () => clearInterval(id);
  }, []);

  const rotatingKey = `${type}.messages.${ROTATION_KEYS[index]}`;
  const titleKey = `${type}.title`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t(titleKey)}
      data-testid="ai-generation-progress"
      data-generation-type={type}
      className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-5 py-10 text-center"
    >
      <div
        className="h-16 w-16 animate-spin motion-reduce:animate-none rounded-full border-4 border-atlas-secondary-container/30 border-t-atlas-secondary-container"
        aria-hidden="true"
      />

      <div className="space-y-1">
        <p className="text-lg font-atlas-headline font-bold text-atlas-on-surface">
          {t(titleKey)}
        </p>
        <p
          className="text-sm font-atlas-body text-atlas-on-surface-variant"
          data-testid="ai-generation-rotating"
        >
          {t(rotatingKey)}
        </p>
      </div>

      {progressMessage && (
        <p
          className="text-sm font-atlas-body text-atlas-on-surface-variant"
          data-testid="ai-generation-message"
        >
          {progressMessage}
        </p>
      )}

      {typeof progressPercent === "number" && (
        <div className="w-full">
          <div className="h-2 w-full overflow-hidden rounded-full bg-atlas-surface-container-high">
            <div
              className="h-full rounded-full bg-atlas-secondary-container transition-all duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${Math.max(progressPercent, 5)}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              data-testid="ai-generation-progressbar"
            />
          </div>
          {extraDetail && (
            <div
              className="mt-2 text-xs font-atlas-body text-atlas-on-surface-variant"
              data-testid="ai-generation-extra"
            >
              {extraDetail}
            </div>
          )}
        </div>
      )}

      <p className="text-xs font-atlas-body text-atlas-on-surface-variant">
        {t("estimate", { seconds: estimatedSeconds })}
      </p>

      {onCancel && (
        <AtlasButton
          variant="secondary"
          onClick={onCancel}
          leftIcon={<XIcon />}
          data-testid="ai-generation-cancel"
        >
          {t("cancel")}
        </AtlasButton>
      )}
    </div>
  );
}
