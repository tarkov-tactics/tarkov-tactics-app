'use client';

import { useMemo } from 'react';
import { usePlayerState } from '@/hooks/use-player-state';
import { useTeamState } from '@/hooks/use-team-state';
import { useGameData } from '@/hooks/use-game-data';
import { useGoonReports } from '@/hooks/use-goon-reports';
import { useVibeConfig } from '@/features/vibes/hooks/use-vibe-config';
import { computeRaidPlan, type RaidPlanResult } from '../lib/engine';

const STALE_REPORT_MS = 30 * 60 * 1000; // mirrors ThreatAssessmentCard threshold

export function useRaidPlan() {
  const { progress, isConnected } = usePlayerState();
  const { teammates } = useTeamState();
  const { tasks: gameTasks, maps: gameMaps, hideoutStations, dataLoaded, isLoading } = useGameData();
  const { vibeModifier } = useVibeConfig();
  const { latest } = useGoonReports();

  // Goon sighting is a "fresh sighting *anywhere*" signal — the engine uses it
  // to colour the combat-strategy intel card and survival heuristic. The
  // per-map detail still lives in ThreatAssessmentCard.
  const hasGoonSighting = useMemo(() => {
    if (!latest) return false;
    const ageMs = Date.now() - Date.parse(latest.timestamp);
    return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < STALE_REPORT_MS;
  }, [latest]);

  const result: RaidPlanResult | null = useMemo(() => {
    if (!isConnected || !progress || !dataLoaded || gameTasks.length === 0) {
      return null;
    }
    return computeRaidPlan(
      progress,
      gameTasks,
      gameMaps,
      vibeModifier,
      teammates,
      hasGoonSighting,
      hideoutStations,
    );
  }, [isConnected, progress, dataLoaded, gameTasks, gameMaps, vibeModifier, teammates, hasGoonSighting, hideoutStations]);

  return {
    raidPlan: result?.plan ?? null,
    teamImpact: result?.teamImpact ?? [],
    mapScores: result?.mapScores ?? [],
    isLoading,
    dataLoaded,
  };
}
