"use client";

import { Map, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MapRecommendation } from "../lib/types";
import type { TeamImpact } from "../lib/engine";

interface MapRecommendationCardProps {
  map: MapRecommendation;
  teamImpact: TeamImpact[];
}

export function MapRecommendationCard({ map, teamImpact }: MapRecommendationCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Map className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{map.mapName}</h3>
          <p className="text-xs text-muted-foreground">{map.reasoning}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          📋 {map.questObjectiveCount} quest objective{map.questObjectiveCount !== 1 ? "s" : ""}
        </Badge>
        {teamImpact.length > 0 && (
          <Badge variant="outline" className="text-primary border-primary/30">
            <Users className="size-3 mr-1" />
            {teamImpact.length} teammate{teamImpact.length !== 1 ? "s" : ""} benefit
          </Badge>
        )}
      </div>
    </div>
  );
}
