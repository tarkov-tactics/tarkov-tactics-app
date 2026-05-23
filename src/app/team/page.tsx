"use client";

import { RefreshCw, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayerState } from "@/hooks/use-player-state";
import { useTeamState, getSharedOpenTasks } from "@/hooks/use-team-state";
import { TeammateCard } from "@/features/team/components/teammate-card";
import { TeamPermissionPrompt } from "@/features/team/components/team-permission-prompt";

export default function TeamPage() {
  const { isConnected, progress } = usePlayerState();
  const { teammates, hasTeamPermission, isLoading, lastUpdated, refresh } =
    useTeamState();

  const playerOpenTaskIds = new Set(
    progress?.tasksProgress
      .filter((t) => !t.complete && !t.failed)
      .map((t) => t.id) ?? []
  );

  const sharedTasks = progress
    ? getSharedOpenTasks(playerOpenTaskIds, teammates)
    : new Map<string, string[]>();

  function getSharedCountFor(teammate: typeof teammates[0]) {
    let count = 0;
    const teammateOpen = new Set(
      teammate.tasksProgress
        .filter((t) => !t.complete && !t.failed)
        .map((t) => t.id)
    );
    for (const taskId of playerOpenTaskIds) {
      if (teammateOpen.has(taskId)) count++;
    }
    return count;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
              Team
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View your squad&apos;s progression and find shared objectives.
            </p>
          </div>
          {teammates.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          )}
        </div>

        {!isConnected ? (
          <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-card p-6 text-center space-y-2">
            <UsersIcon className="size-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Connect your TarkovTracker account in Settings to view team data.
            </p>
          </div>
        ) : !hasTeamPermission ? (
          <TeamPermissionPrompt />
        ) : teammates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-card p-6 text-center space-y-2">
            <UsersIcon className="size-10 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No teammates found. Create or join a team on TarkovTracker.
            </p>
          </div>
        ) : (
          <>
            {/* Teammate Cards */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">
                Squad ({teammates.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {teammates.map((t) => (
                  <TeammateCard
                    key={t.userId}
                    teammate={t}
                    sharedTaskCount={getSharedCountFor(t)}
                  />
                ))}
              </div>
            </section>

            {/* Shared Tasks */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">
                Shared Tasks ({sharedTasks.size})
              </h2>
              {sharedTasks.size === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No shared open tasks with your teammates.
                </p>
              ) : (
                <div className="space-y-2">
                  {Array.from(sharedTasks.entries())
                    .slice(0, 15)
                    .map(([taskId, names]) => (
                      <div
                        key={taskId}
                        className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 text-sm"
                      >
                        <span className="truncate font-medium">{taskId}</span>
                        <span className="flex items-center gap-1 text-xs text-primary shrink-0 ml-2">
                          <UsersIcon className="size-3" />
                          {names.length} teammate{names.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </section>

            {lastUpdated && (
              <p className="text-xs text-muted-foreground text-right">
                Team data updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
