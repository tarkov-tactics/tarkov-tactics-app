"use client";

import { useEffect, useState } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useGameData } from "@/hooks/use-game-data";
import { useGoonReports } from "@/hooks/use-goon-reports";
import type { MapRecommendation } from "../lib/types";
import { getTopBoss } from "@/lib/derived-progress";
import { STALE_GOON_REPORT_MS, getPvpDensity, PVP_HOTSPOTS } from "@/lib/constants";

interface ThreatAssessmentCardProps {
  map: MapRecommendation;
  format?: "tiles" | "rows" | "bars";
}

type ThreatTier = "low" | "elevated" | "extreme";
type GoonState = "sighted" | "stale" | "clear" | "unavailable";

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

// ── Shared threat-state hook ─────────────────────────────────────

interface ThreatState {
  topBoss: { name: string; spawnChance: number } | null;
  bossChance: number;
  bossPct: number;
  goonState: GoonState;
  goonText: string | null;
  tier: ThreatTier;
  tierFill: number;
  pvpDensity: { label: string; pct: number; hotspots: string };
}

const PVP_PCT: Record<string, number> = { high: 85, medium: 55, low: 25 };

function useThreatState(map: MapRecommendation): ThreatState {
  const { maps } = useGameData();
  const { byMap } = useGoonReports();
  const mapData = maps.find((m) => m.id === map.mapId);

  const topBoss = getTopBoss(mapData?.bosses ?? []);
  const bossChance = topBoss?.spawnChance ?? 0;
  const bossPct = Math.round(bossChance * 100);

  const goonReport = byMap(map.mapId);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  let goonState: GoonState = "clear";
  let goonText: string | null = null;
  if (goonReport) {
    const ageMs = now - Date.parse(goonReport.timestamp);
    goonState = ageMs > STALE_GOON_REPORT_MS ? "stale" : "sighted";
    goonText = `${map.mapName} · ${formatRelativeTime(new Date(goonReport.timestamp))}`;
  }

  const tier = dangerTier(bossChance, goonState === "sighted");
  const tierFill = tier === "extreme" ? 4 : tier === "elevated" ? 2 : 1;
  const pvp = getPvpDensity(map.mapName);
  const pvpLabel = pvp === "high" ? "High" : pvp === "medium" ? "Medium" : "Low";
  const pvpDensity = { label: pvpLabel, pct: PVP_PCT[pvp], hotspots: PVP_HOTSPOTS[map.mapName] ?? "" };

  return { topBoss, bossChance, bossPct, goonState, goonText, tier, tierFill, pvpDensity };
}

// ── Shared header ────────────────────────────────────────────────

function ThreatHeader({ tier }: { tier: ThreatTier }) {
  return (
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
  );
}

// ── tiles (Boss Rush) ───────────────────────────────────────────

function TilesFormat({ s }: { s: ThreatState }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-card text-card-foreground">
      <ThreatHeader tier={s.tier} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5">
        {/* Boss Probability tile */}
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="text-telemetry text-muted-foreground">Boss Probability</span>
            <span
              className={cn(
                "text-sm font-mono font-bold",
                tierStyle[dangerTier(s.bossChance, false)].text
              )}
            >
              {s.topBoss ? `${s.bossPct}%` : "—"}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full", tierStyle[dangerTier(s.bossChance, false)].bar)}
              style={{ width: `${s.topBoss ? s.bossPct : 0}%` }}
            />
          </div>
          <span className="text-xs text-foreground font-medium truncate">
            {s.topBoss ? s.topBoss.name : "No boss"}
          </span>
        </div>

        {/* Goon Sighting tile */}
        <GoonTile s={s} />

        {/* Danger Level tile (4-segment bar) */}
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <span className="text-telemetry text-muted-foreground">Danger Level</span>
            <span className={cn("text-sm font-mono font-bold", tierStyle[s.tier].text)}>
              {bossLabel(s.tier)}
            </span>
          </div>
          <div className="flex gap-1 h-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-full flex-1 rounded-full",
                  i < s.tierFill ? tierStyle[s.tier].bar : "bg-muted"
                )}
              />
            ))}
          </div>
          <span className="text-xs text-foreground font-medium truncate">
            {s.tier === "extreme"
              ? "CQC / Full Auto"
              : s.tier === "elevated"
                ? "Mid-range / Mixed"
                : "Stealth / Loot"}
          </span>
        </div>
      </div>
    </div>
  );
}

function GoonTile({ s }: { s: ThreatState }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <span className="text-telemetry text-muted-foreground">Goon Sighting</span>
        <span
          className={cn(
            "text-sm font-mono font-bold",
            s.goonState === "sighted"
              ? "text-destructive animate-pulse"
              : s.goonState === "stale"
                ? "text-muted-foreground"
                : "text-emerald"
          )}
        >
          {s.goonState === "sighted" ? "SIGHTED" : s.goonState === "stale" ? "STALE" : "CLEAR"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full",
            s.goonState === "sighted"
              ? "bg-destructive"
              : s.goonState === "stale"
                ? "bg-muted-foreground/40"
                : "bg-emerald"
          )}
          style={{
            width: s.goonState === "sighted" ? "85%" : s.goonState === "stale" ? "30%" : "10%",
          }}
        />
      </div>
      <span className="text-xs text-foreground font-medium truncate">
        {s.goonText ?? "No recent reports"}
      </span>
    </div>
  );
}

// ── rows (Loot Run sidebar) ─────────────────────────────────────

function RowsFormat({ s }: { s: ThreatState }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-card text-card-foreground">
      <ThreatHeader tier={s.tier} />
      <div className="p-4 space-y-3">
        {/* Boss row */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">
            {s.topBoss ? `${s.topBoss.name} (Boss)` : "No boss"}
          </span>
          <span
            className={cn(
              "text-xs font-mono font-medium",
              tierStyle[dangerTier(s.bossChance, false)].text
            )}
          >
            {s.topBoss ? `${s.bossPct}% PROB` : "—"}
          </span>
        </div>

        {/* Goon Squad row */}
        <div className="flex justify-between items-center p-2 rounded-md bg-background border border-destructive/10">
          <span className="text-sm font-medium">Goon Squad</span>
          <div className="text-right">
            <span
              className={cn(
                "block text-xs font-mono font-bold",
                s.goonState === "sighted"
                  ? "text-destructive animate-pulse"
                  : s.goonState === "stale"
                    ? "text-muted-foreground"
                    : "text-emerald"
              )}
            >
              {s.goonState === "sighted" ? "SIGHTED" : s.goonState === "stale" ? "STALE" : "CLEAR"}
            </span>
            {s.goonText && (
              <span className="block text-[10px] font-mono text-muted-foreground">
                {s.goonText}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── bars (PvP / Mixed left column) ──────────────────────────────

function BarsFormat({ s }: { s: ThreatState }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-card text-card-foreground">
      <ThreatHeader tier={s.tier} />
      <div className="p-5 space-y-4">
        {/* Boss Probability */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-telemetry text-muted-foreground">Boss Probability</span>
            <span
              className={cn(
                "text-xs font-mono font-bold",
                tierStyle[dangerTier(s.bossChance, false)].text
              )}
            >
              {s.topBoss ? `${s.bossPct}%` : "—"}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full", tierStyle[dangerTier(s.bossChance, false)].bar)}
              style={{ width: `${s.topBoss ? s.bossPct : 0}%` }}
            />
          </div>
          {s.topBoss && (
            <span className="block text-[10px] font-mono text-muted-foreground">
              {s.topBoss.name}
            </span>
          )}
        </div>

        {/* Goon Presence */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-telemetry text-muted-foreground">Goon Presence</span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-mono font-bold",
                  s.goonState === "sighted"
                    ? "text-destructive animate-pulse"
                    : s.goonState === "stale"
                      ? "text-muted-foreground"
                      : "text-emerald"
                )}
              >
                {s.goonState === "sighted"
                  ? "SIGHTED"
                  : s.goonState === "stale"
                    ? "STALE"
                    : "CLEAR"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold font-mono",
                  s.goonState === "sighted"
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-border bg-background text-muted-foreground"
                )}
              >
                LIVE STATUS
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full",
                s.goonState === "sighted"
                  ? "bg-destructive"
                  : s.goonState === "stale"
                    ? "bg-muted-foreground/40"
                    : "bg-emerald"
              )}
              style={{
                width:
                  s.goonState === "sighted" ? "85%" : s.goonState === "stale" ? "30%" : "10%",
              }}
            />
          </div>
          {s.goonText && (
            <span className="block text-[10px] font-mono text-muted-foreground">
              {s.goonText}
            </span>
          )}
        </div>

        {/* PMC Frequency */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-telemetry text-muted-foreground">PMC Frequency</span>
            <span className="text-xs font-mono font-bold text-foreground">
              {s.pvpDensity.label}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${s.pvpDensity.pct}%` }} />
          </div>
          {s.pvpDensity.hotspots && (
            <span className="block text-[10px] font-mono text-muted-foreground">
              {s.pvpDensity.hotspots}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── dispatch ────────────────────────────────────────────────────

export function ThreatAssessmentCard({ map, format = "tiles" }: ThreatAssessmentCardProps) {
  const state = useThreatState(map);
  switch (format) {
    case "rows":
      return <RowsFormat s={state} />;
    case "bars":
      return <BarsFormat s={state} />;
    case "tiles":
    default:
      return <TilesFormat s={state} />;
  }
}
