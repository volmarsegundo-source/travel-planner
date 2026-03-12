"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface WizardFooterProps {
  onBack?: () => void;
  onPrimary: () => void;
  primaryLabel: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  secondaryActions?: Array<{ label: string; onClick: () => void }>;
}

export function WizardFooter({
  onBack,
  onPrimary,
  primaryLabel,
  isLoading = false,
  isDisabled = false,
  secondaryActions,
}: WizardFooterProps) {
  const t = useTranslations("common");

  return (
    <div
      className="sticky bottom-0 flex items-center justify-between border-t border-border bg-background py-4"
      data-testid="wizard-footer"
    >
      <div>
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            data-testid="wizard-back"
          >
            {t("back")}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {secondaryActions?.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="ghost"
            onClick={action.onClick}
            disabled={isLoading}
          >
            {action.label}
          </Button>
        ))}

        <Button
          type="button"
          onClick={onPrimary}
          disabled={isDisabled || isLoading}
          className="bg-atlas-teal text-white hover:bg-atlas-teal/90"
          data-testid="wizard-primary"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin motion-reduce:animate-none"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {t("saving")}
            </span>
          ) : (
            primaryLabel
          )}
        </Button>
      </div>
    </div>
  );
}
