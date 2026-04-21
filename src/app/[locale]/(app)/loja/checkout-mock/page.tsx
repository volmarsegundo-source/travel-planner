import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CheckoutMockClient } from "./CheckoutMockClient";

export const dynamic = "force-dynamic";

interface CheckoutMockPageProps {
  searchParams: Promise<{ plan?: string; session?: string }>;
}

export default async function CheckoutMockPage({ searchParams }: CheckoutMockPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const sp = await searchParams;
  const plan = sp.plan === "PREMIUM_ANNUAL" ? "PREMIUM_ANNUAL" : "PREMIUM_MONTHLY";
  const sessionId = sp.session ?? "";

  const t = await getTranslations("premium.checkout.mock");

  const priceLabel = plan === "PREMIUM_ANNUAL" ? "R$ 299,00 / ano" : "R$ 29,90 / mês";
  const planLabel = plan === "PREMIUM_ANNUAL" ? t("planAnnual") : t("planMonthly");

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-atlas-outline-variant/30 bg-atlas-surface-container-lowest p-6 shadow-sm">
        <header className="mb-6 flex items-center justify-between border-b border-atlas-outline-variant/30 pb-4">
          <h1 className="font-atlas-headline text-lg font-bold text-atlas-primary">
            {t("title")}
          </h1>
          <span
            className="rounded-full bg-[#009EE3] px-2 py-0.5 text-[10px] font-bold uppercase text-white"
            aria-label="Mercado Pago"
          >
            MP
          </span>
        </header>

        <dl className="mb-6 space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-atlas-on-surface-variant">{t("planLabel")}</dt>
            <dd className="text-sm font-semibold text-atlas-primary">{planLabel}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-atlas-on-surface-variant">{t("priceLabel")}</dt>
            <dd className="text-sm font-semibold text-atlas-primary">{priceLabel}</dd>
          </div>
        </dl>

        <CheckoutMockClient sessionId={sessionId} />

        <p className="mt-6 rounded-lg border border-atlas-warning bg-atlas-warning-container p-3 text-xs text-atlas-warning dark:border-atlas-warning/40 dark:bg-atlas-warning-container/10 dark:text-atlas-warning">
          {t("disclaimer")}
        </p>
      </div>
    </main>
  );
}
