"use client";

import { useGoalState } from "@/features/goals/hooks/use-goal-progress";
import { usePlayerState } from "@/hooks/use-player-state";
import { GoalCard } from "@/features/goals/components/goal-card";
import { ActiveDirectiveFocus } from "@/features/goals/components/active-directive-focus";
import { ProgressionSummary } from "@/features/goals/components/progression-summary";
import { OpenQuestsPreview } from "@/features/goals/components/open-quests-preview";
import { TarkovTrackerHomeLink } from "@/features/goals/components/tarkov-tracker-home-link";
import { GOALS } from "@/features/goals/types";
import { PageHeader } from "@/components/layout/page-header";

export default function GoalsPage() {
  const {
    activeGoal,
    setActiveGoal,
    goalDefinition,
    allGoalProgress,
    activeGoalProgress,
    gameDataLoaded,
    prestigeTarget,
    setPrestigeTarget,
  } = useGoalState();
  const { isConnected, progress } = usePlayerState();

  // Fallback definition (matches Stitch's "Prestige Operations" focus) when no
  // goal selected yet — the focus card always renders so the page never looks
  // empty.
  const focusGoal = goalDefinition ?? GOALS[0];
  const focusProgress = activeGoalProgress;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Directives"
          subtitle="Track your long-term progression and shape raid recommendations."
          actions={isConnected ? <TarkovTrackerHomeLink /> : undefined}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Hero column: Active Directive Focus */}
          <div className="lg:col-span-8 min-w-0">
            <ActiveDirectiveFocus
              goal={focusGoal}
              progress={focusProgress}
              playerProgress={progress}
              isConnected={isConnected}
              gameDataLoaded={gameDataLoaded}
              prestigeTarget={prestigeTarget}
              onPrestigeTargetChange={setPrestigeTarget}
            />
          </div>

          {/* Sidebar column: Progression Summary + Open Quests */}
          <aside className="lg:col-span-4 flex flex-col gap-4 lg:gap-6 min-w-0">
            <ProgressionSummary
              allGoalProgress={allGoalProgress}
              activeGoal={activeGoal}
              onSelect={setActiveGoal}
            />
            <OpenQuestsPreview
              openTasks={focusProgress?.openTasks ?? []}
              completedTasks={focusProgress?.completedTasks ?? []}
              playerProgress={progress}
            />
          </aside>
        </div>

        {/* Compact directive switcher row */}
        <section className="space-y-3">
          <h2 className="text-telemetry text-muted-foreground">
            Switch Directive
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GOALS.map((goal) => {
              const p = allGoalProgress?.get(goal.id);
              return (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isActive={activeGoal === goal.id}
                  onSelect={() => setActiveGoal(goal.id)}
                  progress={
                    p ? { completed: p.completed, total: p.total } : undefined
                  }
                />
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
