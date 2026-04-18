"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasInput } from "@/components/ui/AtlasInput";
import { confirmPasswordResetAction } from "@/server/actions/auth.actions";
import { BrandPanel } from "./LoginFormV2";

/* ────────────────────────────────────────────────────────────────────────────
 * Inline SVG Icons
 * ──────────────────────────────────────────────────────────────────────────── */

function LockIcon() {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

function AlertTriangleIcon() {
  return (
    <svg
      className="size-16 text-atlas-error"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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
 * Constants
 * ──────────────────────────────────────────────────────────────────────────── */

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

/* ────────────────────────────────────────────────────────────────────────────
 * ResetPasswordForm
 * ──────────────────────────────────────────────────────────────────────────── */

interface ResetPasswordFormProps {
  token: string | null;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useTranslations("authV2.resetPasswordPage");
  const tAuth = useTranslations("auth");
  const tBrand = useTranslations("authV2");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const errorId = "reset-password-error";

  // ─── Missing token state ──────────────────────────────────────────────────

  if (!token) {
    return (
      <div className="flex min-h-screen overflow-hidden">
        <BrandPanel t={tBrand} />

        <div className="flex w-full lg:w-[40%] flex-col items-center justify-center px-6 sm:px-12 lg:px-16 bg-atlas-surface">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-6">
              <AlertTriangleIcon />
            </div>
            <h1 className="font-atlas-headline text-2xl font-bold text-atlas-on-surface">
              {t("invalidToken")}
            </h1>
            <div className="mt-8 flex flex-col gap-4 items-center">
              <Link
                href="/auth/forgot-password"
                className="inline-flex items-center gap-2 font-semibold text-atlas-on-tertiary-fixed-variant hover:underline underline-offset-2 focus-visible:ring-2 ring-atlas-focus-ring rounded-md px-2 py-1 min-h-[44px]"
              >
                {t("requestNewLink")}
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-atlas-on-surface-variant hover:text-atlas-on-surface focus-visible:ring-2 ring-atlas-focus-ring rounded-md px-2 py-1 min-h-[44px]"
              >
                <ArrowLeftIcon />
                {t("backToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Success state ──────────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="flex min-h-screen overflow-hidden">
        <BrandPanel t={tBrand} />

        <div className="flex w-full lg:w-[40%] flex-col items-center justify-center px-6 sm:px-12 lg:px-16 bg-atlas-surface">
          <div className="w-full max-w-md text-center">
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
                {t("goToLogin")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form handlers ──────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorKey(null);

    // Client-side validation
    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorKey("passwordTooShort");
      return;
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      setErrorKey("generic");
      return;
    }

    if (password !== confirmPassword) {
      setErrorKey("passwordsDoNotMatch");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await confirmPasswordResetAction(token!, password);

      if (!result.success) {
        if (result.error === "auth.errors.tokenExpired") {
          setErrorKey("tokenExpired");
        } else if (result.error === "auth.errors.passwordTooShort") {
          setErrorKey("passwordTooShort");
        } else {
          setErrorKey("generic");
        }
        return;
      }

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

  // ─── Form state ─────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen overflow-hidden">
      <BrandPanel t={tBrand} />

      <div className="flex w-full lg:w-[40%] flex-col items-center justify-center px-6 sm:px-12 lg:px-16 bg-atlas-surface">
        <div className="w-full max-w-md">
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
              type="password"
              label={t("passwordLabel")}
              placeholder={t("passwordPlaceholder")}
              leftIcon={<LockIcon />}
              id="reset-password-new"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />

            <AtlasInput
              type="password"
              label={t("confirmPasswordLabel")}
              placeholder={t("confirmPasswordPlaceholder")}
              leftIcon={<LockIcon />}
              id="reset-password-confirm"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              aria-describedby={errorKey ? errorId : undefined}
            />

            <AtlasButton
              type="submit"
              disabled={isSubmitting || !password || !confirmPassword}
              className="w-full min-h-[44px]"
              variant="primary"
            >
              {isSubmitting ? t("submitting") : t("submit")}
            </AtlasButton>
          </form>
        </div>
      </div>
    </div>
  );
}
