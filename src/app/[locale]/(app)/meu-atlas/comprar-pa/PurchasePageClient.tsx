"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { purchasePAAction } from "@/server/actions/purchase.actions";

// ─── Package Data (client-safe subset) ──────────────────────────────────────

const PACKAGES = [
  { id: "explorador", pa: 500, amountCents: 1490, popular: false, bestValue: false },
  { id: "navegador", pa: 1200, amountCents: 2990, popular: true, bestValue: false },
  { id: "cartografo", pa: 2800, amountCents: 5990, popular: false, bestValue: false },
  { id: "embaixador", pa: 6000, amountCents: 11990, popular: false, bestValue: true },
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

interface PurchasePageClientProps {
  currentBalance: number;
  userId: string;
}

type PurchaseState = "idle" | "confirming" | "processing" | "success" | "error";

// ─── Component ──────────────────────────────────────────────────────────────

export function PurchasePageClient({
  currentBalance,
}: PurchasePageClientProps) {
  const t = useTranslations("gamification.purchase");
  const tPkg = useTranslations("gamification.packages");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<PurchaseState>("idle");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedPkg = PACKAGES.find((p) => p.id === selectedPackage);

  // Parse contextual query params from insufficient balance redirect
  const neededPA = searchParams.get("needed")
    ? parseInt(searchParams.get("needed")!, 10)
    : null;
  const featureContext = searchParams.get("feature");

  // Find cheapest package that covers the needed PA
  const recommendedPackageId = useMemo(() => {
    if (!neededPA || isNaN(neededPA) || neededPA <= 0) return null;
    const deficit = neededPA - currentBalance;
    if (deficit <= 0) return null;
    const covering = PACKAGES.filter((p) => p.pa >= deficit);
    if (covering.length === 0) return PACKAGES[PACKAGES.length - 1].id;
    return covering.reduce((cheapest, pkg) =>
      pkg.amountCents < cheapest.amountCents ? pkg : cheapest
    ).id;
  }, [neededPA, currentBalance]);

  const handleSelectPackage = useCallback((pkgId: string) => {
    setSelectedPackage(pkgId);
    setState("confirming");
    setErrorMessage(null);
  }, []);

  const handleConfirmPurchase = useCallback(async () => {
    if (!selectedPackage) return;

    setState("processing");
    try {
      const result = await purchasePAAction(selectedPackage);
      if (result.success && result.data) {
        setNewBalance(result.data.newBalance);
        setState("success");
        // Refresh server data so header PA badge updates
        router.refresh();
      } else {
        const errorKey = !result.success ? result.error : undefined;
        if (errorKey === "gamification.purchase.rateLimited") {
          setErrorMessage(t("rateLimited"));
        } else {
          setErrorMessage(t("paymentFailed"));
        }
        setState("error");
      }
    } catch {
      setErrorMessage(t("error"));
      setState("error");
    }
  }, [selectedPackage, t, router]);

  const handleClose = useCallback(() => {
    setState("idle");
    setSelectedPackage(null);
    setErrorMessage(null);
  }, []);

  const handleBackToExpeditions = useCallback(() => {
    router.push("/expeditions");
  }, [router]);

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const getRatio = (pa: number, cents: number) => {
    return (pa / (cents / 100)).toFixed(1);
  };

  return (
    <div>
      {/* Current balance */}
      <div className="mb-6 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">{t("currentBalance")}</p>
        <p className="text-2xl font-bold" data-testid="current-balance">
          {currentBalance.toLocaleString()} PA
        </p>
      </div>

      {/* Contextual banner when redirected from insufficient balance */}
      {neededPA && neededPA > 0 && (
        <div
          className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30"
          data-testid="needed-context-banner"
        >
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {featureContext
              ? t("neededForFeature", { amount: neededPA, feature: featureContext })
              : t("neededGeneric", { amount: neededPA })}
          </p>
        </div>
      )}

      {/* Package grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PACKAGES.map((pkg) => {
          const isRecommended = pkg.id === recommendedPackageId;
          return (
            <div
              key={pkg.id}
              data-testid={`package-card-${pkg.id}`}
              className={`relative flex flex-col rounded-xl border p-5 transition-all ${
                isRecommended
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : pkg.popular
                    ? "border-atlas-gold ring-2 ring-atlas-gold/20"
                    : "border-border"
              }`}
            >
              {/* Badges */}
              {isRecommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white">
                  {t("recommended")}
                </span>
              )}
              {!isRecommended && pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-atlas-gold px-3 py-0.5 text-xs font-bold text-white">
                  {t("mostPopular")}
                </span>
              )}
              {!isRecommended && pkg.bestValue && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white">
                  {t("bestValue")}
                </span>
              )}

              <h3 className="text-lg font-bold">{tPkg(pkg.id)}</h3>
              <p className="mt-1 text-3xl font-extrabold">
                {pkg.pa.toLocaleString()}
                <span className="ml-1 text-base font-normal text-muted-foreground">
                  PA
                </span>
              </p>
              <p className="mt-1 text-xl font-semibold text-foreground">
                {formatPrice(pkg.amountCents)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {getRatio(pkg.pa, pkg.amountCents)} PA/R$
              </p>

              <button
                onClick={() => handleSelectPackage(pkg.id)}
                disabled={state === "processing"}
                className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isRecommended
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : pkg.popular
                      ? "bg-atlas-gold text-white hover:bg-atlas-gold/90"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                } disabled:cursor-not-allowed disabled:opacity-50`}
                aria-label={t("buyPackage", { name: tPkg(pkg.id), pa: pkg.pa })}
              >
                {t("buy")}
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {state === "confirming" && selectedPkg && (
        <ConfirmModal
          packageName={tPkg(selectedPkg.id)}
          pa={selectedPkg.pa}
          price={formatPrice(selectedPkg.amountCents)}
          onConfirm={handleConfirmPurchase}
          onCancel={handleClose}
          confirmLabel={t("confirmPurchase")}
          cancelLabel={t("cancel")}
        />
      )}

      {/* Processing */}
      {state === "processing" && (
        <ModalOverlay>
          <div className="rounded-xl bg-background p-6 text-center shadow-xl">
            <div
              className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-atlas-gold border-t-transparent"
              role="status"
              aria-label={t("processing")}
            />
            <p className="font-medium">{t("processing")}</p>
          </div>
        </ModalOverlay>
      )}

      {/* Success */}
      {state === "success" && newBalance !== null && (
        <ModalOverlay>
          <div className="w-80 max-w-[calc(100vw-3rem)] rounded-xl bg-background p-6 text-center shadow-xl">
            <span className="mb-2 inline-block text-4xl" aria-hidden="true">
              {"\u{2705}"}
            </span>
            <h3 className="text-lg font-bold">{t("successTitle")}</h3>
            <p className="mt-2 text-muted-foreground">
              {t("successMessage", { balance: newBalance.toLocaleString() })}
            </p>
            <button
              onClick={handleBackToExpeditions}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("backToExpeditions")}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Error */}
      {state === "error" && (
        <ModalOverlay>
          <div className="w-80 max-w-[calc(100vw-3rem)] rounded-xl bg-background p-6 text-center shadow-xl">
            <span className="mb-2 inline-block text-4xl" aria-hidden="true">
              {"\u{274C}"}
            </span>
            <h3 className="text-lg font-bold">{t("errorTitle")}</h3>
            <p className="mt-2 text-muted-foreground">{errorMessage}</p>
            <button
              onClick={handleClose}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("tryAgain")}
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ─── Confirm Modal ──────────────────────────────────────────────────────────

function ConfirmModal({
  packageName,
  pa,
  price,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
}: {
  packageName: string;
  pa: number;
  price: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  cancelLabel: string;
}) {
  return (
    <ModalOverlay>
      <div
        className="w-80 max-w-[calc(100vw-3rem)] rounded-xl bg-background p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-purchase-title"
      >
        <h3 id="confirm-purchase-title" className="text-lg font-bold">
          {confirmLabel}
        </h3>
        <div className="mt-4 space-y-2">
          <p>
            <span className="font-medium">{packageName}</span>
          </p>
          <p className="text-2xl font-bold">
            {pa.toLocaleString()} PA
          </p>
          <p className="text-lg text-muted-foreground">{price}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-atlas-gold px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-atlas-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal Overlay ──────────────────────────────────────────────────────────

function ModalOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {children}
    </div>
  );
}
