"use client";

import type { TarkovTask } from "@/lib/api/tarkov-dev/types";
import type { ProgressData } from "@/lib/api/tarkov-tracker/types";

interface OpenQuestsPreviewProps {
  openTasks: TarkovTask[];
  completedTasks: TarkovTask[];
  playerProgress: ProgressData | null;
}

interface TraderChain {
  trader: string;
  total: number;
  completed: number;
  percentage: number;
}

function groupByTrader(
  open: TarkovTask[],
  done: TarkovTask[],
): TraderChain[] {
  const totals = new Map<string, { open: number; done: number }>();
  for (const t of open) {
    const cur = totals.get(t.trader.name) ?? { open: 0, done: 0 };
    cur.open += 1;
    totals.set(t.trader.name, cur);
  }
  for (const t of done) {
    const cur = totals.get(t.trader.name) ?? { open: 0, done: 0 };
    cur.done += 1;
    totals.set(t.trader.name, cur);
  }

  const chains: TraderChain[] = [];
  for (const [trader, { open, done }] of totals) {
    const total = open + done;
    if (total === 0) continue;
    chains.push({
      trader,
      total,
      completed: done,
      percentage: Math.round((done / total) * 100),
    });
  }
  // Highest in-progress chains first (>0% and <100%)
  chains.sort((a, b) => {
    const aActive = a.percentage > 0 && a.percentage < 100;
    const bActive = b.percentage > 0 && b.percentage < 100;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return b.percentage - a.percentage;
  });
  return chains;
}

export function OpenQuestsPreview({
  openTasks,
  completedTasks,
  playerProgress,
}: OpenQuestsPreviewProps) {
  const chains = groupByTrader(openTasks, completedTasks).slice(0, 3);

  return (
    <section className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-telemetry text-muted-foreground">Open Quests</h3>
        {playerProgress && (
          <span className="text-telemetry text-muted-foreground/70">
            ACTIVE DATA
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {chains.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Connect to view in-progress quest chains.
          </p>
        ) : (
          chains.map((chain) => (
            <div key={chain.trader} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium truncate">
                  {chain.trader}
                </span>
                <span className="text-[10px] font-mono text-primary font-bold shrink-0">
                  {chain.percentage}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${chain.percentage}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
