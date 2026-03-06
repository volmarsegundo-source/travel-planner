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
      <p className="py-6 text-center text-sm text-gray-400">{t("empty")}</p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {transactions.map((tx) => {
        const typeKey = TYPE_KEY_MAP[tx.type] ?? tx.type;
        const isPositive = tx.amount > 0;
        const date = new Date(tx.createdAt);

        return (
          <li key={tx.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {t(typeKey)}
              </p>
              <p className="text-xs text-gray-500">
                {date.toLocaleDateString()}
              </p>
            </div>
            <span
              className={`text-sm font-semibold ${
                isPositive ? "text-green-600" : "text-red-500"
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
