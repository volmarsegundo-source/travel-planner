"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasInput } from "@/components/ui/AtlasInput";
import type { OAuthProviderKey } from "@/lib/auth-providers";

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

function ArrowRightIcon() {
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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      className="size-5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function ExploreIcon() {
  return (
    <svg
      className="size-8"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.43 14.56L7.34 9.07l7.49 3.23-3.23 7.49z" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg
      className="size-6"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Brand Panel (Left side — desktop only)
 * ──────────────────────────────────────────────────────────────────────────── */

function BrandPanel({ t }: { t: (key: string) => string }) {
  return (
    <div
      className="hidden lg:flex w-[60%] bg-atlas-primary relative overflow-hidden flex-col items-center justify-center"
      aria-hidden="true"
    >
      {/* Ambient teal glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-atlas-on-tertiary-container rounded-full blur-[140px] opacity-20" />

      {/* Logo block */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-atlas-secondary-container to-atlas-secondary-fixed-dim flex items-center justify-center shadow-lg">
            <span className="text-atlas-primary">
              <ExploreIcon />
            </span>
          </div>
          <span className="font-atlas-headline text-6xl font-black text-white tracking-tighter">
            Atlas
          </span>
        </div>
        <p className="font-atlas-headline text-xl text-atlas-on-primary-container max-w-xs text-center leading-relaxed">
          {t("brandTagline")}
        </p>
      </div>

      {/* Floating decorative card */}
      <div className="absolute bottom-32 left-1/2 -translate-x-1/2 translate-y-12 rotate-[-4deg] z-20 bg-atlas-primary-container/80 backdrop-blur-xl border border-white/10 p-5 rounded-xl shadow-2xl w-72">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-atlas-on-primary-container uppercase tracking-widest font-bold">
              {t("nextTrip")}
            </p>
            <p className="text-white font-atlas-headline font-semibold text-sm">
              Rio de Janeiro &rarr; Lisboa
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-atlas-secondary-container/20 flex items-center justify-center text-atlas-secondary-container">
            <PlaneIcon />
          </div>
        </div>
        <div className="flex justify-between text-[11px] text-atlas-on-primary-container mb-2">
          <span>12 {t("daysRemaining")}</span>
          <span>85% {t("percentReady")}</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full">
          <div
            className="h-full w-[85%] bg-atlas-secondary-container rounded-full"
            style={{ boxShadow: "0 0 10px rgba(254, 147, 44, 0.5)" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Main Component
 * ──────────────────────────────────────────────────────────────────────────── */

interface LoginFormV2Props {
  availableProviders?: OAuthProviderKey[];
}

export function LoginFormV2({ availableProviders = [] }: LoginFormV2Props) {
  const t = useTranslations("authV2");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();

  const justRegistered = searchParams.get("registered") === "true";
  const oauthError = searchParams.get("error");

  const hasGoogle = availableProviders.includes("google");
  // GitHub support — check if apple is configured as a proxy for github
  // or check for github directly in the providers list
  const hasGithub = false; // No github provider configured in current auth-providers.ts
  const hasSocialProviders = hasGoogle || hasGithub;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(
    oauthError ? "errors.oauthError" : null,
  );

  const isSocialLoading = isGoogleLoading;
  const errorId = "login-v2-error";

  async function handleCredentialsSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    setErrorKey(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result?.ok || result?.error) {
        setErrorKey("errors.invalidCredentials");
        return;
      }

      router.push("/expeditions");
    } catch {
      setErrorKey("errors.invalidCredentials");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/expeditions" });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  function resolveError(key: string): string {
    try {
      const parts = key.split(".");
      if (parts[0] === "errors" && parts[1]) {
        return tAuth(`errors.${parts[1] as "invalidCredentials" | "oauthError" | "generic"}`);
      }
      return key;
    } catch {
      return key;
    }
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left: Brand Panel (desktop only) */}
      <BrandPanel t={t} />

      {/* Right: Login Form */}
      <div className="w-full lg:w-[40%] bg-white flex flex-col px-8 md:px-20 py-12 justify-center relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile header (hidden on desktop) */}
          <div className="lg:hidden flex items-center gap-2 mb-12">
            <span className="text-atlas-secondary-container text-3xl">
              <ExploreIcon />
            </span>
            <span className="font-atlas-headline text-2xl font-black text-atlas-primary">
              Atlas
            </span>
          </div>

          {/* Welcome block */}
          <div className="mb-10">
            <h2 className="font-atlas-headline text-[28px] font-bold text-atlas-primary mb-2">
              {t("welcomeBack")}
            </h2>
            <p className="text-atlas-on-surface-variant text-base">
              {t("subtitle")}
            </p>
          </div>

          {/* Registration success banner */}
          {justRegistered && errorKey === null && (
            <div
              role="status"
              className="rounded-lg bg-atlas-success-container px-4 py-3 text-sm text-atlas-on-surface border border-atlas-success/30 mb-6"
            >
              {tAuth("registrationSuccess")}
            </div>
          )}

          {/* Error message */}
          {errorKey !== null && (
            <div
              id={errorId}
              role="alert"
              aria-live="assertive"
              className="rounded-lg bg-atlas-error-container px-4 py-3 text-sm text-atlas-on-error-container border border-atlas-error/30 mb-6"
            >
              {resolveError(errorKey)}
            </div>
          )}

          {/* Credentials form */}
          <form
            onSubmit={handleCredentialsSubmit}
            noValidate
            className="flex flex-col gap-5"
            aria-describedby={errorKey !== null ? errorId : undefined}
          >
            {/* Email */}
            <AtlasInput
              type="email"
              label={t("emailLabel")}
              placeholder={t("emailPlaceholder")}
              leftIcon={<MailIcon />}
              id="login-v2-email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="[&_input]:focus:border-atlas-on-tertiary-container"
            />

            {/* Password field with forgot link positioned beside label */}
            <div className="relative">
              <AtlasInput
                type="password"
                label={t("passwordLabel")}
                placeholder={t("passwordPlaceholder")}
                leftIcon={<LockIcon />}
                id="login-v2-password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="[&_input]:focus:border-atlas-on-tertiary-container"
              />
              <Link
                href="/auth/forgot-password"
                className="absolute top-0 right-0 text-sm font-semibold text-atlas-on-tertiary-fixed-variant hover:underline underline-offset-2"
              >
                {t("forgotPassword")}
              </Link>
            </div>

            {/* Remember me checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="login-v2-remember"
                className="w-5 h-5 rounded border-atlas-outline-variant accent-atlas-secondary-container focus:ring-2 focus:ring-atlas-focus-ring cursor-pointer"
              />
              <label
                htmlFor="login-v2-remember"
                className="text-sm text-atlas-on-surface-variant cursor-pointer select-none"
              >
                {t("rememberMe")}
              </label>
            </div>

            {/* Submit CTA */}
            <AtlasButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting || isSocialLoading}
              rightIcon={<ArrowRightIcon />}
            >
              {t("submit")}
            </AtlasButton>
          </form>

          {/* Social login section */}
          {hasSocialProviders && (
            <>
              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-atlas-outline-variant/30" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm font-medium text-atlas-outline">
                    {t("or")}
                  </span>
                </div>
              </div>

              {/* Social buttons */}
              <div
                className={`grid gap-4 ${hasGoogle && hasGithub ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {hasGoogle && (
                  <AtlasButton
                    type="button"
                    variant="secondary"
                    size="md"
                    fullWidth
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting || isSocialLoading}
                    leftIcon={<GoogleIcon />}
                    aria-busy={isGoogleLoading}
                    data-testid="google-signin-v2"
                  >
                    {t("socialGoogle")}
                  </AtlasButton>
                )}
                {hasGithub && (
                  <AtlasButton
                    type="button"
                    variant="secondary"
                    size="md"
                    fullWidth
                    leftIcon={<GitHubIcon />}
                    disabled={isSubmitting || isSocialLoading}
                    data-testid="github-signin-v2"
                  >
                    {t("socialGithub")}
                  </AtlasButton>
                )}
              </div>
            </>
          )}

          {/* Create account link */}
          <p className="mt-10 text-center text-sm text-atlas-on-surface-variant">
            {t("noAccount")}{" "}
            <Link
              href="/auth/register"
              className="font-bold text-atlas-on-tertiary-fixed-variant hover:underline underline-offset-2"
            >
              {t("createAccount")}
            </Link>
          </p>

          {/* Legal text */}
          <p className="mt-16 text-center text-[11px] text-atlas-outline leading-relaxed max-w-xs mx-auto">
            {t("legalText")}{" "}
            <Link
              href="/terms"
              className="font-medium text-atlas-on-tertiary-fixed-variant hover:underline"
            >
              {t("termsOfUse")}
            </Link>{" "}
            {t("and")}{" "}
            <Link
              href="/privacy"
              className="font-medium text-atlas-on-tertiary-fixed-variant hover:underline"
            >
              {t("privacyPolicy")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
