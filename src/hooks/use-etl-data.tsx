'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  EtlManifest,
  SpawnClusterData,
  NamedPoisData,
  LootProbData,
  QuestEnhData,
} from '@/lib/etl/types';
import { EXPECTED_SCHEMA_VERSION } from '@/lib/etl/types';
import { computeSha256 } from '@/lib/etl/sha256';

const ETL_BASE_URL =
  process.env.NEXT_PUBLIC_ETL_BASE_URL ??
  'https://tarkov-tactics.github.io/tarkov-tactics-llm-etl';

const FETCH_TIMEOUT_MS = 15_000;
const RETRY_INTERVAL_MS = 5 * 60 * 1000;
const STALENESS_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type FileStatus = 'pending' | 'loaded' | 'failed';

export interface EtlProvenance {
  version: string;
  gamePatch: string;
  generatedAt: string;
}

export interface EtlDataContextValue {
  spawnClusters: SpawnClusterData | null;
  namedPois: NamedPoisData | null;
  lootProbabilities: LootProbData | null;
  questEnhancements: QuestEnhData | null;

  isLoading: boolean;
  provenance: EtlProvenance | null;
  fileStatus: Record<string, FileStatus>;
  staleness: boolean;

  refresh: () => Promise<void>;
}

const EtlDataContext = createContext<EtlDataContextValue | null>(null);

// ── File loader with SHA-256 validation ─────────────────────────

async function fetchAndValidate<T>(
  baseUrl: string,
  fileName: string,
  expectedHash: string,
  signal?: AbortSignal,
): Promise<T | null> {
  const url = `${baseUrl}/latest/${fileName}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;

  const text = await res.text();
  if (signal?.aborted) return null;

  const hash = await computeSha256(text);
  if (hash !== expectedHash) {
    console.warn(`[ETL] SHA-256 mismatch for ${fileName}: expected ${expectedHash}, got ${hash}`);
    return null;
  }

  return JSON.parse(text) as T;
}

// ── Provider ────────────────────────────────────────────────────

export function EtlDataProvider({ children }: { children: ReactNode }) {
  const [spawnClusters, setSpawnClusters] = useState<SpawnClusterData | null>(null);
  const [namedPois, setNamedPois] = useState<NamedPoisData | null>(null);
  const [lootProbabilities, setLootProbabilities] = useState<LootProbData | null>(null);
  const [questEnhancements, setQuestEnhancements] = useState<QuestEnhData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [provenance, setProvenance] = useState<EtlProvenance | null>(null);
  const [fileStatus, setFileStatus] = useState<Record<string, FileStatus>>({});
  const [staleness, setStaleness] = useState(false);

  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const manifestRef = useRef<EtlManifest | null>(null);

  const loadFiles = useCallback(async (signal?: AbortSignal, retryOnly = false) => {
    if (!retryOnly) setIsLoading(true);

    try {
      let manifest = manifestRef.current;

      if (!manifest) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        const combinedSignal = signal
          ? AbortSignal.any([signal, controller.signal])
          : controller.signal;

        try {
          const res = await fetch(`${ETL_BASE_URL}/latest/manifest.json`, {
            signal: combinedSignal,
          });
          clearTimeout(timeout);
          if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
          manifest = (await res.json()) as EtlManifest;
        } catch (err) {
          clearTimeout(timeout);
          if (signal?.aborted) return;
          console.warn('[ETL] Manifest unavailable — using runtime fallbacks', err);
          if (!retryOnly) setIsLoading(false);
          return;
        }

        if (manifest.schema_version !== EXPECTED_SCHEMA_VERSION) {
          console.warn(
            `[ETL] Schema version mismatch: expected ${EXPECTED_SCHEMA_VERSION}, got ${manifest.schema_version}`,
          );
          if (!retryOnly) setIsLoading(false);
          return;
        }

        manifestRef.current = manifest;
        setProvenance({
          version: manifest.version,
          gamePatch: manifest.game_patch,
          generatedAt: manifest.generated_at,
        });

        const age = Date.now() - new Date(manifest.generated_at).getTime();
        setStaleness(age > STALENESS_THRESHOLD_MS);
      }

      if (signal?.aborted) return;

      const filesToLoad = manifest.files.filter((f) => {
        if (!retryOnly) return true;
        const current = fileStatus[f.name];
        return current === 'failed' || current === 'pending';
      });

      const pending: Record<string, FileStatus> = {};
      for (const f of filesToLoad) pending[f.name] = 'pending';
      if (!retryOnly) setFileStatus(pending);

      const setters: Record<string, (data: unknown) => void> = {
        'spawn-clusters.json': (d) => setSpawnClusters(d as SpawnClusterData),
        'named-pois.json': (d) => setNamedPois(d as NamedPoisData),
        'loot-probabilities.json': (d) => setLootProbabilities(d as LootProbData),
        'quest-enhancements.json': (d) => setQuestEnhancements(d as QuestEnhData),
      };

      // Load small files first, large loot-probabilities last
      const sortedFiles = [...filesToLoad].sort((a, b) => a.size_bytes - b.size_bytes);

      const results: Record<string, FileStatus> = {};

      for (const file of sortedFiles) {
        if (signal?.aborted) return;

        const data = await fetchAndValidate(ETL_BASE_URL, file.name, file.sha256, signal);

        if (signal?.aborted) return;

        if (data) {
          results[file.name] = 'loaded';
          setters[file.name]?.(data);
          console.log(`[ETL] Loaded ${file.name} (${(file.size_bytes / 1024).toFixed(0)} KB)`);
        } else {
          results[file.name] = 'failed';
          console.warn(`[ETL] Failed to load ${file.name}`);
        }

        setFileStatus((prev) => ({ ...prev, [file.name]: results[file.name] }));
      }

      const hasFailures = Object.values(results).some((s) => s === 'failed');
      if (!hasFailures && retryRef.current) {
        clearInterval(retryRef.current);
        retryRef.current = null;
      }
    } catch (err) {
      if (signal?.aborted) return;
      console.warn('[ETL] Unexpected error during load', err);
    } finally {
      if (!signal?.aborted && !retryOnly) setIsLoading(false);
    }
  }, [fileStatus]);

  useEffect(() => {
    const controller = new AbortController();
    const id = requestAnimationFrame(() => {
      loadFiles(controller.signal).then(() => {
        if (controller.signal.aborted) return;
        retryRef.current = setInterval(() => {
          loadFiles(undefined, true);
        }, RETRY_INTERVAL_MS);
      });
    });
    return () => {
      cancelAnimationFrame(id);
      controller.abort();
      if (retryRef.current) clearInterval(retryRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    manifestRef.current = null;
    await loadFiles();
  }, [loadFiles]);

  const value = useMemo<EtlDataContextValue>(
    () => ({
      spawnClusters,
      namedPois,
      lootProbabilities,
      questEnhancements,
      isLoading,
      provenance,
      fileStatus,
      staleness,
      refresh,
    }),
    [spawnClusters, namedPois, lootProbabilities, questEnhancements, isLoading, provenance, fileStatus, staleness, refresh],
  );

  return (
    <EtlDataContext.Provider value={value}>
      {children}
    </EtlDataContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────────

export function useEtlData(): EtlDataContextValue {
  const ctx = useContext(EtlDataContext);
  if (!ctx) {
    throw new Error('useEtlData must be used within an EtlDataProvider');
  }
  return ctx;
}
