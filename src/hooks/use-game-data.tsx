'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { TarkovTask, TarkovMap } from '@/lib/api/tarkov-dev/types';

// ── Types ──────────────────────────────────────────────────────────
export interface GameDataContextValue {
  tasks: TarkovTask[];
  maps: TarkovMap[];
  isLoading: boolean;
  error: string | null;
  dataLoaded: boolean;
  refresh: () => Promise<void>;
}

const GameDataContext = createContext<GameDataContextValue | null>(null);

// ── Queries ────────────────────────────────────────────────────────
const TASKS_GQL = `{
  tasks {
    id name
    trader { name }
    map { name }
    minPlayerLevel
    kappaRequired
    taskRequirements { task { id name } }
    objectives { id type description maps { name } }
  }
}`;

const MAPS_GQL = `{
  maps {
    id name description enemies raidDuration
    bosses { name spawnChance }
  }
}`;

// ── Provider ───────────────────────────────────────────────────────
export function GameDataProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<TarkovTask[]>([]);
  const [maps, setMaps] = useState<TarkovMap[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const fetchGameData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const [tasksRes, mapsRes] = await Promise.all([
        fetch('/api/tarkov', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: TASKS_GQL }),
          signal,
        }),
        fetch('/api/tarkov', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: MAPS_GQL }),
          signal,
        }),
      ]);

      if (signal?.aborted) return;

      if (!tasksRes.ok || !mapsRes.ok) {
        throw new Error(`Game data fetch failed (tasks: ${tasksRes.status}, maps: ${mapsRes.status})`);
      }

      const tasksJson = await tasksRes.json();
      const mapsJson = await mapsRes.json();
      if (signal?.aborted) return;

      const fetchedTasks = tasksJson.data?.tasks ?? [];
      const fetchedMaps = mapsJson.data?.maps ?? [];

      if (fetchedTasks.length === 0) {
        throw new Error('No task data returned from tarkov.dev');
      }

      setTasks(fetchedTasks);
      setMaps(fetchedMaps);
      setDataLoaded(true);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : 'Failed to load game data');
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    const controller = new AbortController();
    const id = requestAnimationFrame(() => {
      fetchGameData(controller.signal);
    });
    return () => {
      cancelAnimationFrame(id);
      controller.abort();
    };
  }, [fetchGameData]);

  const refresh = useCallback(async () => {
    await fetchGameData();
  }, [fetchGameData]);

  const value = useMemo<GameDataContextValue>(
    () => ({ tasks, maps, isLoading, error, dataLoaded, refresh }),
    [tasks, maps, isLoading, error, dataLoaded, refresh]
  );

  return (
    <GameDataContext.Provider value={value}>
      {children}
    </GameDataContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────
export function useGameData(): GameDataContextValue {
  const context = useContext(GameDataContext);
  if (!context) {
    throw new Error('useGameData must be used within a GameDataProvider');
  }
  return context;
}
