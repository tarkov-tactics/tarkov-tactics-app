"use client";

import type { TarkovTask } from "@/lib/api/tarkov-dev/types";
import type { ProgressData } from "@/lib/api/tarkov-tracker/types";
import { groupIntoQuestLines, getTopInProgressLines } from "../lib/quest-lines";

interface OpenQuestsPreviewProps {
  openTasks: TarkovTask[];
  completedTasks: TarkovTask[];
  playerProgress: ProgressData | null;
}

export function OpenQuestsPreview({
  openTasks,
  completedTasks,
  playerProgress,
}: OpenQuestsPreviewProps) {
  const isConnected = playerProgress !== null;

  const lines = getTopInProgressLines(
    groupIntoQuestLines(openTasks, completedTasks),
    3,
  );

  // When no quest-line series are detected but there are open tasks,
  // show individual open quests grouped by trader as a fallback.
  const showFallback = lines.length === 0 && openTasks.length > 0;
  const fallbackQuests = showFallback ? openTasks.slice(0, 3) : [];

  return (
    <section className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-telemetry text-muted-foreground">Open Quests</h3>
        {isConnected && (
          <span className="text-telemetry text-muted-foreground/70">
            ACTIVE DATA
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {!isConnected ? (
          <p className="text-xs text-muted-foreground">
            Connect to view in-progress quest chains.
          </p>
        ) : lines.length > 0 ? (
          lines.map((line) => (
            <div key={line.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium truncate">
                  {line.label}
                </span>
                <span className="text-[10px] font-mono text-primary font-bold shrink-0">
                  {line.completed}/{line.total}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${line.percentage}%` }}
                />
              </div>
            </div>
          ))
        ) : showFallback ? (
          fallbackQuests.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-3">
              <a
                href={task.wikiLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium truncate text-foreground hover:text-primary transition-colors"
              >
                {task.name}
              </a>
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                {task.trader.name}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">
            No more required quest chains for this directive.
          </p>
        )}
      </div>
    </section>
  );
}
