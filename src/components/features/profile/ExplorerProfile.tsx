"use client";

import { useTranslations } from "next-intl";
import { RankBadge } from "@/components/features/gamification/RankBadge";
import { PointsDisplay } from "@/components/features/gamification/PointsDisplay";
import { TransactionList } from "./TransactionList";
import { PassportStamps } from "./PassportStamps";
import { ProfileAccordion } from "./ProfileAccordion";
import type { Rank, BadgeKey } from "@/types/gamification.types";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: Date | string;
}

interface ProfileData {
  birthDate: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  nationalId: string | null;
  bio: string | null;
  dietaryRestrictions: string | null;
  accessibility: string | null;
  completionScore: number;
}

interface ExplorerProfileProps {
  rank: Rank;
  totalPoints: number;
  availablePoints: number;
  streakDays: number;
  earnedBadges: BadgeKey[];
  transactions: Transaction[];
  profile: ProfileData;
}

export function ExplorerProfile({
  rank,
  totalPoints,
  availablePoints,
  streakDays,
  earnedBadges,
  transactions,
  profile,
}: ExplorerProfileProps) {
  const t = useTranslations("profile");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      {/* Rank + Points summary */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <RankBadge rank={rank} size="lg" />
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">{t("totalPoints")}</span>
          <PointsDisplay points={totalPoints} size="lg" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">{t("availablePoints")}</span>
          <PointsDisplay points={availablePoints} />
        </div>
        {streakDays > 0 && (
          <span className="rounded-full bg-atlas-gold/15 px-3 py-1 text-sm font-medium text-atlas-gold">
            🔥 {t("streak", { days: streakDays })}
          </span>
        )}
      </div>

      {/* Profile completion */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {t("profileSection")}
        </h2>
        <ProfileAccordion profile={profile} />
      </section>

      {/* Passport stamps */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {t("badges.title")}
        </h2>
        <PassportStamps earnedBadges={earnedBadges} />
      </section>

      {/* Transaction history */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {t("transactions.title")}
        </h2>
        <TransactionList transactions={transactions} />
      </section>
    </div>
  );
}
