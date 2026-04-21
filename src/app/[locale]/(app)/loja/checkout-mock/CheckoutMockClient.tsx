"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { confirmCheckoutMockAction } from "@/server/actions/subscription.actions";

interface CheckoutMockClientProps {
  sessionId: string;
}

export function CheckoutMockClient({ sessionId }: CheckoutMockClientProps) {
  const t = useTranslations("premium.checkout.mock");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve() {
    if (!sessionId) {
      setError(t("missingSession"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await confirmCheckoutMockAction(sessionId);
      if (result.success) {
        router.push("/loja?tab=meu-plano&status=success");
      } else {
        setError(t("confirmError"));
      }
    });
  }

  function cancel() {
    router.push("/loja?tab=premium&status=cancelled");
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-lg bg-atlas-error-container p-3 text-sm text-atlas-on-error-container">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={approve}
        disabled={pending}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#2DB8A0] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#259785] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
      >
        {pending ? t("processing") : t("approve")}
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-atlas-outline-variant px-4 py-3 text-sm font-semibold text-atlas-on-surface-variant hover:bg-atlas-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {t("cancel")}
      </button>
    </div>
  );
}
