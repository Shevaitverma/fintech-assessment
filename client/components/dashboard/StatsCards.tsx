"use client";

import type { DashboardSummary } from "@/lib/types";

interface StatsCardsProps {
  summary: DashboardSummary;
}

const fmt = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

const cards = [
  {
    label: "Wallet Balance",
    key: "walletBalance" as const,
    format: fmt,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    label: "Total Invested",
    key: "totalInvested" as const,
    format: fmt,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    label: "ROI Earned",
    key: "totalRoiEarned" as const,
    format: fmt,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  {
    label: "Referral Income",
    key: "totalReferralIncome" as const,
    format: fmt,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    label: "Total Income",
    key: "totalIncome" as const,
    format: fmt,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
];

export default function StatsCards({ summary }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.key}
          className={`rounded-xl border border-zinc-200 p-6 dark:border-zinc-800 ${card.bg}`}
        >
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {card.label}
          </p>
          <p className={`mt-1 text-2xl font-bold ${card.color}`}>
            {card.format(summary[card.key])}
          </p>
        </div>
      ))}
    </div>
  );
}
