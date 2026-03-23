"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getPurchaseHistoryAction } from "@/server/actions/purchase.actions";
import type { PurchaseHistoryItem } from "@/server/actions/purchase.actions";

// ─── Package name map (client-safe, no server-only import) ──────────────────

const PACKAGE_NAMES: Record<string, string> = {
  explorador: "gamification.packages.explorador",
  navegador: "gamification.packages.navegador",
  cartografo: "gamification.packages.cartografo",
  embaixador: "gamification.packages.embaixador",
};

// ─── Component ──────────────────────────────────────────────────────────────

export function PurchaseHistory() {
  const t = useTranslations("gamification.purchaseHistory");
  const tPkg = useTranslations("gamification.packages");

  const [purchases, setPurchases] = useState<PurchaseHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const result = await getPurchaseHistoryAction();
        if (cancelled) return;
        if (result.success && result.data) {
          setPurchases(result.data);
        } else {
          setError(t("loadError"));
        }
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadHistory();
    return () => { cancelled = true; };
  }, [t]);

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPackageName = (packageId: string): string => {
    if (packageId in PACKAGE_NAMES) {
      // Use the key suffix (explorador, navegador, etc.) directly with tPkg
      return tPkg(packageId as "explorador" | "navegador" | "cartografo" | "embaixador");
    }
    return packageId;
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-bold">{t("title")}</h3>
        <div className="flex items-center justify-center py-8">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-atlas-gold border-t-transparent"
            role="status"
            aria-label={t("loading")}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-bold">{t("title")}</h3>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6" data-testid="purchase-history">
      <h3 className="mb-4 text-lg font-bold">{t("title")}</h3>

      {purchases.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground" data-testid="purchase-history-empty">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">{t("date")}</th>
                <th className="pb-2 pr-4 font-medium">{t("package")}</th>
                <th className="pb-2 pr-4 text-right font-medium">{t("paAmount")}</th>
                <th className="pb-2 pr-4 text-right font-medium">{t("price")}</th>
                <th className="pb-2 font-medium">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} className="border-b last:border-0" data-testid={`purchase-row-${purchase.id}`}>
                  <td className="py-3 pr-4">{formatDate(purchase.createdAt)}</td>
                  <td className="py-3 pr-4 font-medium">
                    {getPackageName(purchase.packageId)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {purchase.paAmount.toLocaleString()} PA
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatPrice(purchase.amountCents)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        purchase.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t(`statuses.${purchase.status}`)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
