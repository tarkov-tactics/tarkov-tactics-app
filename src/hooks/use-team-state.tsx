"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProgressData } from "@/lib/api/tarkov-tracker/types";

// ── Storage helpers (same key as player state) ────────────────────
const TOKEN_KEY = "tarkov-tracker-token";

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// ── Types ──────────────────────────────────────────────────────────
export interface TeamStateContextValue {
  teammates: ProgressData[];
  hasTeamPermission: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  teamSize: number;
  refresh: () => Promise<void>;
}

const TeamStateContext = createContext<TeamStateContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────
export function TeamStateProvider({ children }: { children: ReactNode }) {
  const [token] = useState<string | null>(() => readToken());
  const [teammates, setTeammates] = useState<ProgressData[]>([]);
  const [hasTeamPermission, setHasTeamPermission] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTeamData = useCallback(
    async (tokenToUse: string, signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/tracker/team", {
          headers: { "x-tracker-token": tokenToUse },
          signal,
        });

        if (signal?.aborted) return;

        if (response.status === 403) {
          setHasTeamPermission(false);
          setTeammates([]);
          setIsLoading(false);
          return;
        }

        if (response.status === 429) {
          const body = await response.json();
          throw new Error(
            `Rate limited. Try again in ${body.retryAfter ?? 60}s`
          );
        }

        if (!response.ok) {
          throw new Error(`Team data error (${response.status})`);
        }

        const json = await response.json();

        if (signal?.aborted) return;

        setHasTeamPermission(true);
        setTeammates(json.data ?? []);
        setLastUpdated(new Date());
      } catch (err) {
        if (signal?.aborted) return;
        setError(
          err instanceof Error ? err.message : "Unable to fetch team data"
        );
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    []
  );

  // Auto-fetch on mount if token exists
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const id = requestAnimationFrame(() => {
      fetchTeamData(token, controller.signal);
    });
    return () => {
      cancelAnimationFrame(id);
      controller.abort();
    };
  }, [token, fetchTeamData]);

  const refresh = useCallback(async () => {
    const currentToken = readToken();
    if (currentToken) {
      await fetchTeamData(currentToken);
    }
  }, [fetchTeamData]);

  const value = useMemo<TeamStateContextValue>(
    () => ({
      teammates,
      hasTeamPermission,
      isLoading,
      error,
      lastUpdated,
      teamSize: teammates.length,
      refresh,
    }),
    [teammates, hasTeamPermission, isLoading, error, lastUpdated, refresh]
  );

  return (
    <TeamStateContext.Provider value={value}>
      {children}
    </TeamStateContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────
export function useTeamState(): TeamStateContextValue {
  const context = useContext(TeamStateContext);
  if (!context) {
    throw new Error("useTeamState must be used within a TeamStateProvider");
  }
  return context;
}

// ── Computed helpers (pure functions, usable anywhere) ─────────────

/** Tasks that both the player and 1+ teammates need (incomplete for both) */
export function getSharedOpenTasks(
  playerTaskIds: Set<string>,
  teammates: ProgressData[]
): Map<string, string[]> {
  // Map<taskId, [teammate display names who also need it]>
  const shared = new Map<string, string[]>();

  for (const teammate of teammates) {
    const teammateOpen = new Set(
      teammate.tasksProgress
        .filter((t) => !t.complete && !t.failed)
        .map((t) => t.id)
    );

    for (const taskId of playerTaskIds) {
      if (teammateOpen.has(taskId)) {
        const existing = shared.get(taskId) ?? [];
        existing.push(teammate.displayName);
        shared.set(taskId, existing);
      }
    }
  }

  return shared;
}

/** Count of shared open task objectives on a given map */
export function getTeamTaskOverlap(
  mapName: string,
  playerOpenTaskIds: Set<string>,
  teammates: ProgressData[],
  tasksByMap: Record<string, Array<{ id: string }>>
): number {
  const mapTasks = tasksByMap[mapName] ?? [];
  const mapTaskIds = new Set(mapTasks.map((t) => t.id));

  let overlap = 0;
  for (const teammate of teammates) {
    const teammateOpen = new Set(
      teammate.tasksProgress
        .filter((t) => !t.complete && !t.failed)
        .map((t) => t.id)
    );

    for (const taskId of mapTaskIds) {
      if (playerOpenTaskIds.has(taskId) && teammateOpen.has(taskId)) {
        overlap++;
      }
    }
  }

  return overlap;
}
