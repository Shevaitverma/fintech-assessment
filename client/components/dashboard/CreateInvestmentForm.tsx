"use client";

import { useState } from "react";
import api from "@/lib/api";

const PLANS = [
  { value: "basic", label: "Basic", roi: "0.5% daily", color: "border-zinc-300 dark:border-zinc-600" },
  { value: "standard", label: "Standard", roi: "1.0% daily", color: "border-indigo-400 dark:border-indigo-500" },
  { value: "premium", label: "Premium", roi: "1.5% daily", color: "border-amber-400 dark:border-amber-500" },
] as const;

interface CreateInvestmentFormProps {
  onSuccess: () => void;
}

export default function CreateInvestmentForm({ onSuccess }: CreateInvestmentFormProps) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<string>("basic");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) {
      setError("Amount must be at least $1");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await api.createInvestment(numAmount, plan);
      setAmount("");
      setPlan("basic");
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create investment");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        + New Investment
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Create Investment
        </h2>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Plan selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Select Plan
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PLANS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPlan(p.value)}
                className={`rounded-lg border-2 p-3 text-center transition-colors ${
                  plan === p.value
                    ? `${p.color} bg-zinc-50 dark:bg-zinc-800`
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {p.label}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{p.roi}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Amount input */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Amount ($)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="any"
            required
            placeholder="Enter amount"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {loading ? "Creating..." : "Create Investment"}
        </button>
      </form>
    </div>
  );
}
