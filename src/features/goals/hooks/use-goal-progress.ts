'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GOALS, type GoalId, type GoalDefinition } from '../types';
import { usePlayerState } from '@/hooks/use-player-state';
import { useGameData } from '@/hooks/use-game-data';
import type { TarkovTask, HideoutStation } from '@/lib/api/tarkov-dev/types';
import type { ProgressData } from '@/lib/api/tarkov-tracker/types';
import { deriveProgressSets, getCompletedHideoutLevel, type DerivedProgressSets } from '@/lib/derived-progress';
import {
  PRESTIGE_TIERS,
  DEFAULT_PRESTIGE_TARGET,
  type PrestigeTarget,
} from '../lib/prestige-tiers';
import {
  ALL_SCOPE,
  filterTasksByScope,
  getScopeOptions,
  isValidScopeForGoal,
  type ScopeId,
  type ScopeOption,
} from '../lib/directive-scopes';

const STORAGE_KEY = 'active-goal';
const PRESTIGE_TARGET_KEY = 'prestige-target';
const SCOPE_KEY_PREFIX = 'directive-scope:';

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

function readScope(goalId: GoalId): ScopeId {
  if (typeof window === 'undefined') return ALL_SCOPE.id;
  try {
    const stored = localStorage.getItem(SCOPE_KEY_PREFIX + goalId);
    if (stored && isValidScopeForGoal(goalId, stored)) return stored;
    return ALL_SCOPE.id;
  } catch { return ALL_SCOPE.id; }
}

// ── Prerequisite chain resolution ───────────────────────────────

function resolvePrerequisiteChain(
  gatingQuestName: string,
  allTasks: TarkovTask[],
): TarkovTask[] {
  const taskById = new Map(allTasks.map((t) => [t.id, t]));
  const gatingTask = allTasks.find(
    (t) => t.name === gatingQuestName && !t.taskRequirements?.some(
      (r) => allTasks.find((at) => at.id === r.task.id)?.name === gatingQuestName
    )
  );
  if (!gatingTask) return [];

  const collected = new Map<string, TarkovTask>();
  const queue = [gatingTask];
  while (queue.length > 0) {
    const current = queue.pop()!;
    if (collected.has(current.id)) continue;
    collected.set(current.id, current);
    for (const req of current.taskRequirements ?? []) {
      const prereq = taskById.get(req.task.id);
      if (prereq && !collected.has(prereq.id)) queue.push(prereq);
    }
  }
  return Array.from(collected.values());
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
      const tier = PRESTIGE_TIERS[prestigeTarget];
      if (!tier) return allTasks.filter((t) => t.kappaRequired !== false);

      const prereqChain = resolvePrerequisiteChain(tier.gatingQuestName, allTasks);
      if (prereqChain.length > 0) return prereqChain;

      // Fallback: gating quest not found in game data
      const levelCap = tier.minPlayerLevel;
      return allTasks.filter((t) => {
        if (t.kappaRequired === false) return false;
        return (t.minPlayerLevel ?? 0) <= levelCap;
      });
    }

    default:
      return allTasks;
  }
}

// ── Goal progress computation ───────────────────────────────────

export interface PrestigeAxis {
  key: string;
  label: string;
  current: number | null;
  target: number;
  met: boolean;
}

export interface GoalProgress {
  total: number;
  completed: number;
  percentage: number;
  openTasks: TarkovTask[];
  completedTasks: TarkovTask[];
  prestigeAxes?: PrestigeAxis[];
  xpRecommendedTasks?: TarkovTask[];
}

function computePrestigeAxes(
  prestigeTarget: PrestigeTarget,
  progress: ProgressData | null,
  questProgress: GoalProgress,
  hideoutStations: HideoutStation[],
  sets: DerivedProgressSets | null,
): PrestigeAxis[] {
  const tier = PRESTIGE_TIERS[prestigeTarget];
  if (!tier) return [];

  const axes: PrestigeAxis[] = [];

  // Level axis
  const playerLevel = progress?.playerLevel ?? 0;
  axes.push({
    key: 'level',
    label: `PMC Level ${tier.minPlayerLevel}`,
    current: progress ? playerLevel : null,
    target: tier.minPlayerLevel,
    met: playerLevel >= tier.minPlayerLevel,
  });

  // Quest chain axis
  axes.push({
    key: 'quests',
    label: tier.gatingQuestName,
    current: questProgress.completed,
    target: questProgress.total,
    met: questProgress.completed >= questProgress.total && questProgress.total > 0,
  });

  // Hideout module axes
  const completedModuleIds = sets?.completedModuleIds ?? new Set<string>();
  for (const req of tier.hideoutRequirements) {
    const station = hideoutStations.find((s) => s.name === req.stationName);
    const currentLevel = station ? getCompletedHideoutLevel(station, completedModuleIds) : 0;
    axes.push({
      key: `hideout-${req.stationName}`,
      label: `${req.stationName} Lv${req.level}`,
      current: progress ? currentLevel : null,
      target: req.level,
      met: currentLevel >= req.level,
    });
  }

  // Skill axes (TarkovTracker doesn't expose skill levels)
  for (const req of tier.skillRequirements) {
    axes.push({
      key: `skill-${req.name}`,
      label: `${req.name} Lv${req.level}`,
      current: null,
      target: req.level,
      met: false,
    });
  }

  // Roubles axis (TarkovTracker doesn't expose currency)
  axes.push({
    key: 'roubles',
    label: `${(tier.roublesRequired / 1_000_000).toFixed(0)}M ₽`,
    current: null,
    target: tier.roublesRequired,
    met: false,
  });

  return axes;
}

function computeGoalProgress(
  goalId: GoalId,
  allTasks: TarkovTask[],
  progress: ProgressData | null,
  prestigeTarget: PrestigeTarget,
  hideoutStations: HideoutStation[],
  sets: DerivedProgressSets | null,
): GoalProgress {
  const goalTasks = getGoalTasks(goalId, allTasks, progress, prestigeTarget);
  const questProgress = computeProgressForTasks(goalTasks, progress, sets);

  if (goalId !== 'prestige') return questProgress;

  const axes = computePrestigeAxes(prestigeTarget, progress, questProgress, hideoutStations, sets);
  const tracked = axes.filter((a) => a.current !== null);
  const trackedMet = tracked.filter((a) => a.met).length;
  const percentage = tracked.length > 0 ? Math.round((trackedMet / tracked.length) * 100) : 0;

  const result: GoalProgress = {
    ...questProgress,
    percentage,
    prestigeAxes: axes,
  };

  const tier = PRESTIGE_TIERS[prestigeTarget];
  if (tier && !tier.requiresCollector && progress && sets) {
    const playerLevel = progress.playerLevel ?? 0;
    result.xpRecommendedTasks = allTasks
      .filter((t) => t.kappaRequired !== false)
      .filter((t) => !sets.completedTaskIds.has(t.id) && !sets.failedTaskIds.has(t.id))
      .filter((t) => (t.minPlayerLevel ?? 0) <= playerLevel)
      .filter((t) => (t.taskRequirements ?? []).every((r) => sets.completedTaskIds.has(r.task.id)))
      .sort((a, b) => (b.experience ?? 0) - (a.experience ?? 0));
  }

  return result;
}

function computeProgressForTasks(
  goalTasks: TarkovTask[],
  progress: ProgressData | null,
  sets?: DerivedProgressSets | null,
): GoalProgress {
  const total = goalTasks.length;

  if (!progress || total === 0) {
    return { total, completed: 0, percentage: 0, openTasks: goalTasks, completedTasks: [] };
  }

  const { completedTaskIds, failedTaskIds } = sets ?? deriveProgressSets(progress);

  const completedTasks = goalTasks.filter((t) => completedTaskIds.has(t.id));
  const completed = completedTasks.length;

  const openTasks = goalTasks
    .filter((t) => !completedTaskIds.has(t.id) && !failedTaskIds.has(t.id))
    .filter((t) => t.trader.name !== 'Fence')
    .filter((t) => {
      if ((t.minPlayerLevel ?? 0) > progress.playerLevel) return false;
      return (t.taskRequirements ?? []).every((req) => completedTaskIds.has(req.task.id));
    });

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
  const [activeGoal, setActiveGoalState] = useState<GoalId | null>(null);
  const [prestigeTarget, setPrestigeTargetState] = useState<PrestigeTarget>(DEFAULT_PRESTIGE_TARGET);
  const [scopeByGoal, setScopeByGoal] = useState<Record<GoalId, ScopeId>>({
    prestige: ALL_SCOPE.id,
    kappa: ALL_SCOPE.id,
    'story-endings': ALL_SCOPE.id,
    lightkeeper: ALL_SCOPE.id,
  });

  useEffect(() => {
    setActiveGoalState(readGoal());
    setPrestigeTargetState(readPrestigeTarget());
    setScopeByGoal({
      prestige: readScope('prestige'),
      kappa: readScope('kappa'),
      'story-endings': readScope('story-endings'),
      lightkeeper: readScope('lightkeeper'),
    });
  }, []);

  const { progress } = usePlayerState();
  const { tasks: gameTasks, hideoutStations, dataLoaded } = useGameData();

  const derivedSets = useMemo(
    () => progress ? deriveProgressSets(progress) : null,
    [progress]
  );

  const setActiveGoal = useCallback((id: GoalId) => {
    setActiveGoalState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
  }, []);

  const setPrestigeTarget = useCallback((target: PrestigeTarget) => {
    setPrestigeTargetState(target);
    try { localStorage.setItem(PRESTIGE_TARGET_KEY, String(target)); } catch { /* noop */ }
  }, []);

  const setDirectiveScope = useCallback((goalId: GoalId, scopeId: ScopeId) => {
    const next = isValidScopeForGoal(goalId, scopeId) ? scopeId : ALL_SCOPE.id;
    setScopeByGoal((prev) => ({ ...prev, [goalId]: next }));
    try { localStorage.setItem(SCOPE_KEY_PREFIX + goalId, next); } catch { /* noop */ }
  }, []);

  const goalDefinition: GoalDefinition | null =
    activeGoal ? GOALS.find((g) => g.id === activeGoal) ?? null : null;

  const allGoalProgress = useMemo(() => {
    if (!dataLoaded || gameTasks.length === 0) return null;
    const map = new Map<GoalId, GoalProgress>();
    for (const goal of GOALS) {
      map.set(goal.id, computeGoalProgress(goal.id, gameTasks, progress, prestigeTarget, hideoutStations, derivedSets));
    }
    return map;
  }, [gameTasks, dataLoaded, progress, prestigeTarget, hideoutStations, derivedSets]);

  const activeGoalProgress = activeGoal && allGoalProgress
    ? allGoalProgress.get(activeGoal) ?? null
    : null;

  const directiveScope: ScopeId = activeGoal ? scopeByGoal[activeGoal] : ALL_SCOPE.id;

  const scopeOptions: ScopeOption[] = activeGoal ? getScopeOptions(activeGoal) : [ALL_SCOPE];

  const scopedProgress = useMemo<GoalProgress | null>(() => {
    if (!activeGoalProgress || !activeGoal) return null;
    if (directiveScope === ALL_SCOPE.id) return activeGoalProgress;
    const filteredOpen = filterTasksByScope(activeGoal, directiveScope, activeGoalProgress.openTasks);
    const filteredDone = filterTasksByScope(activeGoal, directiveScope, activeGoalProgress.completedTasks);
    const scoped = computeProgressForTasks([...filteredOpen, ...filteredDone], progress, derivedSets);
    if (activeGoalProgress.prestigeAxes) {
      scoped.prestigeAxes = activeGoalProgress.prestigeAxes;
      scoped.percentage = activeGoalProgress.percentage;
    }
    if (activeGoalProgress.xpRecommendedTasks) {
      scoped.xpRecommendedTasks = directiveScope === ALL_SCOPE.id
        ? activeGoalProgress.xpRecommendedTasks
        : filterTasksByScope(activeGoal, directiveScope, activeGoalProgress.xpRecommendedTasks);
    }
    return scoped;
  }, [activeGoal, directiveScope, activeGoalProgress, progress, derivedSets]);

  return {
    activeGoal,
    setActiveGoal,
    goalDefinition,
    allGoalProgress,
    activeGoalProgress,
    gameDataLoaded: dataLoaded,
    prestigeTarget,
    setPrestigeTarget,
    directiveScope,
    setDirectiveScope: useCallback(
      (scopeId: ScopeId) => {
        if (!activeGoal) return;
        setDirectiveScope(activeGoal, scopeId);
      },
      [activeGoal, setDirectiveScope]
    ),
    scopeOptions,
    scopedProgress,
  };
}
