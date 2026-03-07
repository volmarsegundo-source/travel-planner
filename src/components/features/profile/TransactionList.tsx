"use client";

import { useTranslations } from "next-intl";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: Date | string;
}

interface TransactionListProps {
  transactions: Transaction[];
}

const TYPE_KEY_MAP: Record<string, string> = {
  phase_complete: "phaseComplete",
  ai_usage: "aiUsage",
  daily_login: "dailyLogin",
  purchase: "purchase",
  referral: "referral",
  checklist: "checklist",
};

export function TransactionList({ transactions }: TransactionListProps) {
  const t = useTranslations("profile.transactions");

  if (transactions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground/70">{t("empty")}</p>
    );
  }

  return (
    <ul className="divide-y divide-border/50">
      {transactions.map((tx) => {
        const typeKey = TYPE_KEY_MAP[tx.type] ?? tx.type;
        const isPositive = tx.amount > 0;
        const date = new Date(tx.createdAt);

        return (
          <li key={tx.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {t(typeKey)}
              </p>
              <p className="text-xs text-muted-foreground">
                {date.toLocaleDateString()}
              </p>
            </div>
            <span
              className={`text-sm font-semibold ${
                isPositive ? "text-atlas-teal-light" : "text-destructive"
              }`}
            >
              {isPositive ? "+" : ""}
              {tx.amount}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
