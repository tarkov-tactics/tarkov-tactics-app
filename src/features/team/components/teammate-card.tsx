"use client";

import { Shield, Crosshair, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProgressData } from "@/lib/api/tarkov-tracker/types";

interface TeammateCardProps {
  teammate: ProgressData;
  sharedTaskCount: number;
}

export function TeammateCard({ teammate, sharedTaskCount }: TeammateCardProps) {
  const totalTasks = teammate.tasksProgress.length;
  const completedTasks = teammate.tasksProgress.filter((t) => t.complete).length;
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            {teammate.displayName.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-medium text-sm truncate">
            {teammate.displayName}
          </span>
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">
          Lvl {teammate.playerLevel}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Crosshair className="size-3" />
          {teammate.pmcFaction}
        </span>
        <span className="flex items-center gap-1">
          <Shield className="size-3" />
          Ed. {teammate.gameEdition}
        </span>
        {sharedTaskCount > 0 && (
          <span className="flex items-center gap-1 text-primary">
            <Users className="size-3" />
            {sharedTaskCount} shared
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Tasks</span>
          <span>
            {completedTasks}/{totalTasks} ({pct}%)
          </span>
        </div>
      </div>
    </div>
  );
}
