"use client";

import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PrioritizedPOI } from "../lib/types";

interface POIListProps {
  pois: PrioritizedPOI[];
}

const riskColors = {
  low: "text-emerald-400 border-emerald-400/30",
  medium: "text-amber-400 border-amber-400/30",
  high: "text-red-400 border-red-400/30",
};

export function POIList({ pois }: POIListProps) {
  if (pois.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <MapPin className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Points of Interest</h3>
          <p className="text-xs text-muted-foreground">
            Top {pois.length} locations to visit
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {pois.map((poi, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{poi.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {poi.lootExpectation}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn("text-[10px] shrink-0 ml-2", riskColors[poi.riskLevel])}
            >
              {poi.riskLevel}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
