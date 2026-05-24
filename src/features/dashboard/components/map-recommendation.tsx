"use client";

import { Map as MapIcon, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MapRecommendation } from "../lib/types";
import type { TeamImpact } from "../lib/engine";

interface MapRecommendationCardProps {
  map: MapRecommendation;
  teamImpact: TeamImpact[];
}

function formatDuration(min: number | null | undefined): string | null {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function MapRecommendationCard({ map, teamImpact }: MapRecommendationCardProps) {
  const duration = formatDuration(map.raidDurationMin);

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-5 pb-3 flex items-center justify-between">
        <h3 className="text-telemetry text-muted-foreground">Map Protocol</h3>
      </div>

      <div className="p-5 pt-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
            <MapIcon className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-tight">
              {map.mapName}
            </p>
            {duration && (
              <p className="text-telemetry text-muted-foreground mt-0.5">
                TIME: {duration}
              </p>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {map.reasoning}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {map.questObjectiveCount} quest objective
            {map.questObjectiveCount !== 1 ? "s" : ""}
          </Badge>
          {teamImpact.length > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] text-primary border-primary/30 bg-primary/10"
            >
              <Users className="size-3 mr-1" />
              {teamImpact.length} teammate
              {teamImpact.length !== 1 ? "s" : ""} benefit
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
