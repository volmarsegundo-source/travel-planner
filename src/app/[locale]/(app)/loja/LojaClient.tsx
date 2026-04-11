"use client";

import { useState, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  startTrialAction,
  cancelSubscriptionAction,
  type PremiumPlan,
} from "@/server/actions/subscription.actions";
import { purchasePAAction } from "@/server/actions/purchase.actions";

// ─── Constants ──────────────────────────────────────────────────────────────

export type LojaTab = "packages" | "premium" | "meu-plano";

const MONTHLY_PRICE_CENTS = 2990;
const ANNUAL_PRICE_CENTS = 29900;
const MONTHLY_EQUIVALENT_CENTS_OF_ANNUAL = Math.round(ANNUAL_PRICE_CENTS / 12);
const ANNUAL_SAVINGS_PERCENT = 17;

const PA_PACKAGES_CLIENT = [
  { id: "explorador", pa: 500, amountCents: 1490, highlight: false },
  { id: "navegador", pa: 1200, amountCents: 2990, highlight: true },
  { id: "cartografo", pa: 2800, amountCents: 5990, highlight: false },
  { id: "embaixador", pa: 6000, amountCents: 11990, highlight: false },
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────

interface SubscriptionSnapshot {
  plan: "FREE" | "PREMIUM_MONTHLY" | "PREMIUM_ANNUAL";
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isPremium: boolean;
}

interface LojaClientProps {
  initialTab: LojaTab;
  initialStatus: string | null;
  paBalance: number;
  subscription: SubscriptionSnapshot;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LojaClient({
  initialTab,
  initialStatus,
  paBalance,
  subscription,
}: LojaClientProps) {
  const t = useTranslations("loja");
  const tPremium = useTranslations("premium");
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<LojaTab>(initialTab);
  const [showConfetti, setShowConfetti] = useState(
    initialTab === "meu-plano" && initialStatus === "success"
  );

  const handleTabChange = useCallback(
    (tab: LojaTab) => {
      setActiveTab(tab);
      // Update URL without full navigation — simple replace via router.
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      url.searchParams.delete("status");
      window.history.replaceState({}, "", url.toString());
      if (showConfetti) setShowConfetti(false);
    },
    [showConfetti]
  );

  return (
    <div>
      {showConfetti && <ConfettiOverlay message={tPremium("confetti.success")} />}

      <div
        role="tablist"
        aria-label={t("tabsLabel")}
        className="mb-6 flex flex-wrap gap-2 border-b border-atlas-outline-variant/30"
      >
        <TabButton
          id="packages"
          active={activeTab === "packages"}
          onClick={() => handleTabChange("packages")}
          label={t("tabs.packages")}
        />
        <TabButton
          id="premium"
          active={activeTab === "premium"}
          onClick={() => handleTabChange("premium")}
          label={t("tabs.premium")}
        />
        <TabButton
          id="meu-plano"
          active={activeTab === "meu-plano"}
          onClick={() => handleTabChange("meu-plano")}
          label={t("tabs.myPlan")}
        />
      </div>

      {activeTab === "packages" && (
        <PackagesTab paBalance={paBalance} onPurchased={() => router.refresh()} />
      )}

      {activeTab === "premium" && (
        <PremiumTab
          isPremium={subscription.isPremium}
          onSwitchToMyPlan={() => handleTabChange("meu-plano")}
        />
      )}

      {activeTab === "meu-plano" && (
        <MyPlanTab
          subscription={subscription}
          paBalance={paBalance}
          onSwitchToPremium={() => handleTabChange("premium")}
        />
      )}
    </div>
  );
}

// ─── TabButton ──────────────────────────────────────────────────────────────

function TabButton({
  id,
  active,
  onClick,
  label,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`loja-tab-${id}`}
      aria-selected={active}
      aria-controls={`loja-panel-${id}`}
      onClick={onClick}
      className={`min-h-[44px] rounded-t-lg px-4 py-3 text-sm font-atlas-body font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring ${
        active
          ? "border-b-2 border-[#D4AF37] text-atlas-primary"
          : "text-atlas-on-surface-variant hover:text-atlas-primary"
      }`}
    >
      {label}
    </button>
  );
}

// ─── PackagesTab ────────────────────────────────────────────────────────────

function PackagesTab({
  paBalance,
  onPurchased,
}: {
  paBalance: number;
  onPurchased: () => void;
}) {
  const t = useTranslations("loja.packages");
  const tPkg = useTranslations("gamification.packages");
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleBuy = useCallback(
    (packageId: string) => {
      setSelected(packageId);
      setFeedback(null);
      startTransition(async () => {
        const result = await purchasePAAction(packageId);
        if (result.success) {
          setFeedback(t("purchaseSuccess"));
          onPurchased();
        } else {
          setFeedback(t("purchaseError"));
        }
        setSelected(null);
      });
    },
    [onPurchased, t]
  );

  return (
    <section
      id="loja-panel-packages"
      role="tabpanel"
      aria-labelledby="loja-tab-packages"
      className="focus-visible:outline-none"
    >
      <div className="mb-6 rounded-xl border border-atlas-outline-variant/30 bg-atlas-surface-container-low p-4">
        <p className="text-sm text-atlas-on-surface-variant">{t("currentBalance")}</p>
        <p className="text-2xl font-bold text-atlas-primary" data-testid="pa-balance">
          {paBalance.toLocaleString("pt-BR")} PA
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-atlas-outline-variant/30 bg-atlas-surface-container-low p-3 text-sm text-atlas-primary"
        >
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PA_PACKAGES_CLIENT.map((pkg) => {
          const ratio = (pkg.pa / (pkg.amountCents / 100)).toFixed(1);
          const isBuying = pending && selected === pkg.id;
          return (
            <article
              key={pkg.id}
              className={`relative flex flex-col rounded-xl border-2 p-5 ${
                pkg.highlight
                  ? "border-[#D4AF37] bg-[#FFF8E1]/40"
                  : "border-atlas-outline-variant/30 bg-atlas-surface-container-lowest"
              }`}
            >
              {pkg.highlight && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4AF37] px-3 py-0.5 text-xs font-bold text-[#1A3C5E]"
                  aria-label={t("recommendedBadgeAria")}
                >
                  {t("recommendedBadge")}
                </span>
              )}
              <h3 className="font-atlas-headline text-lg font-bold text-atlas-primary">
                {tPkg(pkg.id)}
              </h3>
              <p className="mt-2 text-3xl font-extrabold text-atlas-primary">
                {pkg.pa.toLocaleString("pt-BR")}
                <span className="ml-1 text-base font-normal text-atlas-on-surface-variant">
                  PA
                </span>
              </p>
              <p className="mt-1 text-xl font-semibold text-atlas-primary">
                {formatBRL(pkg.amountCents)}
              </p>
              <p className="mt-1 text-xs text-atlas-on-surface-variant">
                {ratio} PA / R$
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleBuy(pkg.id)}
                className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#D4AF37] px-4 py-2.5 text-sm font-bold text-[#1A3C5E] transition-colors hover:bg-[#C29E2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                aria-label={t("buyAria", { name: tPkg(pkg.id) })}
              >
                {isBuying ? t("buying") : t("buy")}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ─── PremiumTab ─────────────────────────────────────────────────────────────

function PremiumTab({
  isPremium,
  onSwitchToMyPlan,
}: {
  isPremium: boolean;
  onSwitchToMyPlan: () => void;
}) {
  const t = useTranslations("premium");
  const router = useRouter();
  const [plan, setPlan] = useState<PremiumPlan>("PREMIUM_ANNUAL");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const priceCents = plan === "PREMIUM_ANNUAL" ? ANNUAL_PRICE_CENTS : MONTHLY_PRICE_CENTS;
  const perMonthCents =
    plan === "PREMIUM_ANNUAL" ? MONTHLY_EQUIVALENT_CENTS_OF_ANNUAL : MONTHLY_PRICE_CENTS;

  const handleStartTrial = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await startTrialAction(plan);
      if (result.success) {
        router.push("/loja?tab=meu-plano&status=success");
      } else {
        setError(
          result.error === "subscription.trialAlreadyUsed"
            ? t("trial.alreadyUsed")
            : t("trial.error")
        );
      }
    });
  }, [plan, router, t]);

  const handleStayFree = useCallback(() => {
    router.push("/expeditions");
  }, [router]);

  if (isPremium) {
    return (
      <section
        id="loja-panel-premium"
        role="tabpanel"
        aria-labelledby="loja-tab-premium"
        className="rounded-xl border border-atlas-outline-variant/30 bg-atlas-surface-container-low p-6 text-center"
      >
        <p className="text-atlas-primary">{t("alreadyPremium")}</p>
        <button
          type="button"
          onClick={onSwitchToMyPlan}
          className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#1A3C5E] hover:bg-[#C29E2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
        >
          {t("goToMyPlan")}
        </button>
      </section>
    );
  }

  return (
    <section
      id="loja-panel-premium"
      role="tabpanel"
      aria-labelledby="loja-tab-premium"
      className="space-y-8"
    >
      {/* Billing toggle */}
      <div
        role="radiogroup"
        aria-label={t("billingToggleLabel")}
        className="mx-auto flex w-full max-w-sm rounded-full border border-atlas-outline-variant/30 bg-atlas-surface-container-low p-1"
      >
        <button
          type="button"
          role="radio"
          aria-checked={plan === "PREMIUM_MONTHLY"}
          onClick={() => setPlan("PREMIUM_MONTHLY")}
          className={`min-h-[44px] flex-1 rounded-full px-4 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring ${
            plan === "PREMIUM_MONTHLY"
              ? "bg-[#D4AF37] text-[#1A3C5E]"
              : "text-atlas-on-surface-variant"
          }`}
        >
          {t("toggleMonthly")}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={plan === "PREMIUM_ANNUAL"}
          onClick={() => setPlan("PREMIUM_ANNUAL")}
          className={`min-h-[44px] flex-1 rounded-full px-4 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring ${
            plan === "PREMIUM_ANNUAL"
              ? "bg-[#D4AF37] text-[#1A3C5E]"
              : "text-atlas-on-surface-variant"
          }`}
        >
          {t("toggleAnnual")}{" "}
          <span className="ml-1 rounded-full bg-[#2DB8A0] px-2 py-0.5 text-[10px] font-bold text-white">
            {t("annualSavings", { percent: ANNUAL_SAVINGS_PERCENT })}
          </span>
        </button>
      </div>

      {/* Plan card */}
      <div className="mx-auto max-w-md rounded-2xl border-2 border-[#D4AF37] bg-[#FFF8E1]/30 p-8 text-center shadow-sm">
        <h2 className="font-atlas-headline text-xl font-bold uppercase tracking-wide text-atlas-primary">
          {t("planName")}
        </h2>
        <p className="mt-4 text-4xl font-extrabold text-atlas-primary">
          {formatBRL(priceCents)}
          <span className="ml-1 text-base font-normal text-atlas-on-surface-variant">
            / {plan === "PREMIUM_ANNUAL" ? t("yearShort") : t("monthShort")}
          </span>
        </p>
        {plan === "PREMIUM_ANNUAL" && (
          <p className="mt-1 text-sm text-atlas-on-surface-variant">
            {t("equivalentMonthly", { value: formatBRL(perMonthCents) })}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={handleStartTrial}
          className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#D4AF37] px-4 py-3 text-sm font-bold text-[#1A3C5E] transition-colors hover:bg-[#C29E2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
        >
          {pending ? t("trial.starting") : t("trial.start")}
        </button>
        <p className="mt-3 text-xs text-atlas-on-surface-variant">
          {t("trial.disclaimer")}
        </p>
      </div>

      {/* Comparison table */}
      <ComparisonTable />

      {/* Always-visible stay-free CTA */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleStayFree}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-atlas-outline-variant px-6 py-3 text-sm font-semibold text-atlas-on-surface-variant hover:bg-atlas-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring motion-reduce:transition-none"
        >
          {t("stayFree")}
        </button>
      </div>
    </section>
  );
}

// ─── ComparisonTable ────────────────────────────────────────────────────────

function ComparisonTable() {
  const t = useTranslations("premium.comparison");
  const rows: Array<{ key: string; free: string; premium: string; premiumOnly?: boolean }> = [
    { key: "destinations", free: "1", premium: "4", premiumOnly: true },
    { key: "activeExpeditions", free: "3", premium: t("unlimited") },
    { key: "monthlyPA", free: "—", premium: "1.500", premiumOnly: true },
    { key: "regen", free: t("limited"), premium: t("priority") },
    { key: "sonnet", free: "—", premium: t("optIn"), premiumOnly: true },
    { key: "support", free: t("community"), premium: t("email") },
    { key: "badges", free: t("standard"), premium: t("exclusive") },
    { key: "discounts", free: "—", premium: t("partnerDiscounts"), premiumOnly: true },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse overflow-hidden rounded-xl border border-atlas-outline-variant/30 text-sm">
        <caption className="sr-only">{t("caption")}</caption>
        <thead>
          <tr className="bg-atlas-surface-container-low">
            <th scope="col" className="p-3 text-left font-semibold text-atlas-primary">
              {t("headers.feature")}
            </th>
            <th scope="col" className="p-3 text-center font-semibold text-atlas-on-surface-variant">
              {t("headers.free")}
            </th>
            <th scope="col" className="p-3 text-center font-semibold text-atlas-primary">
              {t("headers.premium")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.key}
              className={idx % 2 === 0 ? "bg-atlas-surface-container-lowest" : ""}
            >
              <th scope="row" className="p-3 text-left font-medium text-atlas-primary">
                {t(`rows.${row.key}`)}
              </th>
              <td className="p-3 text-center text-atlas-on-surface-variant">{row.free}</td>
              <td
                className={`p-3 text-center font-semibold text-atlas-primary ${
                  row.premiumOnly ? "bg-[#FFF8E1]/50" : ""
                }`}
              >
                {row.premium}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MyPlanTab ──────────────────────────────────────────────────────────────

function MyPlanTab({
  subscription,
  paBalance,
  onSwitchToPremium,
}: {
  subscription: SubscriptionSnapshot;
  paBalance: number;
  onSwitchToPremium: () => void;
}) {
  const t = useTranslations("premium.myPlan");
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await cancelSubscriptionAction();
      if (result.success) {
        setConfirmOpen(false);
        router.refresh();
      } else {
        setError(t("cancelError"));
      }
    });
  }, [router, t]);

  if (!subscription.isPremium) {
    return (
      <section
        id="loja-panel-meu-plano"
        role="tabpanel"
        aria-labelledby="loja-tab-meu-plano"
        className="rounded-xl border border-atlas-outline-variant/30 bg-atlas-surface-container-low p-8 text-center"
      >
        <p className="mb-4 text-atlas-primary">{t("emptyState")}</p>
        <button
          type="button"
          onClick={onSwitchToPremium}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#D4AF37] px-6 py-3 text-sm font-bold text-[#1A3C5E] hover:bg-[#C29E2E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
        >
          {t("seePremium")}
        </button>
      </section>
    );
  }

  const locale =
    typeof window !== "undefined" ? window.navigator.language : "pt-BR";

  const planLabelKey =
    subscription.plan === "PREMIUM_ANNUAL" ? "planAnnual" : "planMonthly";
  const statusLabelKey = `status.${subscription.status.toLowerCase()}`;

  return (
    <section
      id="loja-panel-meu-plano"
      role="tabpanel"
      aria-labelledby="loja-tab-meu-plano"
      className="space-y-6"
    >
      <div className="rounded-xl border border-[#D4AF37] bg-[#FFF8E1]/30 p-6">
        <h2 className="font-atlas-headline text-xl font-bold text-atlas-primary">
          {t(planLabelKey)}
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-atlas-on-surface-variant">
              {t("statusLabel")}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-atlas-primary">
              {t(statusLabelKey)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-atlas-on-surface-variant">
              {t("nextRenewal")}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-atlas-primary">
              {formatDate(subscription.currentPeriodEnd, locale)}
            </dd>
          </div>
          {subscription.trialEndsAt && subscription.status === "TRIALING" && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-atlas-on-surface-variant">
                {t("trialEnds")}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-atlas-primary">
                {formatDate(subscription.trialEndsAt, locale)}
              </dd>
            </div>
          )}
          {subscription.cancelAtPeriodEnd && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-atlas-on-surface-variant">
                {t("cancellationLabel")}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-orange-700">
                {t("cancelScheduled")}
              </dd>
            </div>
          )}
        </dl>

        {!subscription.cancelAtPeriodEnd && (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-atlas-outline-variant px-4 py-2 text-sm font-semibold text-atlas-on-surface-variant hover:bg-atlas-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
          >
            {t("cancelCta")}
          </button>
        )}
      </div>

      {/* PA allowance */}
      <div className="rounded-xl border border-atlas-outline-variant/30 bg-atlas-surface-container-lowest p-6">
        <h3 className="font-atlas-headline text-base font-bold text-atlas-primary">
          {t("paAllowance")}
        </h3>
        <p className="mt-2 text-3xl font-extrabold text-atlas-primary">
          {paBalance.toLocaleString("pt-BR")}
          <span className="ml-1 text-sm font-normal text-atlas-on-surface-variant">
            / 1.500 PA
          </span>
        </p>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-atlas-outline-variant/20"
          role="progressbar"
          aria-valuenow={Math.min(paBalance, 1500)}
          aria-valuemin={0}
          aria-valuemax={1500}
          aria-label={t("paAllowance")}
        >
          <div
            className="h-full bg-[#D4AF37]"
            style={{ width: `${Math.min((paBalance / 1500) * 100, 100)}%` }}
          />
        </div>
      </div>

      {confirmOpen && (
        <CancelConfirmDialog
          pending={pending}
          error={error}
          onConfirm={handleCancel}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </section>
  );
}

// ─── CancelConfirmDialog ────────────────────────────────────────────────────

function CancelConfirmDialog({
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("premium.myPlan.cancelDialog");
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="cancel-dialog-title" className="text-lg font-bold text-atlas-primary">
          {t("title")}
        </h3>
        <p className="mt-3 text-sm text-atlas-on-surface-variant">{t("body")}</p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-atlas-outline-variant px-4 py-2 text-sm font-semibold text-atlas-on-surface-variant hover:bg-atlas-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-focus-ring"
          >
            {t("keepPlan")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? t("canceling") : t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ConfettiOverlay ────────────────────────────────────────────────────────

function ConfettiOverlay({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center"
    >
      <div className="flex items-center gap-3 rounded-full bg-[#2DB8A0] px-6 py-3 text-sm font-bold text-white shadow-lg">
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={3}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {message}
        {/* CSS-only confetti particles, hidden under prefers-reduced-motion */}
        <span className="loja-confetti" aria-hidden="true">
          <span className="loja-confetti-piece" />
          <span className="loja-confetti-piece" />
          <span className="loja-confetti-piece" />
          <span className="loja-confetti-piece" />
          <span className="loja-confetti-piece" />
          <span className="loja-confetti-piece" />
          <span className="loja-confetti-piece" />
          <span className="loja-confetti-piece" />
        </span>
      </div>
    </div>
  );
}
