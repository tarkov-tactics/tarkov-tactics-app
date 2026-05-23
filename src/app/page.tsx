"use client";

import { Loader2, Link2Off, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayerState } from "@/hooks/use-player-state";
import { useGoalState } from "@/features/goals/hooks/use-goal-progress";
import { useVibeConfig } from "@/features/vibes/hooks/use-vibe-config";
import { useRaidPlan } from "@/features/dashboard/hooks/use-raid-plan";
import { VibeQuickSwitch } from "@/features/vibes/components/vibe-quick-switch";
import { MapRecommendationCard } from "@/features/dashboard/components/map-recommendation";
import { LoadoutSuggestionCard } from "@/features/dashboard/components/loadout-suggestion";
import { POIList } from "@/features/dashboard/components/poi-list";
import { ItemWatchlist } from "@/features/dashboard/components/item-watchlist";
import { RiskPanel } from "@/features/dashboard/components/risk-panel";
import { TeamImpactPanel } from "@/features/dashboard/components/team-impact";
import Link from "next/link";

export default function DashboardPage() {
  const { isConnected, refresh: refreshPlayer, isLoading: playerLoading } = usePlayerState();
  const { goalDefinition } = useGoalState();
  const { vibeDefinition } = useVibeConfig();
  const { raidPlan, teamImpact, isLoading: dataLoading } = useRaidPlan();

  const isLoading = playerLoading || dataLoading;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Dashboard Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
              Next Raid
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {goalDefinition
                ? `${goalDefinition.icon} ${goalDefinition.name}`
                : "No goal selected"}{" "}
              · {vibeDefinition.icon} {vibeDefinition.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <VibeQuickSwitch />
            {isConnected && (
              <Button
                variant="outline"
                size="icon-sm"
                onClick={refreshPlayer}
                disabled={isLoading}
                aria-label="Refresh data"
              >
                <RefreshCw
                  className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
            )}
          </div>
        </div>

        {/* Not connected state */}
        {!isConnected && (
          <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-card p-8 text-center space-y-4">
            <Link2Off className="size-12 mx-auto text-muted-foreground/40" />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Connect to get started</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Link your TarkovTracker account in Settings to receive
                personalized raid recommendations based on your quest progress.
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<Link href="/settings" />}
            >
              Go to Settings
            </Button>
          </div>
        )}

        {/* Loading state */}
        {isConnected && isLoading && !raidPlan && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Computing your raid plan…
            </p>
          </div>
        )}

        {/* Raid Plan */}
        {isConnected && raidPlan && (
          <div className="space-y-4">
            <MapRecommendationCard
              map={raidPlan.map}
              teamImpact={teamImpact}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <LoadoutSuggestionCard loadout={raidPlan.loadout} />
              <RiskPanel risks={raidPlan.risks} />
            </div>

            <POIList pois={raidPlan.pois} />
            <ItemWatchlist items={raidPlan.watchlist} />

            {teamImpact.length > 0 && (
              <TeamImpactPanel teamImpact={teamImpact} />
            )}
          </div>
        )}

        {/* Connected but no plan (no game data or all tasks complete) */}
        {isConnected && !isLoading && !raidPlan && (
          <div className="rounded-xl border bg-card p-8 text-center space-y-3">
            <span className="text-4xl">🎉</span>
            <h2 className="text-lg font-semibold">All caught up!</h2>
            <p className="text-sm text-muted-foreground">
              No open quest objectives found. Change your Goal or Vibe, or check
              back after game data refreshes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
