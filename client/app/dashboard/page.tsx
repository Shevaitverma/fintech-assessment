"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import api from "@/lib/api";
import type { DashboardData, ReferralTreeData } from "@/lib/types";

import StatsCards from "@/components/dashboard/StatsCards";
import InvestmentsTable from "@/components/dashboard/InvestmentsTable";
import RoiChart from "@/components/dashboard/RoiChart";
import LevelIncomeTable from "@/components/dashboard/LevelIncomeTable";
import ReferralTree from "@/components/dashboard/ReferralTree";
import CreateInvestmentForm from "@/components/dashboard/CreateInvestmentForm";
import {
  StatsCardsSkeleton,
  TableSkeleton,
  ChartSkeleton,
  TreeSkeleton,
} from "@/components/dashboard/Skeleton";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [referralTree, setReferralTree] = useState<ReferralTreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, treeRes] = await Promise.all([
        api.getDashboard(),
        api.getReferralTree(),
      ]);
      setDashboard(dashRes.data);
      setReferralTree(treeRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetchData();
  }, [user, authLoading, router, fetchData]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
            {error}
            <button
              onClick={() => window.location.reload()}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Stats Cards */}
          {loading ? (
            <StatsCardsSkeleton />
          ) : dashboard ? (
            <StatsCards summary={dashboard.summary} />
          ) : null}

          {/* Create investment */}
          {!loading && <CreateInvestmentForm onSuccess={fetchData} />}

          {/* Investments table + ROI chart */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {loading ? (
              <>
                <TableSkeleton rows={4} />
                <ChartSkeleton />
              </>
            ) : dashboard ? (
              <>
                <InvestmentsTable investments={dashboard.investments} />
                <RoiChart recentRoi={dashboard.recentRoi} />
              </>
            ) : null}
          </div>

          {/* Level income */}
          {loading ? (
            <TableSkeleton rows={3} />
          ) : dashboard ? (
            <LevelIncomeTable
              levelIncome={dashboard.levelIncome}
              recentReferrals={dashboard.recentReferrals}
            />
          ) : null}

          {/* Referral tree */}
          {loading ? (
            <TreeSkeleton />
          ) : referralTree ? (
            <ReferralTree data={referralTree} />
          ) : null}
        </div>
      </main>
    </div>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Welcome, {user?.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-800">
            <span className="text-zinc-500 dark:text-zinc-400">Referral: </span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {user?.referralCode}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
