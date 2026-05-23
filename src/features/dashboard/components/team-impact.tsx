"use client";

import { Users } from "lucide-react";
import type { TeamImpact } from "../lib/engine";

interface TeamImpactPanelProps {
  teamImpact: TeamImpact[];
}

export function TeamImpactPanel({ teamImpact }: TeamImpactPanelProps) {
  if (teamImpact.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Team Impact</h3>
          <p className="text-xs text-muted-foreground">
            This raid also helps your squad
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {teamImpact.map((tm) => (
          <div
            key={tm.name}
            className="flex items-center gap-2 rounded-lg border border-primary/20 bg-background px-3 py-2"
          >
            <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {tm.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-xs">
              <span className="font-medium">{tm.name}</span>
              <span className="text-muted-foreground">
                {" "}· {tm.questCount} quest{tm.questCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
