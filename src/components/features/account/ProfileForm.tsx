"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserProfileAction } from "@/server/actions/account.actions";

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

const LOCALE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en", label: "English" },
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfileFormProps {
  userName: string;
  userEmail: string;
  preferredLocale: string;
}

interface FormErrors {
  name?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ProfileForm({
  userName,
  userEmail,
  preferredLocale,
}: ProfileFormProps) {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(userName);
  const [locale, setLocale] = useState(preferredLocale);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Derive initials for avatar
  const initials = (name || userEmail).charAt(0).toUpperCase();

  function validateForm(): boolean {
    const newErrors: FormErrors = {};
    const trimmedName = name.trim();

    if (trimmedName.length < MIN_NAME_LENGTH) {
      newErrors.name = t("errors.nameTooShort");
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      newErrors.name = t("errors.nameTooLong");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    if (!validateForm()) {
      nameInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateUserProfileAction({
        name: name.trim(),
        preferredLocale: locale as "pt-BR" | "en",
      });

      if (result.success) {
        setFeedback({ type: "success", message: t("profileUpdated") });
        router.refresh();
      } else {
        const errorKey = result.error;
        // Try to resolve the error key from the account namespace
        const errorMessage =
          errorKey.startsWith("account.errors.")
            ? t(`errors.${errorKey.replace("account.errors.", "")}`)
            : tCommon("error");
        setFeedback({ type: "error", message: errorMessage });
      }
    } catch {
      setFeedback({ type: "error", message: tCommon("error") });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Personal Info Section */}
      <section
        aria-labelledby="personal-info-heading"
        className="rounded-lg border border-border bg-card p-6"
      >
        <h2
          id="personal-info-heading"
          className="text-lg font-semibold text-foreground"
        >
          {t("personalInfo")}
        </h2>

        <div className="mt-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary"
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {name || userEmail}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </div>

          {/* Name field */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-name">{t("name")}</Label>
            <Input
              ref={nameInputRef}
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({});
              }}
              aria-describedby={errors.name ? "name-error" : undefined}
              aria-invalid={!!errors.name}
              maxLength={MAX_NAME_LENGTH}
            />
            {errors.name && (
              <p id="name-error" role="alert" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email field (read-only) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-email">{t("email")}</Label>
            <Input
              id="profile-email"
              type="email"
              value={userEmail}
              readOnly
              disabled
              aria-describedby="email-readonly-hint"
              className="bg-muted"
            />
            <p
              id="email-readonly-hint"
              className="text-xs text-muted-foreground"
            >
              {t("emailReadOnly")}
            </p>
          </div>
        </div>
      </section>

      {/* Preferences Section */}
      <section
        aria-labelledby="preferences-heading"
        className="mt-6 rounded-lg border border-border bg-card p-6"
      >
        <h2
          id="preferences-heading"
          className="text-lg font-semibold text-foreground"
        >
          {t("preferences")}
        </h2>

        <div className="mt-6">
          <Label htmlFor="profile-locale">{t("preferredLocale")}</Label>
          <select
            id="profile-locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
          >
            {LOCALE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Feedback message */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-md px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Submit button */}
      <div className="mt-6">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              {t("saving")}
            </>
          ) : (
            t("saveChanges")
          )}
        </Button>
      </div>
    </form>
  );
}
