import type { ProgressData } from '@/lib/api/tarkov-tracker/types';
import type { TarkovTask, HideoutStation } from '@/lib/api/tarkov-dev/types';

export interface DerivedProgressSets {
  completedTaskIds: Set<string>;
  failedTaskIds: Set<string>;
  completedModuleIds: Set<string>;
}

export function deriveProgressSets(progress: ProgressData): DerivedProgressSets {
  const completedTaskIds = new Set(
    progress.tasksProgress.filter((t) => t.complete).map((t) => t.id)
  );
  const failedTaskIds = new Set(
    progress.tasksProgress.filter((t) => t.failed).map((t) => t.id)
  );
  const completedModuleIds = new Set(
    progress.hideoutModulesProgress.filter((m) => m.complete).map((m) => m.id)
  );

  return { completedTaskIds, failedTaskIds, completedModuleIds };
}

export function getActionableTaskIds(
  progress: ProgressData,
  tasks: TarkovTask[],
  sets?: DerivedProgressSets,
): Set<string> {
  const { completedTaskIds, failedTaskIds } = sets ?? deriveProgressSets(progress);

  const actionable = new Set<string>();
  for (const task of tasks) {
    if (completedTaskIds.has(task.id) || failedTaskIds.has(task.id)) continue;
    if ((task.minPlayerLevel ?? 0) > progress.playerLevel) continue;
    if (task.trader.name === 'Fence') continue;

    const prereqsMet = (task.taskRequirements ?? []).every(
      (req) => completedTaskIds.has(req.task.id)
    );
    if (prereqsMet) actionable.add(task.id);
  }
  return actionable;
}

export function getTeammateOpenTaskIds(teammate: ProgressData): Set<string> {
  return new Set(
    teammate.tasksProgress
      .filter((t) => !t.complete && !t.failed)
      .map((t) => t.id)
  );
}

// ── Hideout: next incomplete level per station ───────────────────

export interface NextHideoutLevel {
  stationId: string;
  stationName: string;
  level: number;
  label: string;
  itemRequirements: Array<{ item: { id: string; name: string }; count: number }>;
}

export function getNextIncompleteLevels(
  completedModuleIds: Set<string>,
  hideoutStations: HideoutStation[],
): NextHideoutLevel[] {
  const result: NextHideoutLevel[] = [];
  for (const station of hideoutStations) {
    const sortedLevels = [...station.levels].sort((a, b) => a.level - b.level);
    for (const lvl of sortedLevels) {
      const moduleId = `${station.id}-${lvl.level}`;
      if (completedModuleIds.has(moduleId) || completedModuleIds.has(station.id)) continue;
      result.push({
        stationId: station.id,
        stationName: station.name,
        level: lvl.level,
        label: `${station.name} Lv${lvl.level}`,
        itemRequirements: lvl.itemRequirements,
      });
      break;
    }
  }
  return result;
}

export function getCompletedHideoutLevel(
  station: HideoutStation,
  completedModuleIds: Set<string>,
): number {
  let currentLevel = 0;
  for (const lvl of station.levels) {
    const moduleId = `${station.id}-${lvl.level}`;
    if (completedModuleIds.has(moduleId) || completedModuleIds.has(station.id)) {
      currentLevel = Math.max(currentLevel, lvl.level);
    }
  }
  return currentLevel;
}

// ── Boss spawn helpers ──────────────────────────────────────────

interface BossInfo {
  name: string;
  spawnChance: number;
}

export function getTopBoss(bosses: BossInfo[]): BossInfo | null {
  return bosses.reduce<BossInfo | null>(
    (best, b) => (!best || b.spawnChance > best.spawnChance ? b : best),
    null
  );
}

export function getTopBossSpawnChance(bosses: BossInfo[]): number {
  return bosses.reduce((max, b) => Math.max(max, b.spawnChance), 0);
}

export function getTotalBossChance(bosses: BossInfo[]): number {
  return bosses.reduce((sum, b) => sum + b.spawnChance, 0);
}
