import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PointsEngine } from "@/lib/engines/points-engine";
import { PurchasePageClient } from "./PurchasePageClient";
import { PurchaseHistory } from "@/components/features/gamification/PurchaseHistory";

export default async function PurchasePAPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const t = await getTranslations("gamification.purchase");
  const balance = await PointsEngine.getBalance(session.user.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">{t("title")}</h1>
      <p className="mb-8 text-muted-foreground">{t("subtitle")}</p>

      <Suspense>
        <PurchasePageClient
          currentBalance={balance.availablePoints}
          userId={session.user.id}
        />
      </Suspense>

      <div className="mt-10">
        <PurchaseHistory />
      </div>
    </main>
  );
}
