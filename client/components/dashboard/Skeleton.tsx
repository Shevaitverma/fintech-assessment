"use client";

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 h-6 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 flex-1 rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-20 rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-16 rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 h-6 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-64 rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  );
}

export function TreeSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 h-6 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="ml-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 w-48 rounded bg-zinc-100 dark:bg-zinc-800" />
            {i === 0 && (
              <div className="ml-6 mt-2 space-y-2">
                <div className="h-4 w-40 rounded bg-zinc-50 dark:bg-zinc-800/50" />
                <div className="h-4 w-36 rounded bg-zinc-50 dark:bg-zinc-800/50" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
