"use client";

import { useEffect, useState } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useGameData } from "@/hooks/use-game-data";
import { useGoonReports } from "@/hooks/use-goon-reports";
import type { MapRecommendation } from "../lib/types";

interface ThreatAssessmentCardProps {
  map: MapRecommendation;
}

type ThreatTier = "low" | "elevated" | "extreme";

const tierStyle: Record<ThreatTier, { text: string; bar: string }> = {
  low: { text: "text-emerald", bar: "bg-emerald" },
  elevated: { text: "text-amber", bar: "bg-amber" },
  extreme: { text: "text-destructive", bar: "bg-destructive" },
};

function dangerTier(bossChance: number, hasRecentGoons: boolean): ThreatTier {
  if (bossChance >= 0.8 || hasRecentGoons) return "extreme";
  if (bossChance >= 0.3) return "elevated";
  return "low";
}

function bossLabel(tier: ThreatTier): string {
  return tier === "extreme" ? "EXTREME" : tier === "elevated" ? "ELEVATED" : "LOW";
}

const STALE_REPORT_MS = 30 * 60 * 1000; // 30 min — older = "STALE"

export function ThreatAssessmentCard({ map }: ThreatAssessmentCardProps) {
  const { maps } = useGameData();
  const { byMap } = useGoonReports();
  const mapData = maps.find((m) => m.id === map.mapId);

  // Pick the highest-chance boss on this map
  const topBoss = mapData?.bosses.reduce<{ name: string; spawnChance: number } | null>(
    (best, b) => (!best || b.spawnChance > best.spawnChance ? b : best),
    null
  );
  const bossChance = topBoss?.spawnChance ?? 0;
  const bossPct = Math.round(bossChance * 100);

  const goonReport = byMap(map.mapId);

  // Hold `now` in state so the goon-age check stays pure-of-render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const goonAgeMs = goonReport
    ? now - Date.parse(goonReport.timestamp) || 0
    : Infinity;
  const goonState: "sighted" | "stale" | "clear" = !goonReport
    ? "clear"
    : goonAgeMs > STALE_REPORT_MS
      ? "stale"
      : "sighted";

  const tier = dangerTier(bossChance, goonState === "sighted");
  const tierFill = tier === "extreme" ? 4 : tier === "elevated" ? 2 : 1;

  return (
    <div className="rounded-lg border border-destructive/30 bg-card text-card-foreground">
      <div className="flex items-center justify-between p-5 pb-3 border-b border-destructive/30">
        <h3 className="text-telemetry text-destructive">Threat Assessment</h3>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold font-mono",
            tier === "extreme"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : tier === "elevated"
                ? "border-amber/30 bg-amber/10 text-amber"
                : "border-emerald/30 bg-emerald/10 text-emerald"
          )}
        >
          {tier === "extreme" ? "HIGH ALERT" : tier === "elevated" ? "ELEVATED" : "ROUTINE"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5">
        {/* Boss Probability tile */}
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="text-telemetry text-muted-foreground">
              Boss Probability
            </span>
            <span
              className={cn(
                "text-sm font-mono font-bold",
                tierStyle[dangerTier(bossChance, false)].text
              )}
            >
              {topBoss ? `${bossPct}%` : "—"}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full",
                tierStyle[dangerTier(bossChance, false)].bar
              )}
              style={{ width: `${topBoss ? bossPct : 0}%` }}
            />
          </div>
          <span className="text-xs text-foreground font-medium truncate">
            {topBoss ? topBoss.name : "No boss"}
          </span>
        </div>

        {/* Goon Sighting tile */}
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="text-telemetry text-muted-foreground">
              Goon Sighting
            </span>
            <span
              className={cn(
                "text-sm font-mono font-bold",
                goonState === "sighted"
                  ? "text-destructive animate-pulse"
                  : goonState === "stale"
                    ? "text-muted-foreground"
                    : "text-emerald"
              )}
            >
              {goonState === "sighted"
                ? "SIGHTED"
                : goonState === "stale"
                  ? "STALE"
                  : "CLEAR"}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full",
                goonState === "sighted"
                  ? "bg-destructive"
                  : goonState === "stale"
                    ? "bg-muted-foreground/40"
                    : "bg-emerald"
              )}
              style={{
                width:
                  goonState === "sighted"
                    ? "85%"
                    : goonState === "stale"
                      ? "30%"
                      : "10%",
              }}
            />
          </div>
          <span className="text-xs text-foreground font-medium truncate">
            {goonReport
              ? `${map.mapName} · ${formatRelativeTime(new Date(goonReport.timestamp))}`
              : "No recent reports"}
          </span>
        </div>

        {/* Danger Level tile (4-segment bar) */}
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="text-telemetry text-muted-foreground">
              Danger Level
            </span>
            <span className={cn("text-sm font-mono font-bold", tierStyle[tier].text)}>
              {bossLabel(tier)}
            </span>
          </div>
          <div className="flex gap-1 h-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-full flex-1 rounded-full",
                  i < tierFill ? tierStyle[tier].bar : "bg-muted"
                )}
              />
            ))}
          </div>
          <span className="text-xs text-foreground font-medium truncate">
            {tier === "extreme"
              ? "CQC / Full Auto"
              : tier === "elevated"
                ? "Mid-range / Mixed"
                : "Stealth / Loot"}
          </span>
        </div>
      </div>
    </div>
  );
}
