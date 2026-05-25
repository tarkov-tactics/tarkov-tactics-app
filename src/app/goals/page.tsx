"use client";

import { useGoalState } from "@/features/goals/hooks/use-goal-progress";
import { usePlayerState } from "@/hooks/use-player-state";
import { GoalCard } from "@/features/goals/components/goal-card";
import { ActiveDirectiveFocus } from "@/features/goals/components/active-directive-focus";
import { ProgressionSummary } from "@/features/goals/components/progression-summary";
import { OpenQuestsPreview } from "@/features/goals/components/open-quests-preview";
import { DirectiveScopeFilter } from "@/features/goals/components/directive-scope-filter";
import { TarkovTrackerProfileLink } from "@/features/goals/components/tarkov-tracker-profile-link";
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
    directiveScope,
    setDirectiveScope,
    scopeOptions,
    scopedProgress,
  } = useGoalState();
  const { isConnected, progress } = usePlayerState();

  // Fallback definition (matches Stitch's "Prestige Operations" focus) when no
  // goal selected yet — the focus card always renders so the page never looks
  // empty.
  const focusGoal = goalDefinition ?? GOALS[0];
  const focusProgress = scopedProgress ?? activeGoalProgress;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Directives"
          subtitle="Track your long-term progression and shape raid recommendations."
          actions={isConnected ? <TarkovTrackerProfileLink /> : undefined}
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

          {/* Sidebar column: Scope filter + Progression Summary + Open Quests */}
          <aside className="lg:col-span-4 flex flex-col gap-4 lg:gap-6 min-w-0 lg:sticky lg:top-20 lg:self-start">
            <DirectiveScopeFilter
              options={scopeOptions}
              value={directiveScope}
              onChange={setDirectiveScope}
            />
            <ProgressionSummary
              activeGoal={activeGoal}
              activeGoalProgress={activeGoalProgress}
              currentScope={directiveScope}
              onScopeSelect={setDirectiveScope}
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
                    p
                      ? p.prestigeAxes
                        ? (() => {
                            const tracked = p.prestigeAxes.filter((a) => a.current !== null);
                            return { completed: tracked.filter((a) => a.met).length, total: tracked.length };
                          })()
                        : { completed: p.completed, total: p.total }
                      : undefined
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
