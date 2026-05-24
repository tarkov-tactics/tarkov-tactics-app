"use client";

import { useMemo } from "react";
import { CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GoalId } from "../types";
import type { GoalProgress } from "../hooks/use-goal-progress";
import {
  ALL_SCOPE,
  filterTasksByScope,
  getScopeOptions,
  type ScopeId,
} from "../lib/directive-scopes";

interface ProgressionSummaryProps {
  activeGoal: GoalId | null;
  activeGoalProgress: GoalProgress | null;
  currentScope: ScopeId;
  onScopeSelect: (scopeId: ScopeId) => void;
}

interface ScopeRow {
  id: ScopeId;
  label: string;
  percentage: number;
}

function buildRows(
  activeGoal: GoalId | null,
  activeGoalProgress: GoalProgress | null
): ScopeRow[] {
  if (!activeGoal || !activeGoalProgress) return [];

  const options = getScopeOptions(activeGoal).filter((o) => o.id !== ALL_SCOPE.id);

  // Single-scope goals (Lightkeeper today) — fall back to one "Overall" row.
  if (options.length === 0) {
    return [
      {
        id: ALL_SCOPE.id,
        label: "Overall",
        percentage: activeGoalProgress.percentage,
      },
    ];
  }

  return options.map((opt) => {
    const open = filterTasksByScope(activeGoal, opt.id, activeGoalProgress.openTasks);
    const done = filterTasksByScope(activeGoal, opt.id, activeGoalProgress.completedTasks);
    const total = open.length + done.length;
    const percentage = total > 0 ? Math.round((done.length / total) * 100) : 0;
    return { id: opt.id, label: opt.label, percentage };
  });
}

export function ProgressionSummary({
  activeGoal,
  activeGoalProgress,
  currentScope,
  onScopeSelect,
}: ProgressionSummaryProps) {
  const rows = useMemo(
    () => buildRows(activeGoal, activeGoalProgress),
    [activeGoal, activeGoalProgress]
  );

  return (
    <section className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <CircleDashed className="size-4 text-muted-foreground" aria-hidden />
        <h3 className="text-telemetry text-muted-foreground">Progression Summary</h3>
      </div>

      <div className="p-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Select a directive to see its sub-category breakdown.
          </p>
        ) : (
          rows.map((row) => {
            const isActive = currentScope === row.id;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => onScopeSelect(row.id)}
                className={cn(
                  "w-full text-left space-y-1.5 rounded-md p-2 -m-2 transition-colors",
                  "hover:bg-accent/40 active:translate-y-px",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "text-telemetry truncate",
                      isActive ? "text-primary" : "text-foreground/80"
                    )}
                  >
                    {row.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono shrink-0",
                      isActive ? "text-primary font-bold" : "text-muted-foreground"
                    )}
                  >
                    {row.percentage}%
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      isActive ? "bg-primary" : "bg-primary/40"
                    )}
                    style={{ width: `${row.percentage}%` }}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
