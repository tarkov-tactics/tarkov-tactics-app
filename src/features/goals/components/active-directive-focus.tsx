"use client";

import { Loader2, Link2Off, Circle, CheckCircle2, Info } from "lucide-react";
import type { ProgressData } from "@/lib/api/tarkov-tracker/types";
import type { GoalDefinition, GoalId } from "../types";
import type { GoalProgress } from "../hooks/use-goal-progress";
import { PRESTIGE_TIERS, type PrestigeTarget } from "../lib/prestige-tiers";
import { HardRequirementsList } from "./hard-requirements-list";
import { QuestLinePreview } from "./quest-line-preview";
import { PrestigeTargetSelect } from "./prestige-target-select";

interface ActiveDirectiveFocusProps {
  goal: GoalDefinition;
  progress: GoalProgress | null;
  playerProgress: ProgressData | null;
  isConnected: boolean;
  gameDataLoaded: boolean;
  prestigeTarget: PrestigeTarget;
  onPrestigeTargetChange: (next: PrestigeTarget) => void;
}

function tierLabel(goalId: GoalId, prestigeTarget: PrestigeTarget): string | null {
  if (goalId === "prestige") {
    return `TARGET TIER · ${PRESTIGE_TIERS[prestigeTarget].label.toUpperCase()}`;
  }
  if (goalId === "kappa") return "ALL TRADER QUESTS";
  if (goalId === "lightkeeper") return "LIGHTKEEPER CHAIN";
  if (goalId === "story-endings") return "FACTION STORY";
  return null;
}

export function ActiveDirectiveFocus({
  goal,
  progress,
  playerProgress,
  isConnected,
  gameDataLoaded,
  prestigeTarget,
  onPrestigeTargetChange,
}: ActiveDirectiveFocusProps) {
  const pct = progress?.percentage ?? 0;
  const label = tierLabel(goal.id, prestigeTarget);

  return (
    <section className="rounded-lg border border-border bg-card text-card-foreground">
      <div className="p-5 lg:p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-3xl leading-none" role="img" aria-label={goal.name}>
              {goal.icon}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold uppercase tracking-tight truncate">
                {goal.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {goal.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {goal.id === "prestige" && (
              <PrestigeTargetSelect
                value={prestigeTarget}
                onChange={onPrestigeTargetChange}
              />
            )}
            {progress && (
              <div className="text-right">
                <p className="text-telemetry text-primary">
                  {pct}% COMPLETE
                </p>
                {label && (
                  <p className="text-telemetry text-muted-foreground mt-0.5">
                    {label}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Full-width progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Prestige axes breakdown */}
        {progress?.prestigeAxes && progress.prestigeAxes.length > 0 && (() => {
          const tracked = progress.prestigeAxes!.filter((a) => a.current !== null);
          const untracked = progress.prestigeAxes!.filter((a) => a.current === null);

          return (
            <div className="space-y-2">
              <h4 className="text-telemetry text-muted-foreground">Tier Requirements</h4>
              <ul className="space-y-2">
                {tracked.map((axis) => {
                  const pct = axis.met
                    ? 100
                    : axis.target > 0
                      ? Math.min(100, Math.round((axis.current! / axis.target) * 100))
                      : 0;
                  return (
                    <li
                      key={axis.key}
                      className="rounded-md border border-border bg-background p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {axis.met ? (
                            <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                          ) : (
                            <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                          )}
                          <span className="text-sm font-medium truncate">{axis.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono shrink-0 tracking-wider ${
                            axis.met ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {axis.met ? "COMPLETED" : `${axis.current} / ${axis.target}`}
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              {untracked.length > 0 && (
                <div className="rounded-md border border-dashed border-border bg-background p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="text-telemetry text-muted-foreground">Untracked Requirements</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {untracked.map((axis) => (
                      <span
                        key={axis.key}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-mono tracking-wider text-muted-foreground"
                      >
                        {axis.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Body */}
        {!gameDataLoaded ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="size-4 animate-spin" />
            Loading quest data from tarkov.dev…
          </div>
        ) : !isConnected ? (
          <div className="flex items-center gap-3 rounded-md border border-dashed border-muted-foreground/30 p-4 text-sm text-muted-foreground">
            <Link2Off className="size-5 shrink-0" />
            <p>
              Connect to TarkovTracker in Settings to see your task progress for
              this directive.
            </p>
          </div>
        ) : !progress ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="size-4 animate-spin" />
            Computing directive progress…
          </div>
        ) : progress.prestigeAxes ? (
          progress.prestigeAxes.every((a) => a.met) ? (
            <div className="text-center py-4">
              <span className="text-3xl">🎉</span>
              <p className="text-sm font-medium mt-2">Directive complete!</p>
            </div>
          ) : progress.xpRecommendedTasks && progress.xpRecommendedTasks.length > 0 ? (
            <HardRequirementsList
              openTasks={progress.xpRecommendedTasks}
              completedTasks={[]}
              progress={playerProgress}
              limit={5}
              sectionLabel="XP Priority"
              showXpReward
            />
          ) : progress.openTasks.length > 0 ? (
            <QuestLinePreview
              openTasks={progress.openTasks}
              completedTasks={progress.completedTasks}
              limit={5}
            />
          ) : null
        ) : progress.openTasks.length === 0 ? (
          <div className="text-center py-4">
            <span className="text-3xl">🎉</span>
            <p className="text-sm font-medium mt-2">Directive complete!</p>
          </div>
        ) : progress.openTasks.length + progress.completedTasks.length > 50 ? (
          <QuestLinePreview
            openTasks={progress.openTasks}
            completedTasks={progress.completedTasks}
            limit={5}
          />
        ) : (
          <HardRequirementsList
            openTasks={progress.openTasks}
            completedTasks={progress.completedTasks}
            progress={playerProgress}
            limit={5}
          />
        )}
      </div>
    </section>
  );
}
