"use client";

import { Loader2, Link2Off } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LabeledSelector } from "@/components/shared/labeled-selector";
import { PageHeader } from "@/components/layout/page-header";
import { usePlayerState } from "@/hooks/use-player-state";
import { useRaidPlan } from "@/features/dashboard/hooks/use-raid-plan";
import { useVibeConfig } from "@/features/vibes/hooks/use-vibe-config";
import { useGoalState } from "@/features/goals/hooks/use-goal-progress";
import { VIBES, type VibeId } from "@/features/vibes/types";
import { GOALS, type GoalId } from "@/features/goals/types";
import { MapRecommendationCard } from "@/features/dashboard/components/map-recommendation";
import { LoadoutSuggestionCard } from "@/features/dashboard/components/loadout-suggestion";
import { POIList } from "@/features/dashboard/components/poi-list";
import { ItemWatchlist } from "@/features/dashboard/components/item-watchlist";
import { ThreatAssessmentCard } from "@/features/dashboard/components/threat-assessment";
import { TeamImpactPanel } from "@/features/dashboard/components/team-impact";
import { DashboardGrid } from "@/features/dashboard/components/dashboard-grid";
import {
  getDashboardLayout,
  type DashboardCardKey,
} from "@/features/dashboard/lib/dashboard-layout";

const vibeOptions = VIBES.map((v) => ({
  value: v.id,
  label: v.name,
  icon: v.icon,
}));

const goalOptions = GOALS.map((g) => ({
  value: g.id,
  label: g.name,
  icon: g.icon,
}));

export default function DashboardPage() {
  const { isConnected, isLoading: playerLoading } = usePlayerState();
  const { raidPlan, teamImpact, isLoading: dataLoading } = useRaidPlan();
  const { activeVibe, setActiveVibe, vibeModifier } = useVibeConfig();
  const { activeGoal, setActiveGoal } = useGoalState();

  const isLoading = playerLoading || dataLoading;

  const headerActions = (
    <>
      <LabeledSelector<VibeId>
        label="Select Vibe"
        value={activeVibe}
        onChange={setActiveVibe}
        options={vibeOptions}
      />
      <LabeledSelector<GoalId>
        label="Active Directive"
        value={activeGoal}
        onChange={setActiveGoal}
        options={goalOptions}
        placeholder="Select…"
      />
    </>
  );

  // Build the card map only when we have a raid plan
  let layoutNodes: { hero: ReactNode; secondary: ReactNode; sidebar: ReactNode } | null = null;
  if (raidPlan) {
    const layout = getDashboardLayout(vibeModifier);
    const cards: Record<DashboardCardKey, ReactNode> = {
      threat: <ThreatAssessmentCard map={raidPlan.map} />,
      map: <MapRecommendationCard map={raidPlan.map} teamImpact={teamImpact} />,
      pois: <POIList pois={raidPlan.pois} />,
      watchlist: <ItemWatchlist items={raidPlan.watchlist} />,
      loadout: <LoadoutSuggestionCard loadout={raidPlan.loadout} />,
      "team-impact":
        teamImpact.length > 0 ? <TeamImpactPanel teamImpact={teamImpact} /> : null,
    };

    const render = (keys: DashboardCardKey[]): ReactNode => (
      <>
        {keys.map((k) => {
          const node = cards[k];
          return node ? <div key={k}>{node}</div> : null;
        })}
      </>
    );

    layoutNodes = {
      hero: render(layout.hero),
      secondary: render(layout.secondary),
      sidebar: render(layout.sidebar),
    };
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Intel Briefing"
          subtitle="Next Raid Parameters Confirmed."
          actions={headerActions}
        />

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
            <Button nativeButton={false} render={<Link href="/settings" />}>
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
        {isConnected && raidPlan && layoutNodes && (
          <DashboardGrid
            hero={layoutNodes.hero}
            secondary={layoutNodes.secondary}
            sidebar={layoutNodes.sidebar}
          />
        )}

        {/* Connected but no plan */}
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
