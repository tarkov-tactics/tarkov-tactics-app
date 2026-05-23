'use client';

import { useCallback, useMemo, useState } from 'react';
import { GOALS, type GoalId, type GoalDefinition } from '../types';
import { usePlayerState } from '@/hooks/use-player-state';
import { useGameData } from '@/hooks/use-game-data';
import type { TarkovTask } from '@/lib/api/tarkov-dev/types';
import type { ProgressData } from '@/lib/api/tarkov-tracker/types';

const STORAGE_KEY = 'active-goal';

function readGoal(): GoalId | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && GOALS.some((g) => g.id === stored)) return stored as GoalId;
    return null;
  } catch { return null; }
}

// ── Per-goal task filtering ─────────────────────────────────────

function getGoalTasks(goalId: GoalId, allTasks: TarkovTask[], progress: ProgressData | null): TarkovTask[] {
  switch (goalId) {
    case 'kappa':
      // Kappa requires all kappaRequired tasks (or all if field unavailable)
      return allTasks.filter((t) => t.kappaRequired !== false);

    case 'lightkeeper':
      // Lightkeeper chain — filter by Lightkeeper trader tasks + prerequisites
      return allTasks.filter(
        (t) => t.trader.name === 'Lightkeeper' || t.name.toLowerCase().includes('lightkeeper')
      );

    case 'story-endings':
      // Story tasks — faction-specific quest chains
      if (!progress) return allTasks.filter((t) => t.name.toLowerCase().includes('story'));
      // Filter by faction if we know it
      return allTasks.filter((t) => {
        const name = t.name.toLowerCase();
        return name.includes('story') ||
          (progress.pmcFaction === 'BEAR' && name.includes('bear')) ||
          (progress.pmcFaction === 'USEC' && name.includes('usec'));
      });

    case 'prestige':
      // Prestige tracks all tasks as general progression
      return allTasks;

    default:
      return allTasks;
  }
}

// ── Goal progress computation ───────────────────────────────────

export interface GoalProgress {
  total: number;
  completed: number;
  percentage: number;
  openTasks: TarkovTask[];
  completedTasks: TarkovTask[];
}

function computeGoalProgress(
  goalId: GoalId,
  allTasks: TarkovTask[],
  progress: ProgressData | null
): GoalProgress {
  const goalTasks = getGoalTasks(goalId, allTasks, progress);
  const total = goalTasks.length;

  if (!progress || total === 0) {
    return { total, completed: 0, percentage: 0, openTasks: goalTasks, completedTasks: [] };
  }

  const completedIds = new Set(
    progress.tasksProgress.filter((t) => t.complete).map((t) => t.id)
  );

  const completedTasks = goalTasks.filter((t) => completedIds.has(t.id));
  const openTasks = goalTasks.filter((t) => !completedIds.has(t.id));
  const completed = completedTasks.length;

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    openTasks,
    completedTasks,
  };
}

// ── Hook ────────────────────────────────────────────────────────

export function useGoalState() {
  const [activeGoal, setActiveGoalState] = useState<GoalId | null>(() => readGoal());
  const { progress } = usePlayerState();
  const { tasks: gameTasks, dataLoaded } = useGameData();

  const setActiveGoal = useCallback((id: GoalId) => {
    setActiveGoalState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
  }, []);

  const goalDefinition: GoalDefinition | null =
    activeGoal ? GOALS.find((g) => g.id === activeGoal) ?? null : null;

  // Compute progress for ALL goals (used for the card grid)
  const allGoalProgress = useMemo(() => {
    if (!dataLoaded || gameTasks.length === 0) return null;
    const map = new Map<GoalId, GoalProgress>();
    for (const goal of GOALS) {
      map.set(goal.id, computeGoalProgress(goal.id, gameTasks, progress));
    }
    return map;
  }, [gameTasks, dataLoaded, progress]);

  // Active goal's progress
  const activeGoalProgress = activeGoal && allGoalProgress
    ? allGoalProgress.get(activeGoal) ?? null
    : null;

  return {
    activeGoal,
    setActiveGoal,
    goalDefinition,
    allGoalProgress,
    activeGoalProgress,
    gameDataLoaded: dataLoaded,
  };
}
