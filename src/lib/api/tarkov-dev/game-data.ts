import { queryTarkovDev } from './client';
import { TASKS_QUERY, MAPS_QUERY, ITEMS_QUERY, HIDEOUT_STATIONS_QUERY } from './queries';
import type { TarkovTask, TarkovMap, TarkovItem, HideoutStation } from './types';

// ── Cached server-side data fetchers ──────────────────────────────

const REVALIDATE_SECONDS = 1800; // 30 minutes

export async function getGameTasks(): Promise<TarkovTask[]> {
  try {
    const data = await queryTarkovDev<{ tasks: TarkovTask[] }>(TASKS_QUERY);
    return data.tasks ?? [];
  } catch (e) {
    console.error('[game-data] Failed to fetch tasks:', e);
    return [];
  }
}

export async function getGameMaps(): Promise<TarkovMap[]> {
  try {
    const data = await queryTarkovDev<{ maps: TarkovMap[] }>(MAPS_QUERY);
    return data.maps ?? [];
  } catch (e) {
    console.error('[game-data] Failed to fetch maps:', e);
    return [];
  }
}

export async function getGameItems(): Promise<TarkovItem[]> {
  try {
    const data = await queryTarkovDev<{ items: TarkovItem[] }>(ITEMS_QUERY);
    return data.items ?? [];
  } catch (e) {
    console.error('[game-data] Failed to fetch items:', e);
    return [];
  }
}

export async function getHideoutStations(): Promise<HideoutStation[]> {
  try {
    const data = await queryTarkovDev<{ hideoutStations: HideoutStation[] }>(HIDEOUT_STATIONS_QUERY);
    return data.hideoutStations ?? [];
  } catch (e) {
    console.error('[game-data] Failed to fetch hideout stations:', e);
    return [];
  }
}

// ── Computed indexes ──────────────────────────────────────────────

export async function getTasksByMap(): Promise<Record<string, TarkovTask[]>> {
  const tasks = await getGameTasks();
  const byMap: Record<string, TarkovTask[]> = {};

  for (const task of tasks) {
    // Use the task's primary map
    const mapName = task.map?.name ?? 'Any';
    if (!byMap[mapName]) byMap[mapName] = [];
    byMap[mapName].push(task);

    // Also index by objective maps (tasks can have objectives on multiple maps)
    for (const obj of task.objectives) {
      for (const m of obj.maps) {
        if (m.name !== mapName) {
          if (!byMap[m.name]) byMap[m.name] = [];
          byMap[m.name].push(task);
        }
      }
    }
  }

  return byMap;
}

export async function getBossSpawnsByMap(): Promise<Record<string, Array<{ name: string; spawnChance: number }>>> {
  const maps = await getGameMaps();
  const result: Record<string, Array<{ name: string; spawnChance: number }>> = {};

  for (const map of maps) {
    if (map.bosses.length > 0) {
      result[map.name] = map.bosses.map((b) => ({
        name: b.name,
        spawnChance: b.spawnChance,
      }));
    }
  }

  return result;
}

// Re-export the revalidation interval for use in fetch options
export { REVALIDATE_SECONDS };
