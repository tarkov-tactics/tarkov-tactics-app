'use client';

import { useCallback, useMemo, useState } from 'react';
import { GOALS, type GoalId, type GoalDefinition } from '../types';
import { usePlayerState } from '@/hooks/use-player-state';
import { useGameData } from '@/hooks/use-game-data';
import type { TarkovTask } from '@/lib/api/tarkov-dev/types';
import type { ProgressData } from '@/lib/api/tarkov-tracker/types';
import {
  PRESTIGE_TIERS,
  DEFAULT_PRESTIGE_TARGET,
  type PrestigeTarget,
} from '../lib/prestige-tiers';

const STORAGE_KEY = 'active-goal';
const PRESTIGE_TARGET_KEY = 'prestige-target';

function readGoal(): GoalId | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && GOALS.some((g) => g.id === stored)) return stored as GoalId;
    return null;
  } catch { return null; }
}

function readPrestigeTarget(): PrestigeTarget {
  if (typeof window === 'undefined') return DEFAULT_PRESTIGE_TARGET;
  try {
    const stored = localStorage.getItem(PRESTIGE_TARGET_KEY);
    const n = stored ? Number(stored) : NaN;
    if (n >= 1 && n <= 6) return n as PrestigeTarget;
    return DEFAULT_PRESTIGE_TARGET;
  } catch { return DEFAULT_PRESTIGE_TARGET; }
}

// ── Per-goal task filtering ─────────────────────────────────────

function getGoalTasks(
  goalId: GoalId,
  allTasks: TarkovTask[],
  progress: ProgressData | null,
  prestigeTarget: PrestigeTarget,
): TarkovTask[] {
  switch (goalId) {
    case 'kappa':
      return allTasks.filter((t) => t.kappaRequired !== false);

    case 'lightkeeper':
      return allTasks.filter(
        (t) => t.trader.name === 'Lightkeeper' || t.name.toLowerCase().includes('lightkeeper')
      );

    case 'story-endings':
      if (!progress) return allTasks.filter((t) => t.name.toLowerCase().includes('story'));
      return allTasks.filter((t) => {
        const name = t.name.toLowerCase();
        return name.includes('story') ||
          (progress.pmcFaction === 'BEAR' && name.includes('bear')) ||
          (progress.pmcFaction === 'USEC' && name.includes('usec'));
      });

    case 'prestige': {
      // Target-tier-specific task list when defined, otherwise fall back
      // to all kappa-required tasks (broad general-progression filter).
      const tier = PRESTIGE_TIERS[prestigeTarget];
      if (tier?.requiredTaskIds?.length) {
        const ids = new Set(tier.requiredTaskIds);
        return allTasks.filter((t) => ids.has(t.id));
      }
      return allTasks.filter((t) => t.kappaRequired !== false);
    }

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
  progress: ProgressData | null,
  prestigeTarget: PrestigeTarget,
): GoalProgress {
  const goalTasks = getGoalTasks(goalId, allTasks, progress, prestigeTarget);
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
  const [prestigeTarget, setPrestigeTargetState] = useState<PrestigeTarget>(() => readPrestigeTarget());
  const { progress } = usePlayerState();
  const { tasks: gameTasks, dataLoaded } = useGameData();

  const setActiveGoal = useCallback((id: GoalId) => {
    setActiveGoalState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
  }, []);

  const setPrestigeTarget = useCallback((target: PrestigeTarget) => {
    setPrestigeTargetState(target);
    try { localStorage.setItem(PRESTIGE_TARGET_KEY, String(target)); } catch { /* noop */ }
  }, []);

  const goalDefinition: GoalDefinition | null =
    activeGoal ? GOALS.find((g) => g.id === activeGoal) ?? null : null;

  const allGoalProgress = useMemo(() => {
    if (!dataLoaded || gameTasks.length === 0) return null;
    const map = new Map<GoalId, GoalProgress>();
    for (const goal of GOALS) {
      map.set(goal.id, computeGoalProgress(goal.id, gameTasks, progress, prestigeTarget));
    }
    return map;
  }, [gameTasks, dataLoaded, progress, prestigeTarget]);

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
    prestigeTarget,
    setPrestigeTarget,
  };
}
