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
import type {
  ProgressData,
  GameMode,
} from "@/lib/api/tarkov-tracker/types";

// ── Storage helpers ────────────────────────────────────────────────
const TOKEN_KEY = "tarkov-tracker-token";

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* incognito / disabled */
  }
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

// ── Types ──────────────────────────────────────────────────────────
export type ConnectionStatus =
  | "disconnected"
  | "validating"
  | "connected"
  | "error";

export interface PlayerStateContextValue {
  progress: ProgressData | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
  gameMode: GameMode | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  isConnected: boolean;
  connect: (token: string) => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
}

const PlayerStateContext = createContext<PlayerStateContextValue | null>(null);

// ── Detect game mode from token prefix ─────────────────────────────
function detectGameMode(token: string): GameMode | null {
  if (token.startsWith("PVE_") || token.startsWith("pve_")) return "pve";
  if (token.startsWith("PVP_") || token.startsWith("pvp_")) return "pvp";
  return "pvp";
}

// ── Provider ───────────────────────────────────────────────────────
export function PlayerStateProvider({ children }: { children: ReactNode }) {
  // Lazy-initialize token from localStorage (no effect needed)
  const [token, setToken] = useState<string | null>(() => readToken());
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode | null>(() => {
    const stored = readToken();
    return stored ? detectGameMode(stored) : null;
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch progress from the BFF proxy
  const fetchProgress = useCallback(async (tokenToUse: string, signal?: AbortSignal) => {
    setConnectionStatus("validating");
    setError(null);

    try {
      const response = await fetch("/api/tracker", {
        headers: { "x-tracker-token": tokenToUse },
        signal,
      });

      if (signal?.aborted) return;

      if (response.status === 429) {
        const body = await response.json();
        throw new Error(
          `Rate limited. Try again in ${body.retryAfter ?? 60}s`
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "Invalid or expired token. Check your permissions at tarkovtracker.org."
        );
      }

      if (!response.ok) {
        throw new Error(`TarkovTracker error (${response.status})`);
      }

      const json = await response.json();

      if (!json.data) {
        throw new Error("Unexpected response — no player data returned.");
      }

      if (signal?.aborted) return;

      setProgress(json.data);
      setConnectionStatus("connected");
      setLastUpdated(new Date());
      if (json.meta?.gameMode) {
        setGameMode(json.meta.gameMode);
      }
    } catch (err) {
      if (signal?.aborted) return;
      setConnectionStatus("error");
      setError(
        err instanceof Error ? err.message : "Unable to reach TarkovTracker"
      );
    }
  }, []);

  // Auto-fetch on mount if token exists
  // Wrapped in requestAnimationFrame to satisfy React 19's set-state-in-effect rule
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const id = requestAnimationFrame(() => {
      fetchProgress(token, controller.signal);
    });
    return () => {
      cancelAnimationFrame(id);
      controller.abort();
    };
  }, [token, fetchProgress]);

  const connect = useCallback(
    async (newToken: string) => {
      writeToken(newToken);
      setToken(newToken);
      setGameMode(detectGameMode(newToken));
      // token state change will trigger the effect above
    },
    []
  );

  const disconnect = useCallback(() => {
    clearToken();
    setToken(null);
    setProgress(null);
    setConnectionStatus("disconnected");
    setError(null);
    setGameMode(null);
    setLastUpdated(null);
  }, []);

  const refresh = useCallback(async () => {
    if (token) {
      await fetchProgress(token);
    }
  }, [token, fetchProgress]);

  const value = useMemo<PlayerStateContextValue>(
    () => ({
      progress,
      connectionStatus,
      error,
      gameMode,
      isLoading: connectionStatus === "validating",
      lastUpdated,
      isConnected: connectionStatus === "connected" && progress !== null,
      connect,
      disconnect,
      refresh,
    }),
    [
      progress,
      connectionStatus,
      error,
      gameMode,
      lastUpdated,
      connect,
      disconnect,
      refresh,
    ]
  );

  return (
    <PlayerStateContext.Provider value={value}>
      {children}
    </PlayerStateContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────
export function usePlayerState(): PlayerStateContextValue {
  const context = useContext(PlayerStateContext);
  if (!context) {
    throw new Error("usePlayerState must be used within a PlayerStateProvider");
  }
  return context;
}
