"use client";

import { useState } from "react";
import type { ReferralNode, ReferralTreeData } from "@/lib/types";

interface ReferralTreeProps {
  data: ReferralTreeData;
}

function TreeNode({ node, depth = 0 }: { node: ReferralNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div className={depth > 0 ? "ml-6 border-l border-zinc-200 pl-4 dark:border-zinc-700" : ""}>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        role={hasChildren ? "button" : undefined}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <span className="flex h-5 w-5 items-center justify-center rounded text-xs text-zinc-500 dark:text-zinc-400">
            {expanded ? "▼" : "▶"}
          </span>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded text-xs text-zinc-300 dark:text-zinc-600">
            ●
          </span>
        )}
        <div className="flex-1">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {node.name}
          </span>
          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
            {node.email}
          </span>
        </div>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
          L{node.level}
        </span>
        <span className="text-xs text-zinc-400">
          {new Date(node.joinedAt).toLocaleDateString()}
        </span>
      </div>
      {expanded && hasChildren && (
        <div className="mt-1">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReferralTree({ data }: ReferralTreeProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Referral Tree
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {data.directReferrals} direct referral{data.directReferrals !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-800">
            <span className="text-zinc-500 dark:text-zinc-400">Your code: </span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {data.referralCode}
            </span>
          </div>
        </div>

        {/* Level summary bar */}
        {data.levelSummary.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {data.levelSummary.map((ls) => (
              <div
                key={ls.level}
                className="rounded-lg bg-zinc-50 px-3 py-1.5 text-xs dark:bg-zinc-800"
              >
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Level {ls.level}:
                </span>{" "}
                <span className="text-green-600 dark:text-green-400">
                  ${ls.totalIncome.toFixed(2)}
                </span>{" "}
                <span className="text-zinc-400">({ls.referralCount} payouts)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        {data.tree.length === 0 ? (
          <p className="py-8 text-center text-zinc-400">
            No referrals yet. Share your code to start earning!
          </p>
        ) : (
          data.tree.map((node) => <TreeNode key={node.id} node={node} />)
        )}
      </div>
    </div>
  );
}
