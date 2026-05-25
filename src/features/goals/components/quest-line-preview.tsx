"use client";

import { Circle, CheckCircle2 } from "lucide-react";
import type { TarkovTask } from "@/lib/api/tarkov-dev/types";
import { groupIntoQuestLines, sortQuestLinesByProgress } from "../lib/quest-lines";

interface QuestLinePreviewProps {
  openTasks: TarkovTask[];
  completedTasks: TarkovTask[];
  limit?: number;
}

export function QuestLinePreview({
  openTasks,
  completedTasks,
  limit = 5,
}: QuestLinePreviewProps) {
  const allLines = sortQuestLinesByProgress(
    groupIntoQuestLines(openTasks, completedTasks)
  );

  const inProgress = allLines.filter((l) => !l.isComplete);
  const completedCount = allLines.filter((l) => l.isComplete).length;
  const shown = inProgress.slice(0, limit);
  const remaining = inProgress.length - shown.length;

  if (shown.length === 0 && completedCount === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-telemetry text-muted-foreground">Quest Lines</h4>
        {remaining > 0 && (
          <span className="text-telemetry text-muted-foreground/70">
            +{remaining} more
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {shown.map((line) => {
          const pct = line.percentage;
          return (
            <li
              key={line.id}
              className="rounded-md border border-border bg-background p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Circle
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <span className="text-sm font-medium truncate">
                    {line.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono shrink-0 tracking-wider text-muted-foreground">
                  {line.completed}/{line.total}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {completedCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
          <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
          <span>{completedCount} completed quest line{completedCount !== 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}
