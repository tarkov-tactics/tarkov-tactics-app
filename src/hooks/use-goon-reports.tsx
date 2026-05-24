"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GOON_REPORTS_QUERY } from "@/lib/api/tarkov-dev/queries";
import type { GoonReport, TarkovDevGameMode } from "@/lib/api/tarkov-dev/types";
import { usePlayerState } from "@/hooks/use-player-state";

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // mark stale after 10 min without success

interface GoonReportsContextValue {
  reports: GoonReport[];
  latest: GoonReport | null;
  byMap: (mapId: string) => GoonReport | null;
  lastFetched: Date | null;
  isLoading: boolean;
  isStale: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const GoonReportsContext = createContext<GoonReportsContextValue | null>(null);

function toDevMode(mode: "pvp" | "pve" | null): TarkovDevGameMode | null {
  if (mode === "pvp") return "regular";
  if (mode === "pve") return "pve";
  return null;
}

function parseTimestamp(ts: string): number {
  // tarkov.dev returns a String — usually ISO 8601, sometimes unix seconds
  const asNum = Number(ts);
  if (!Number.isNaN(asNum) && asNum > 0) {
    // unix seconds → ms; unix ms stays as is
    return asNum < 1e12 ? asNum * 1000 : asNum;
  }
  const parsed = Date.parse(ts);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function GoonReportsProvider({ children }: { children: ReactNode }) {
  const { gameMode, isConnected } = usePlayerState();
  const devMode = toDevMode(gameMode);

  const [reports, setReports] = useState<GoonReport[]>([]);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef<AbortController | null>(null);

  const fetchReports = useCallback(
    async (mode: TarkovDevGameMode, signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/tarkov", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: GOON_REPORTS_QUERY,
            variables: { gameMode: mode },
          }),
          signal,
        });
        if (signal?.aborted) return;
        if (!res.ok) throw new Error(`goonReports fetch failed (${res.status})`);
        const json = await res.json();
        if (signal?.aborted) return;
        const next: GoonReport[] = json.data?.goonReports ?? [];
        next.sort((a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp));
        setReports(next);
        setLastFetched(new Date());
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load goon reports");
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    []
  );

  // Initial fetch + polling. Gated on having a known game mode (connected player).
  useEffect(() => {
    if (!isConnected || !devMode) return;

    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    const id = requestAnimationFrame(() => fetchReports(devMode, controller.signal));

    let intervalId: ReturnType<typeof setInterval> | null = null;
    function startPolling() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          fetchReports(devMode!, controller.signal);
        }
      }, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        // Catch-up fetch on tab return, then resume polling
        fetchReports(devMode!, controller.signal);
        startPolling();
      } else {
        stopPolling();
      }
    }

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(id);
      controller.abort();
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isConnected, devMode, fetchReports]);

  const refresh = useCallback(async () => {
    if (!devMode) return;
    await fetchReports(devMode);
  }, [devMode, fetchReports]);

  const byMap = useCallback(
    (mapId: string): GoonReport | null => {
      for (const r of reports) {
        if (r.map.id === mapId) return r;
      }
      return null;
    },
    [reports]
  );

  // Tick once a minute so `isStale` flips on schedule without a re-fetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const isStale = useMemo(() => {
    if (!lastFetched) return false;
    return now - lastFetched.getTime() > STALE_THRESHOLD_MS;
  }, [lastFetched, now]);

  const value = useMemo<GoonReportsContextValue>(
    () => ({
      reports,
      latest: reports[0] ?? null,
      byMap,
      lastFetched,
      isLoading,
      isStale,
      error,
      refresh,
    }),
    [reports, byMap, lastFetched, isLoading, isStale, error, refresh]
  );

  return (
    <GoonReportsContext.Provider value={value}>
      {children}
    </GoonReportsContext.Provider>
  );
}

export function useGoonReports(): GoonReportsContextValue {
  const ctx = useContext(GoonReportsContext);
  if (!ctx) {
    throw new Error("useGoonReports must be used within a GoonReportsProvider");
  }
  return ctx;
}
