'use client';

import { useMemo } from 'react';
import { usePlayerState } from '@/hooks/use-player-state';
import { useTeamState } from '@/hooks/use-team-state';
import { useGameData } from '@/hooks/use-game-data';
import { useVibeConfig } from '@/features/vibes/hooks/use-vibe-config';
import { computeRaidPlan, type RaidPlanResult } from '../lib/engine';

export function useRaidPlan() {
  const { progress, isConnected } = usePlayerState();
  const { teammates } = useTeamState();
  const { tasks: gameTasks, maps: gameMaps, dataLoaded, isLoading } = useGameData();
  const { vibeModifier } = useVibeConfig();

  const result: RaidPlanResult | null = useMemo(() => {
    if (!isConnected || !progress || !dataLoaded || gameTasks.length === 0) {
      return null;
    }
    return computeRaidPlan(progress, gameTasks, gameMaps, vibeModifier, teammates);
  }, [isConnected, progress, dataLoaded, gameTasks, gameMaps, vibeModifier, teammates]);

  return {
    raidPlan: result?.plan ?? null,
    teamImpact: result?.teamImpact ?? [],
    mapScores: result?.mapScores ?? [],
    isLoading,
    dataLoaded,
  };
}
