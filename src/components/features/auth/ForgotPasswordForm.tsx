"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasInput } from "@/components/ui/AtlasInput";
import { requestPasswordResetAction } from "@/server/actions/auth.actions";
import { BrandPanel, ExploreIcon } from "./LoginFormV2";

/* ────────────────────────────────────────────────────────────────────────────
 * Inline SVG Icons
 * ──────────────────────────────────────────────────────────────────────────── */

function MailIcon() {
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
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      className="size-16 text-green-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ArrowLeftIcon() {
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
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * ForgotPasswordForm
 * ──────────────────────────────────────────────────────────────────────────── */

export function ForgotPasswordForm() {
  const t = useTranslations("authV2.forgotPasswordPage");
  const tAuth = useTranslations("auth");
  const tBrand = useTranslations("authV2");

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const errorId = "forgot-password-error";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorKey(null);
    setIsSubmitting(true);

    try {
      const result = await requestPasswordResetAction(email);

      if (!result.success) {
        if (result.error === "errors.rateLimitExceeded") {
          setErrorKey("rateLimitExceeded");
        } else if (result.error === "auth.errors.emailInvalid") {
          setErrorKey("emailInvalid");
        } else {
          setErrorKey("generic");
        }
        return;
      }

      // Always show success — even if the email is not registered (anti-enumeration)
      setIsSuccess(true);
    } catch {
      setErrorKey("generic");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resolveError(key: string): string {
    try {
      return tAuth(`errors.${key}`);
    } catch {
      return key;
    }
  }

  // ─── Success state ──────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="flex min-h-screen overflow-hidden">
        <BrandPanel t={tBrand} />

        <div className="flex w-full lg:w-[40%] flex-col items-center justify-center px-6 sm:px-12 lg:px-16 bg-atlas-surface">
          <div className="w-full max-w-md">
            {/* Mobile header (hidden on desktop) */}
            <div className="lg:hidden flex items-center gap-2 mb-12">
              <span className="text-atlas-secondary-container text-3xl">
                <ExploreIcon />
              </span>
              <span className="font-atlas-headline text-2xl font-black text-atlas-primary">
                Atlas
              </span>
            </div>

            <div className="text-center">
              <div className="flex justify-center mb-6">
                <CheckCircleIcon />
              </div>
              <h1 className="font-atlas-headline text-2xl font-bold text-atlas-on-surface">
                {t("successHeading")}
              </h1>
              <p className="mt-4 text-atlas-on-surface-variant leading-relaxed">
                {t("successMessage")}
              </p>
              <div className="mt-8">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 font-semibold text-atlas-on-tertiary-fixed-variant hover:underline underline-offset-2 focus-visible:ring-2 ring-atlas-focus-ring rounded-md px-2 py-1 min-h-[44px]"
                >
                  <ArrowLeftIcon />
                  {t("backToLogin")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form state ─────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen overflow-hidden">
      <BrandPanel t={tBrand} />

      <div className="flex w-full lg:w-[40%] flex-col items-center justify-center px-6 sm:px-12 lg:px-16 bg-atlas-surface">
        <div className="w-full max-w-md">
          {/* Mobile header (hidden on desktop) */}
          <div className="lg:hidden flex items-center gap-2 mb-12">
            <span className="text-atlas-secondary-container text-3xl">
              <ExploreIcon />
            </span>
            <span className="font-atlas-headline text-2xl font-black text-atlas-primary">
              Atlas
            </span>
          </div>

          {/* Back to login link */}
          <div className="mb-8">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-atlas-on-surface-variant hover:text-atlas-on-surface focus-visible:ring-2 ring-atlas-focus-ring rounded-md px-2 py-1 min-h-[44px]"
            >
              <ArrowLeftIcon />
              {t("backToLogin")}
            </Link>
          </div>

          {/* Heading */}
          <h1 className="font-atlas-headline text-3xl font-bold text-atlas-on-surface">
            {t("heading")}
          </h1>
          <p className="mt-2 text-atlas-on-surface-variant">
            {t("subtitle")}
          </p>

          {/* Error message */}
          {errorKey && (
            <div
              id={errorId}
              role="alert"
              className="mt-6 rounded-lg bg-atlas-error-container px-4 py-3 text-sm text-atlas-on-error-container"
            >
              {resolveError(errorKey)}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
            noValidate
          >
            <AtlasInput
              type="email"
              label={t("emailLabel")}
              placeholder={t("emailPlaceholder")}
              leftIcon={<MailIcon />}
              id="forgot-password-email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              aria-describedby={errorKey ? errorId : undefined}
            />

            <AtlasButton
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full min-h-[44px]"
              variant="primary"
            >
              {isSubmitting ? t("submitting") : t("submit")}
            </AtlasButton>
          </form>

          {/* Create account link (internal navigation, consistent with LoginFormV2) */}
          <p className="mt-10 text-center text-sm text-atlas-on-surface-variant">
            {tBrand("noAccount")}{" "}
            <Link
              href="/auth/register"
              className="font-bold text-atlas-on-tertiary-fixed-variant hover:underline underline-offset-2"
            >
              {tBrand("createAccount")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
