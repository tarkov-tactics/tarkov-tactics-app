"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayerState } from "@/hooks/use-player-state";
import { useTeamState } from "@/hooks/use-team-state";
import { formatRelativeTime } from "@/lib/utils";

export function DataSyncPanel() {
  const {
    isConnected,
    isLoading: playerLoading,
    lastUpdated: playerUpdated,
    refresh: refreshPlayer,
  } = usePlayerState();
  const {
    hasTeamPermission,
    isLoading: teamLoading,
    lastUpdated: teamUpdated,
    refresh: refreshTeam,
  } = useTeamState();

  // Re-render every 30s so "X ago" labels stay current without a refetch.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!isConnected) return null;

  const isLoading = playerLoading || teamLoading;

  const handleRefresh = async () => {
    await Promise.all([
      refreshPlayer(),
      hasTeamPermission ? refreshTeam() : Promise.resolve(),
    ]);
  };

  return (
    <section className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h2 className="text-lg font-semibold">Data Sync</h2>
          <p className="text-sm text-muted-foreground">
            Player progress and team data auto-refresh when you open the app.
            Pull again manually if you&apos;ve just finished a quest.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Refresh player and team data now"
        >
          <RefreshCw
            className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh Now
        </Button>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-background px-3 py-2.5 space-y-0.5">
          <dt className="text-telemetry text-muted-foreground">Player Data</dt>
          <dd className="text-sm font-medium">
            {playerLoading ? "Refreshing…" : formatRelativeTime(playerUpdated)}
          </dd>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2.5 space-y-0.5">
          <dt className="text-telemetry text-muted-foreground">Team Data</dt>
          <dd className="text-sm font-medium">
            {!hasTeamPermission
              ? "TP permission required"
              : teamLoading
                ? "Refreshing…"
                : formatRelativeTime(teamUpdated)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
