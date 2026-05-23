"use client";

import { useGoalState } from "@/features/goals/hooks/use-goal-progress";
import { usePlayerState } from "@/hooks/use-player-state";
import { GoalCard } from "@/features/goals/components/goal-card";
import { GOALS } from "@/features/goals/types";
import { Link2Off, Loader2 } from "lucide-react";

export default function GoalsPage() {
  const { activeGoal, setActiveGoal, allGoalProgress, activeGoalProgress, gameDataLoaded } =
    useGoalState();
  const { isConnected } = usePlayerState();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Goals
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select your long-term progression goal to shape raid
            recommendations.
          </p>
        </div>

        {/* Loading game data */}
        {!gameDataLoaded && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading quest data from tarkov.dev…
          </div>
        )}

        {/* Goal Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {GOALS.map((goal) => {
            const progress = allGoalProgress?.get(goal.id);
            return (
              <GoalCard
                key={goal.id}
                goal={goal}
                isActive={activeGoal === goal.id}
                onSelect={() => setActiveGoal(goal.id)}
                progress={
                  progress
                    ? { completed: progress.completed, total: progress.total }
                    : undefined
                }
              />
            );
          })}
        </div>

        {/* Active Goal Detail */}
        {activeGoal && (
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-lg font-semibold">
              {GOALS.find((g) => g.id === activeGoal)?.icon}{" "}
              {GOALS.find((g) => g.id === activeGoal)?.name}
            </h2>

            {!isConnected ? (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
                <Link2Off className="size-5 shrink-0" />
                <p>
                  Connect to TarkovTracker in Settings to see your task
                  progress for this goal.
                </p>
              </div>
            ) : !activeGoalProgress ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Computing goal progress…
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Tasks completed:
                  </span>
                  <span className="font-semibold">
                    {activeGoalProgress.completed} /{" "}
                    {activeGoalProgress.total}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                      style={{
                        width: `${activeGoalProgress.percentage}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    {activeGoalProgress.percentage}% complete
                  </p>
                </div>

                {/* Open Tasks Preview */}
                {activeGoalProgress.openTasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Next tasks ({activeGoalProgress.openTasks.length}{" "}
                      remaining)
                    </h3>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {activeGoalProgress.openTasks.slice(0, 10).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-medium truncate block">
                              {task.name}
                            </span>
                            <span className="text-muted-foreground">
                              {task.trader.name}
                              {task.map ? ` · ${task.map.name}` : ""}
                              {task.minPlayerLevel > 1
                                ? ` · Lvl ${task.minPlayerLevel}`
                                : ""}
                            </span>
                          </div>
                        </div>
                      ))}
                      {activeGoalProgress.openTasks.length > 10 && (
                        <p className="text-[10px] text-muted-foreground text-center pt-1">
                          +{activeGoalProgress.openTasks.length - 10} more
                          tasks
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeGoalProgress.openTasks.length === 0 && (
                  <div className="text-center py-4">
                    <span className="text-3xl">🎉</span>
                    <p className="text-sm font-medium mt-2">
                      Goal complete!
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
