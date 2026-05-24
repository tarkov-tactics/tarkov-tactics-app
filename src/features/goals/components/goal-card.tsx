"use client";

import { cn } from "@/lib/utils";
import type { GoalDefinition } from "../types";

interface GoalProgressBarProps {
  completed: number;
  total: number;
  className?: string;
}

export function GoalProgressBar({ completed, total, className }: GoalProgressBarProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-right">
        {completed} / {total} ({pct}%)
      </p>
    </div>
  );
}

interface GoalCardProps {
  goal: GoalDefinition;
  isActive: boolean;
  onSelect: () => void;
  progress?: { completed: number; total: number };
}

export function GoalCard({ goal, isActive, onSelect, progress }: GoalCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "rounded-lg border bg-card p-5 text-left transition-all duration-200 w-full",
        "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "active:translate-y-px",
        isActive
          ? "border-primary/50 shadow-md shadow-primary/10 ring-1 ring-primary/20"
          : "border-border hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" role="img" aria-label={goal.name}>
          {goal.icon}
        </span>
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className={cn(
            "font-semibold text-sm",
            isActive && "text-primary"
          )}>
            {goal.name}
          </h3>
          <p className="text-xs text-muted-foreground">{goal.description}</p>
        </div>
      </div>

      {progress && (
        <GoalProgressBar
          completed={progress.completed}
          total={progress.total}
          className="mt-3"
        />
      )}

      {!progress && (
        <div className="mt-3 h-2 rounded-full bg-muted" />
      )}
    </button>
  );
}
