"use client";

import { cn } from "@/lib/utils";
import { GOALS, type GoalId } from "../types";
import type { GoalProgress } from "../hooks/use-goal-progress";

interface ProgressionSummaryProps {
  allGoalProgress: Map<GoalId, GoalProgress> | null;
  activeGoal: GoalId | null;
  onSelect: (id: GoalId) => void;
}

export function ProgressionSummary({
  allGoalProgress,
  activeGoal,
  onSelect,
}: ProgressionSummaryProps) {
  return (
    <section className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-4 border-b border-border">
        <h3 className="text-telemetry text-muted-foreground">
          Progression Summary
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {GOALS.map((goal) => {
          const p = allGoalProgress?.get(goal.id);
          const pct = p?.percentage ?? 0;
          const isActive = goal.id === activeGoal;

          return (
            <button
              key={goal.id}
              type="button"
              onClick={() => onSelect(goal.id)}
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
                  {goal.name}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono shrink-0",
                    isActive ? "text-primary font-bold" : "text-muted-foreground"
                  )}
                >
                  {pct}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    isActive ? "bg-primary" : "bg-primary/40"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
