"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AtlasButton } from "@/components/ui/AtlasButton";
import { AtlasInput } from "@/components/ui/AtlasInput";
import { completeProfileAction } from "@/server/actions/profile.actions";

// SPEC-AUTH-AGE-002: DOB-only form for Google OAuth users. Adults → /expeditions.
// Minors → /auth/age-rejected (server action already signs them out).

interface CompleteProfileFormProps {
  callbackUrl?: string;
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CompleteProfileForm({ callbackUrl }: CompleteProfileFormProps) {
  const t = useTranslations("auth.completeProfile");
  const tAuth = useTranslations("auth");
  const router = useRouter();

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorKey(null);
    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.set("dateOfBirth", dateOfBirth);
      const result = await completeProfileAction(fd);

      if (!result.success) {
        if (result.error === "auth.errors.ageUnderage") {
          // Server action already invoked signOut. Navigate to the rejection page.
          router.push("/auth/age-rejected");
          return;
        }
        setErrorKey(result.error);
        return;
      }

      router.push(callbackUrl ?? "/expeditions");
    } catch {
      setErrorKey("errors.generic");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resolveError(key: string): string {
    try {
      return tAuth(key.replace(/^auth\./, ""));
    } catch {
      return key;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12 bg-atlas-surface">
      <div className="w-full max-w-md">
        <h1 className="font-atlas-headline text-3xl font-bold text-atlas-on-surface">
          {t("title")}
        </h1>
        <p className="mt-2 text-atlas-on-surface-variant">{t("subtitle")}</p>

        {errorKey && (
          <div
            role="alert"
            className="mt-6 rounded-lg bg-atlas-error-container px-4 py-3 text-sm text-atlas-on-error-container"
          >
            {resolveError(errorKey)}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
          <AtlasInput
            type="date"
            id="complete-profile-dob"
            label={tAuth("dateOfBirth")}
            required
            max={todayIso()}
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={isSubmitting}
          />

          <AtlasButton
            type="submit"
            disabled={isSubmitting || !dateOfBirth}
            className="w-full min-h-[44px]"
            variant="primary"
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </AtlasButton>
        </form>
      </div>
    </div>
  );
}
