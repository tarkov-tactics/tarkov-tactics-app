"use client";

import { Circle, CheckCircle2 } from "lucide-react";
import type { TarkovTask } from "@/lib/api/tarkov-dev/types";
import type { ProgressData } from "@/lib/api/tarkov-tracker/types";

interface HardRequirementsListProps {
  openTasks: TarkovTask[];
  completedTasks: TarkovTask[];
  progress: ProgressData | null;
  limit?: number;
}

interface TaskRow {
  task: TarkovTask;
  complete: boolean;
  /** When the task has a single count objective with progress, surface it. */
  countProgress: { current: number; target: number } | null;
}

function buildRows(
  open: TarkovTask[],
  done: TarkovTask[],
  progress: ProgressData | null,
  limit: number,
): TaskRow[] {
  const rows: TaskRow[] = [];
  // Done tasks first (one), then open tasks
  for (const t of done.slice(0, 1)) {
    rows.push({ task: t, complete: true, countProgress: null });
  }
  for (const t of open) {
    if (rows.length >= limit) break;
    const countProgress = extractCountProgress(t, progress);
    rows.push({ task: t, complete: false, countProgress });
  }
  return rows;
}

function extractCountProgress(
  task: TarkovTask,
  progress: ProgressData | null,
): { current: number; target: number } | null {
  if (!progress) return null;
  // tarkov.dev `objectives[].id` corresponds to entries in taskObjectivesProgress
  for (const obj of task.objectives) {
    const match = progress.taskObjectivesProgress.find((p) => p.id === obj.id);
    if (match && typeof match.count === "number" && match.count > 0) {
      // Tarkov's objective description often contains the target as the first integer
      const m = obj.description.match(/\b(\d+)\b/);
      const target = m ? Number(m[1]) : 0;
      if (target > 0 && match.count < target) {
        return { current: match.count, target };
      }
    }
  }
  return null;
}

export function HardRequirementsList({
  openTasks,
  completedTasks,
  progress,
  limit = 5,
}: HardRequirementsListProps) {
  const rows = buildRows(openTasks, completedTasks, progress, limit);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-telemetry text-muted-foreground">Hard Requirements</h4>
        {openTasks.length > limit && (
          <span className="text-telemetry text-muted-foreground/70">
            +{openTasks.length - limit} more
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {rows.map(({ task, complete, countProgress }) => {
          const pct = countProgress
            ? Math.round((countProgress.current / countProgress.target) * 100)
            : complete
              ? 100
              : 0;
          return (
            <li
              key={task.id}
              className="rounded-md border border-border bg-background p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {complete ? (
                    <CheckCircle2
                      className="size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <span className="text-sm font-medium truncate">{task.name}</span>
                </div>
                <span
                  className={`text-[10px] font-mono shrink-0 tracking-wider ${
                    complete ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {complete
                    ? "COMPLETED"
                    : countProgress
                      ? `${countProgress.current}/${countProgress.target}`
                      : `${task.trader.name.toUpperCase()}${
                          task.minPlayerLevel > 1 ? ` · LVL ${task.minPlayerLevel}` : ""
                        }`}
                </span>
              </div>

              {(complete || countProgress) && (
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
