"use client";

import { cn } from "@/lib/utils";
import type { VibeIntelData } from "../lib/types";

interface QuickAnalysisCardProps {
  data: VibeIntelData;
}

function densityLabel(pct: number): string {
  if (pct >= 75) return "OPTIMAL";
  if (pct >= 45) return "MODERATE";
  return "LOW";
}

function survivalLabel(pct: number): string {
  if (pct >= 70) return "HIGH";
  if (pct >= 40) return "MEDIUM";
  return "LOW";
}

export function QuickAnalysisCard({ data }: QuickAnalysisCardProps) {
  if (data.kind !== "quick-analysis") {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">Intel not available.</p>
      </div>
    );
  }

  const { lootDensity, survivalProbability } = data;

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-4 pb-3 border-b border-border">
        <h3 className="text-telemetry text-muted-foreground">Quick Analysis</h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-telemetry text-muted-foreground">Loot Density</span>
            <span className="font-mono text-primary font-bold">
              {densityLabel(lootDensity)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full bg-primary transition-all duration-500")}
              style={{ width: `${lootDensity}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/70">Based on quest item density on this map</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-telemetry text-muted-foreground">Survival Prob.</span>
            <span
              className={cn(
                "font-mono font-bold",
                survivalProbability >= 70
                  ? "text-emerald"
                  : survivalProbability >= 40
                    ? "text-amber"
                    : "text-destructive"
              )}
            >
              {survivalLabel(survivalProbability)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all duration-500",
                survivalProbability >= 70
                  ? "bg-emerald"
                  : survivalProbability >= 40
                    ? "bg-amber"
                    : "bg-destructive"
              )}
              style={{ width: `${survivalProbability}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/70">Estimated from boss spawn rates and threat level</p>
        </div>
      </div>
    </div>
  );
}
