"use client";

import { useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasInput } from "@/components/ui/AtlasInput";
import { BrandPanel, ExploreIcon } from "@/components/features/auth/LoginFormV2";
import { registerAction } from "@/server/actions/auth.actions";
import { PasswordStrengthChecklist } from "@/components/features/auth/PasswordStrengthChecklist";
import { z } from "zod";
import { UserSignUpSchema } from "@/lib/validations/user.schema";
import type { OAuthProviderKey } from "@/lib/auth-providers";

/* ────────────────────────────────────────────────────────────────────────────
 * Form Schema
 * ──────────────────────────────────────────────────────────────────────────── */

const RegisterFormSchema = UserSignUpSchema.extend({
  name: z
    .string()
    .transform((val) => (val.trim() === "" ? undefined : val))
    .pipe(z.string().min(1).max(100).optional()),
  confirmPassword: z.string().min(1, "Confirm password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Today as YYYY-MM-DD for the max attribute (no future DOB allowed).
function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type RegisterFormInput = z.input<typeof RegisterFormSchema>;

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

function UserIcon() {
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
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Zod message → i18n key mapping
 * ──────────────────────────────────────────────────────────────────────────── */

const ZOD_MESSAGE_TO_KEY: Record<string, string> = {
  "Invalid email address": "errors.emailInvalid",
  "Password must be at least 8 characters": "errors.passwordTooShort",
  "Password must be at most 72 characters": "errors.passwordTooShort",
  "auth.errors.passwordWeak": "errors.passwordWeak",
  "auth.errors.ageUnderage": "errors.ageUnderage",
  "auth.errors.dateInvalid": "errors.dateInvalid",
  "Confirm password is required": "errors.passwordRequired",
  "Passwords do not match": "errors.passwordsDoNotMatch",
  "Name is required": "errors.nameRequired",
};

/* ────────────────────────────────────────────────────────────────────────────
 * Main Component
 * ──────────────────────────────────────────────────────────────────────────── */

interface RegisterFormV2Props {
  availableProviders?: OAuthProviderKey[];
}

export function RegisterFormV2({ availableProviders = [] }: RegisterFormV2Props) {
  const t = useTranslations("authV2");
  const tAuth = useTranslations("auth");
  const router = useRouter();

  const hasGoogle = availableProviders.includes("google");
  const hasSocialProviders = hasGoogle;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [serverErrorKey, setServerErrorKey] = useState<string | null>(null);

  const isSocialLoading = isGoogleLoading;
  const errorId = "register-v2-error";

  const form = useForm<RegisterFormInput>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      dateOfBirth: "",
      name: "",
    },
    mode: "onSubmit",
  });

  function resolveError(key: string): string {
    try {
      const withoutNs = key.startsWith("auth.") ? key.slice(5) : key;
      if (withoutNs.startsWith("errors.")) {
        const sub = withoutNs.slice(7);
        return tAuth(`errors.${sub as "invalidCredentials" | "emailAlreadyExists" | "generic" | "emailInvalid" | "passwordTooShort" | "passwordRequired" | "passwordsDoNotMatch" | "nameRequired" | "ageUnderage" | "dateInvalid"}`);
      }
      return key;
    } catch {
      return key;
    }
  }

  function getFieldError(fieldError: { message?: string } | undefined): string | undefined {
    if (!fieldError?.message) return undefined;
    const key = ZOD_MESSAGE_TO_KEY[fieldError.message];
    if (key) return resolveError(key);
    return fieldError.message;
  }

  async function onSubmit(values: RegisterFormInput) {
    setServerErrorKey(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("email", values.email);
      formData.set("password", values.password);
      formData.set("dateOfBirth", values.dateOfBirth);
      if (values.name) formData.set("name", values.name);

      const result = await registerAction(formData);

      if (!result.success) {
        setServerErrorKey(result.error);
        return;
      }

      // Auto-login after successful registration
      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push("/expeditions");
      } else {
        // Fallback to login page if auto-login fails
        router.push("/auth/login?registered=true");
      }
    } catch {
      setServerErrorKey("errors.generic");
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

  const watchedPassword = form.watch("password");
  const emailError = getFieldError(form.formState.errors.email);
  const passwordError = getFieldError(form.formState.errors.password);
  const confirmPasswordError = getFieldError(form.formState.errors.confirmPassword);
  const dateOfBirthError = getFieldError(form.formState.errors.dateOfBirth);
  const nameError = getFieldError(
    form.formState.errors.name as { message?: string } | undefined,
  );

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left: Brand Panel (desktop only) */}
      <BrandPanel t={t} />

      {/* Right: Register Form */}
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
              {t("registerHeading")}
            </h2>
            <p className="text-atlas-on-surface-variant text-base">
              {t("registerSubtitle")}
            </p>
          </div>

          {/* Server error */}
          {serverErrorKey !== null && (
            <div
              id={errorId}
              role="alert"
              aria-live="assertive"
              className="rounded-lg bg-atlas-error-container px-4 py-3 text-sm text-atlas-on-error-container border border-atlas-error/30 mb-6"
            >
              {resolveError(serverErrorKey)}
            </div>
          )}

          {/* Credentials form */}
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-5"
            aria-describedby={serverErrorKey !== null ? errorId : undefined}
          >
            {/* Email */}
            <div>
              <AtlasInput
                type="email"
                label={t("emailLabel")}
                placeholder={t("emailPlaceholder")}
                leftIcon={<MailIcon />}
                id="register-v2-email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                className="[&_input]:focus:border-atlas-on-tertiary-container"
                {...form.register("email")}
              />
              {emailError && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-1.5 text-sm text-atlas-error"
                >
                  {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <AtlasInput
                type="password"
                label={t("passwordLabel")}
                placeholder={t("passwordPlaceholder")}
                leftIcon={<LockIcon />}
                id="register-v2-password"
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                className="[&_input]:focus:border-atlas-on-tertiary-container"
                {...form.register("password")}
              />
              {passwordError && (
                <p
                  id="password-error"
                  role="alert"
                  className="mt-1.5 text-sm text-atlas-error"
                >
                  {passwordError}
                </p>
              )}
              <PasswordStrengthChecklist password={watchedPassword} />
            </div>

            {/* Confirm Password */}
            <div>
              <AtlasInput
                type="password"
                label={t("confirmPasswordLabel")}
                placeholder={t("confirmPasswordPlaceholder")}
                leftIcon={<LockIcon />}
                id="register-v2-confirm-password"
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                className="[&_input]:focus:border-atlas-on-tertiary-container"
                {...form.register("confirmPassword")}
              />
              {confirmPasswordError && (
                <p
                  id="confirmPassword-error"
                  role="alert"
                  className="mt-1.5 text-sm text-atlas-error"
                >
                  {confirmPasswordError}
                </p>
              )}
            </div>

            {/* Date of Birth — SPEC-AUTH-AGE-001 */}
            <div>
              <AtlasInput
                type="date"
                label={t("dobLabel")}
                placeholder={t("dobPlaceholder")}
                id="register-v2-dob"
                autoComplete="bday"
                required
                max={todayIso()}
                disabled={isSubmitting}
                className="[&_input]:focus:border-atlas-on-tertiary-container"
                {...form.register("dateOfBirth")}
              />
              {dateOfBirthError && (
                <p
                  id="dateOfBirth-error"
                  role="alert"
                  className="mt-1.5 text-sm text-atlas-error"
                >
                  {dateOfBirthError}
                </p>
              )}
            </div>

            {/* Optional name — collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setNameOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-sm text-atlas-on-surface-variant hover:text-atlas-on-surface focus-visible:ring-2 ring-atlas-focus-ring rounded min-h-[44px]"
                aria-expanded={nameOpen}
                aria-controls="register-v2-name-section"
              >
                <span>
                  {t("nameLabel")} {t("nameOptional")}
                </span>
                <ChevronIcon open={nameOpen} />
              </button>

              {nameOpen && (
                <div id="register-v2-name-section" className="mt-2">
                  <AtlasInput
                    type="text"
                    label={t("nameLabel")}
                    placeholder={t("namePlaceholder")}
                    leftIcon={<UserIcon />}
                    id="register-v2-name"
                    autoComplete="name"
                    disabled={isSubmitting}
                    className="[&_input]:focus:border-atlas-on-tertiary-container [&_label]:sr-only"
                    {...form.register("name")}
                  />
                  {nameError && (
                    <p
                      id="name-error"
                      role="alert"
                      className="mt-1.5 text-sm text-atlas-error"
                    >
                      {nameError}
                    </p>
                  )}
                </div>
              )}
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
              {t("registerSubmit")}
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
              <div className="grid gap-4 grid-cols-1">
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
              </div>
            </>
          )}

          {/* Login link */}
          <p className="mt-10 text-center text-sm text-atlas-on-surface-variant">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href="/auth/login"
              className="font-bold text-atlas-on-tertiary-fixed-variant hover:underline underline-offset-2"
            >
              {t("signInLink")}
            </Link>
          </p>

          {/* Legal text */}
          <p className="mt-16 text-center text-[11px] text-atlas-outline leading-relaxed max-w-xs mx-auto">
            {t("registerLegalText")}{" "}
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
