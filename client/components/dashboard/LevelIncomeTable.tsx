"use client";

import type { LevelIncomeEntry, RecentReferral } from "@/lib/types";

interface LevelIncomeTableProps {
  levelIncome: LevelIncomeEntry[];
  recentReferrals: RecentReferral[];
}

export default function LevelIncomeTable({
  levelIncome,
  recentReferrals,
}: LevelIncomeTableProps) {
  const totalAmount = levelIncome.reduce((s, e) => s + e.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Level breakdown */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Level Income Breakdown
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Total: ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Level</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Payouts</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Total Earned</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {levelIncome.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-400">
                    No level income yet
                  </td>
                </tr>
              ) : (
                levelIncome.map((entry) => (
                  <tr key={entry.level} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-3">
                      <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                        Level {entry.level}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-300">
                      {entry.count}
                    </td>
                    <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      ${entry.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-300">
                      {totalAmount > 0
                        ? ((entry.totalAmount / totalAmount) * 100).toFixed(1)
                        : 0}
                      %
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent referral payouts */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Recent Referral Payouts
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">From</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Level</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Rate</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
                <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentReferrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">
                    No referral payouts yet
                  </td>
                </tr>
              ) : (
                recentReferrals.map((ref) => (
                  <tr key={ref._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-6 py-3 text-zinc-900 dark:text-zinc-100">
                      {ref.fromUser?.name ?? "Unknown"}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                        L{ref.level}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-300">
                      {ref.percentage}%
                    </td>
                    <td className="px-6 py-3 font-medium text-green-600 dark:text-green-400">
                      +${ref.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-zinc-600 dark:text-zinc-300">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
