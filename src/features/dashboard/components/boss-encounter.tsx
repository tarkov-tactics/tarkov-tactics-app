"use client";

import { MapPin, Shield, Medal } from "lucide-react";
import type { VibeIntelData } from "../lib/types";

interface BossEncounterCardProps {
  data: VibeIntelData;
}

export function BossEncounterCard({ data }: BossEncounterCardProps) {
  if (data.kind !== "boss-encounter") {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">Intel not available.</p>
      </div>
    );
  }

  const { intel, bossName, mapName } = data;

  if (!intel || !bossName) {
    return (
      <div className="rounded-lg border border-border bg-card text-card-foreground">
        <div className="p-5 pb-3 border-b border-border">
          <h3 className="text-telemetry text-muted-foreground">
            Boss Encounter Intel & Strategy
          </h3>
        </div>
        <div className="p-5">
          <p className="text-sm text-muted-foreground">
            Intel not yet available for {bossName ?? "this map"}
            {bossName ? ` on ${mapName}` : ""}. Showing baseline parameters only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-5 pb-3 border-b border-border">
        <h3 className="text-telemetry text-muted-foreground">
          Boss Encounter Intel & Strategy
        </h3>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <MapPin className="size-4 text-primary mt-0.5 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Spawn Points</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {intel.spawnPoints}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Shield className="size-4 text-primary mt-0.5 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Guard Status</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {intel.guardStatus}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Medal className="size-4 text-primary mt-0.5 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Unique Loot</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {intel.uniqueLoot}
              </p>
            </div>
          </li>
        </ul>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <h4 className="text-telemetry text-foreground">Tactical Approach</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {intel.tacticalApproach}
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-telemetry text-foreground">Flank Maneuvers</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {intel.flankManeuvers}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
