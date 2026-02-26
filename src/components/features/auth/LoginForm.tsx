"use client";

import { useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Inline SVG spinner — no external dependency needed
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
    <svg
      aria-hidden="true"
      className="size-4"
      viewBox="0 0 24 24"
    >
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

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const errorId = "login-error";

  async function handleCredentialsSubmit(
    e: React.FormEvent<HTMLFormElement>
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

      if (!result?.ok) {
        setErrorKey("errors.invalidCredentials");
        return;
      }

      router.push("/trips");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/trips" });
    } finally {
      // signIn with redirect does not return here in normal flow;
      // reset loading only on error path
      setIsGoogleLoading(false);
    }
  }

  // Resolve nested key using dot notation — t() from next-intl supports dot paths directly
  function resolveError(key: string): string {
    // key like "errors.invalidCredentials" maps to t('errors.invalidCredentials')
    // next-intl t() can resolve nested via object syntax; we split manually here
    const parts = key.split(".");
    if (parts[0] === "errors" && parts[1]) {
      return t(`errors.${parts[1] as Parameters<typeof t>[0]}`);
    }
    return key;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{t("signIn")}</h2>
      </div>

      {/* Error message */}
      {errorKey !== null && (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200"
        >
          {resolveError(errorKey)}
        </div>
      )}

      {/* Credentials form */}
      <form
        onSubmit={handleCredentialsSubmit}
        noValidate
        className="flex flex-col gap-4"
        aria-describedby={errorKey !== null ? errorId : undefined}
      >
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">{t("email")}</Label>
          <Input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            aria-describedby={errorKey !== null ? errorId : undefined}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">{t("password")}</Label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            aria-describedby={errorKey !== null ? errorId : undefined}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || isGoogleLoading}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? <Spinner /> : null}
          {t("signIn")}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-sm text-gray-500">{t("orContinueWith")}</span>
        <Separator className="flex-1" />
      </div>

      {/* Google sign in */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting || isGoogleLoading}
        aria-busy={isGoogleLoading}
      >
        {isGoogleLoading ? <Spinner /> : <GoogleIcon />}
        {t("continueWithGoogle")}
      </Button>

      {/* Register link */}
      <p className="text-center text-sm text-gray-600">
        {t("dontHaveAccount")}{" "}
        <Link
          href="/auth/register"
          className="font-medium text-gray-900 underline-offset-2 hover:underline"
        >
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
