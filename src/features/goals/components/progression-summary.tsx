"use client";

import { useMemo } from "react";
import { CircleDashed } from "lucide-react";
import type { GoalId } from "../types";
import type { GoalProgress } from "../hooks/use-goal-progress";

interface ProgressionSummaryProps {
  activeGoal: GoalId | null;
  activeGoalProgress: GoalProgress | null;
}

export function ProgressionSummary({
  activeGoal,
  activeGoalProgress,
}: ProgressionSummaryProps) {
  const percentage = activeGoalProgress?.percentage ?? 0;
  const completed = activeGoalProgress?.completed ?? 0;
  const total = activeGoalProgress?.total ?? 0;

  return (
    <section className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <CircleDashed className="size-4 text-muted-foreground" aria-hidden />
        <h3 className="text-telemetry text-muted-foreground">Progression Summary</h3>
      </div>

      <div className="p-4 space-y-3">
        {!activeGoal || !activeGoalProgress ? (
          <p className="text-xs text-muted-foreground">
            Select a directive to see progression.
          </p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-telemetry text-foreground/80">
                Overall
              </span>
              <span className="text-[10px] font-mono text-primary font-bold shrink-0">
                {completed}/{total} ({percentage}%)
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
