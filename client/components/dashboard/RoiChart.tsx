"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RecentRoi } from "@/lib/types";

interface RoiChartProps {
  recentRoi: RecentRoi[];
}

export default function RoiChart({ recentRoi }: RoiChartProps) {
  const chartData = [...recentRoi]
    .reverse()
    .map((entry) => ({
      date: new Date(entry.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      amount: entry.amount,
      plan: entry.investment?.plan ?? "N/A",
    }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Daily ROI History
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Last {recentRoi.length} ROI payments
        </p>
      </div>
      <div className="p-6">
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-zinc-400">No ROI history yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="date" fontSize={12} stroke="#a1a1aa" />
              <YAxis fontSize={12} stroke="#a1a1aa" tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  color: "#f4f4f5",
                }}
                formatter={(value) => [
                  `$${Number(value).toFixed(2)}`,
                  "ROI",
                ]}
              />
              <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
