"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { PrioritizedPOI } from "../lib/types";

interface POIListProps {
  pois: PrioritizedPOI[];
  variant?: "detailed" | "compact";
  sortMode?: "priority" | "boss-spawn-proximity";
}

const riskStyles = {
  low: {
    dot: "bg-emerald",
    badge: "text-emerald border-emerald/30 bg-emerald/10",
    label: "LOW RISK",
  },
  medium: {
    dot: "bg-amber",
    badge: "text-amber border-amber/30 bg-amber/10",
    label: "MED RISK",
  },
  high: {
    dot: "bg-destructive",
    badge: "text-destructive border-destructive/30 bg-destructive/10",
    label: "EXTREME RISK",
  },
} as const;

const RISK_RANK: Record<PrioritizedPOI["riskLevel"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function POIList({
  pois,
  variant = "detailed",
  sortMode = "priority",
}: POIListProps) {
  const ordered = useMemo(() => {
    if (sortMode !== "boss-spawn-proximity") return pois;
    // For Boss Rush: surface boss spawns first (high risk = boss POI here), then
    // descend by risk so the actual boss-spawn POIs always lead.
    return [...pois].sort((a, b) => RISK_RANK[a.riskLevel] - RISK_RANK[b.riskLevel]);
  }, [pois, sortMode]);

  const title = variant === "compact" ? "Points of Interest" : "High-Value Loot POIs";

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-5 pb-3 border-b border-border">
        <h3 className="text-telemetry text-muted-foreground">{title}</h3>
      </div>

      {ordered.length === 0 ? (
        <div className="p-5 text-sm text-muted-foreground">
          <p>
            No prioritized points of interest for the current map and vibe.
            Try a different vibe or refresh after picking up new quests.
          </p>
        </div>
      ) : variant === "compact" ? (
        <div className="p-4 space-y-2">
          {ordered.map((poi, i) => {
            const style = riskStyles[poi.riskLevel];
            return (
              <div
                key={`${poi.name}-${i}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("size-2 rounded-full shrink-0", style.dot)} aria-hidden />
                  <p className="text-xs font-medium leading-none truncate">{poi.name}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold font-mono whitespace-nowrap",
                    style.badge
                  )}
                >
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-5 space-y-3">
          {ordered.map((poi, i) => {
            const style = riskStyles[poi.riskLevel];
            return (
              <div
                key={`${poi.name}-${i}`}
                className="flex flex-col gap-1.5 rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn("size-2 rounded-full shrink-0", style.dot)}
                      aria-hidden
                    />
                    <p className="text-sm font-medium leading-none truncate">
                      {poi.name}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold font-mono whitespace-nowrap",
                      style.badge
                    )}
                  >
                    {style.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pl-4">
                  {poi.lootExpectation}
                </p>
                {poi.keyRequired && (
                  <p className="text-[10px] font-mono text-amber pl-4">
                    KEY: {poi.keyRequired}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
