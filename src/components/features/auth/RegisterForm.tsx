"use client";

import { useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TrustSignals } from "@/components/features/auth/TrustSignals";
import { registerAction } from "@/server/actions/auth.actions";
import { PasswordStrengthChecklist } from "@/components/features/auth/PasswordStrengthChecklist";
import { z } from "zod";
import { UserSignUpSchema } from "@/lib/validations/user.schema";

// Extend the schema for the client form: treat empty name string as undefined
// so optional validation passes when the name field is left blank.
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

type RegisterFormInput = z.input<typeof RegisterFormSchema>;

// Inline SVG spinner
function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
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
  );
}

// Inline SVG Google logo
function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
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

// Inline SVG Apple logo
function AppleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

// Inline SVG chevron for optional name section toggle
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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

// Map Zod validation messages to i18n keys
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

import type { OAuthProviderKey } from "@/lib/auth-providers";

interface RegisterFormProps {
  /** OAuth providers with configured credentials (passed from server component) */
  availableProviders?: OAuthProviderKey[];
}

export function RegisterForm({ availableProviders = [] }: RegisterFormProps) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const hasGoogle = availableProviders.includes("google");
  const hasApple = availableProviders.includes("apple");
  const hasSocialProviders = hasGoogle || hasApple;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [serverErrorKey, setServerErrorKey] = useState<string | null>(null);

  const isSocialLoading = isGoogleLoading || isAppleLoading;
  const serverErrorId = "register-server-error";

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
    // key format: "auth.errors.xxx" or "errors.xxx"
    try {
      const withoutNs = key.startsWith("auth.") ? key.slice(5) : key;
      if (withoutNs.startsWith("errors.")) {
        const sub = withoutNs.slice(7);
        return t(`errors.${sub as Parameters<typeof t>[0]}`);
      }
      return key;
    } catch {
      // Fallback if i18n key doesn't exist
      return key;
    }
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

  async function handleAppleSignIn() {
    setIsAppleLoading(true);
    try {
      await signIn("apple", { callbackUrl: "/expeditions" });
    } finally {
      setIsAppleLoading(false);
    }
  }

  // Translate Zod error messages from English schema messages to i18n keys
  function getFieldError(fieldError: { message?: string } | undefined): string | undefined {
    if (!fieldError?.message) return undefined;
    const key = ZOD_MESSAGE_TO_KEY[fieldError.message];
    if (key) return resolveError(key);
    return fieldError.message;
  }

  const watchedPassword = form.watch("password");
  const emailError = getFieldError(form.formState.errors.email);
  const passwordError = getFieldError(form.formState.errors.password);
  const confirmPasswordError = getFieldError(form.formState.errors.confirmPassword);
  const dateOfBirthError = getFieldError(form.formState.errors.dateOfBirth);
  // name errors can come from the pipe transform result
  const nameError = getFieldError(
    form.formState.errors.name as { message?: string } | undefined
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{t("signUp")}</h2>
      </div>

      {/* Server-side error */}
      {serverErrorKey !== null && (
        <div
          id={serverErrorId}
          role="alert"
          aria-live="assertive"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30"
        >
          {resolveError(serverErrorKey)}
        </div>
      )}

      {/* Social sign-in buttons — only rendered when providers are configured */}
      {hasSocialProviders && (
        <>
          <div className="flex flex-col gap-3">
            {hasGoogle && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || isSocialLoading}
                aria-busy={isGoogleLoading}
                data-testid="google-signin"
              >
                {isGoogleLoading ? <Spinner /> : <GoogleIcon />}
                {t("continueWithGoogle")}
              </Button>
            )}

            {hasApple && (
              <Button
                type="button"
                className="w-full bg-black text-white hover:bg-black/90"
                onClick={handleAppleSignIn}
                disabled={isSubmitting || isSocialLoading}
                aria-busy={isAppleLoading}
                data-testid="apple-signin"
              >
                {isAppleLoading ? <Spinner /> : <AppleIcon />}
                {t("continueWithApple")}
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-sm text-muted-foreground">{t("orContinueWith")}</span>
            <Separator className="flex-1" />
          </div>
        </>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
          aria-describedby={serverErrorKey !== null ? serverErrorId : undefined}
        >
          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("email")}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    disabled={isSubmitting}
                    aria-describedby={
                      emailError
                        ? `${field.name}-error`
                        : serverErrorKey !== null
                          ? serverErrorId
                          : undefined
                    }
                    {...field}
                  />
                </FormControl>
                {emailError && (
                  <p
                    id={`${field.name}-error`}
                    role="alert"
                    className="text-destructive text-sm"
                  >
                    {emailError}
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("password")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    aria-describedby={
                      passwordError ? `${field.name}-error` : undefined
                    }
                    {...field}
                  />
                </FormControl>
                {passwordError && (
                  <p
                    id={`${field.name}-error`}
                    role="alert"
                    className="text-destructive text-sm"
                  >
                    {passwordError}
                  </p>
                )}
                <PasswordStrengthChecklist password={watchedPassword} />
              </FormItem>
            )}
          />

          {/* Confirm Password */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("confirmPassword")}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    aria-describedby={
                      confirmPasswordError ? `${field.name}-error` : undefined
                    }
                    {...field}
                  />
                </FormControl>
                {confirmPasswordError && (
                  <p
                    id={`${field.name}-error`}
                    role="alert"
                    className="text-destructive text-sm"
                  >
                    {confirmPasswordError}
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Date of Birth — SPEC-AUTH-AGE-001 */}
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("dateOfBirth")}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    autoComplete="bday"
                    disabled={isSubmitting}
                    aria-describedby={
                      dateOfBirthError ? `${field.name}-error` : undefined
                    }
                    {...field}
                  />
                </FormControl>
                {dateOfBirthError && (
                  <p
                    id={`${field.name}-error`}
                    role="alert"
                    className="text-destructive text-sm"
                  >
                    {dateOfBirthError}
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Optional name — collapsed by default */}
          <div>
            <button
              type="button"
              onClick={() => setNameOpen((prev) => !prev)}
              className="flex w-full items-center justify-between text-sm text-muted-foreground hover:text-foreground"
              aria-expanded={nameOpen}
              aria-controls="register-name-section"
            >
              <span>{t("name")} {tCommon("optional")}</span>
              <ChevronIcon open={nameOpen} />
            </button>

            {nameOpen && (
              <div id="register-name-section" className="mt-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">{t("name")}</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          autoComplete="name"
                          disabled={isSubmitting}
                          aria-describedby={
                            nameError ? `${field.name}-error` : undefined
                          }
                          {...field}
                        />
                      </FormControl>
                      {nameError && (
                        <p
                          id={`${field.name}-error`}
                          role="alert"
                          className="text-destructive text-sm"
                        >
                          {nameError}
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isSocialLoading}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? <Spinner /> : null}
            {t("signUp")}
          </Button>
        </form>
      </Form>

      {/* Login link */}
      <p className="text-center text-sm text-muted-foreground">
        {t("alreadyHaveAccount")}{" "}
        <Link
          href="/auth/login"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {t("signIn")}
        </Link>
      </p>

      {/* Trust signals */}
      <TrustSignals />
    </div>
  );
}
