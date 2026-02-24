"use client";

import type { Investment } from "@/lib/types";

interface InvestmentsTableProps {
  investments: Investment[];
}

const statusBadge: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  matured: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const planBadge: Record<string, string> = {
  basic: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  standard: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  premium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

export default function InvestmentsTable({ investments }: InvestmentsTableProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Investments
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {investments.length} total investment{investments.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Plan</th>
              <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
              <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Daily ROI</th>
              <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Start</th>
              <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">End</th>
              <th className="px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {investments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-400">
                  No investments yet
                </td>
              </tr>
            ) : (
              investments.map((inv) => (
                <tr key={inv._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${planBadge[inv.plan]}`}>
                      {inv.plan}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 text-zinc-600 dark:text-zinc-300">
                    {inv.dailyRoiRate}%
                  </td>
                  <td className="px-6 py-3 text-zinc-600 dark:text-zinc-300">
                    {new Date(inv.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-zinc-600 dark:text-zinc-300">
                    {new Date(inv.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadge[inv.status]}`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
