import type {
  RaidPlan,
  MapRecommendation,
  LoadoutSuggestion,
  PrioritizedPOI,
  WatchlistItem,
  RiskIndicator,
  VibeIntelData,
} from './types';
import type { ProgressData } from '@/lib/api/tarkov-tracker/types';
import type { TarkovTask, TarkovMap } from '@/lib/api/tarkov-dev/types';
import type { VibeModifier } from '@/features/vibes/types';
import { getBossIntel } from './boss-intel';
import { getCombatProtocols } from './combat-protocols';

// ── Map Scoring ────────────────────────────────────────────────────

interface MapScore {
  mapName: string;
  score: number;
  questCount: number;
  teamOverlap: number;
}

function scoreMap(
  mapName: string,
  playerOpenTaskIds: Set<string>,
  tasks: TarkovTask[],
  vibeModifier: VibeModifier,
  maps: TarkovMap[],
  teammates: ProgressData[]
): MapScore {
  // Count open quest objectives on this map
  let questCount = 0;
  for (const task of tasks) {
    if (!playerOpenTaskIds.has(task.id)) continue;
    for (const obj of task.objectives) {
      if (obj.maps.some((m) => m.name === mapName)) questCount++;
    }
    if (task.map?.name === mapName) questCount++;
  }

  // Vibe map preference
  const mapData = maps.find((m) => m.name === mapName);
  let vibeMultiplier = 1.0;
  if (vibeModifier.poiPriority === 'boss') {
    const totalBossChance = (mapData?.bosses ?? []).reduce((s, b) => s + b.spawnChance, 0);
    vibeMultiplier = 1.0 + totalBossChance;
  } else if (vibeModifier.poiPriority === 'loot') {
    vibeMultiplier = vibeModifier.riskTolerance === 'low' ? 1.2 : 0.8;
  }

  // Risk penalty for low-risk vibes
  let riskPenalty = 0;
  if (vibeModifier.riskTolerance === 'low' && mapData) {
    const bossCount = mapData.bosses.length;
    riskPenalty = bossCount * 0.15;
  }

  // Team overlap bonus
  let teamOverlap = 0;
  for (const teammate of teammates) {
    const teammateOpen = new Set(
      teammate.tasksProgress.filter((t) => !t.complete && !t.failed).map((t) => t.id)
    );
    for (const task of tasks) {
      if (!playerOpenTaskIds.has(task.id)) continue;
      if (!teammateOpen.has(task.id)) continue;
      const onMap = task.map?.name === mapName ||
        task.objectives.some((o) => o.maps.some((m) => m.name === mapName));
      if (onMap) teamOverlap++;
    }
  }

  const score =
    questCount * vibeMultiplier * (1 - riskPenalty) + teamOverlap * 0.3;

  return { mapName, score, questCount, teamOverlap };
}

// ── Loadout Budget ─────────────────────────────────────────────────

const ARMOR_TIERS = [
  { level: 1, tier: 'Class 2', weapon: 'Pistol / Shotgun', rig: 'Basic rig', budget: 50000 },
  { level: 10, tier: 'Class 3', weapon: 'SMG / Budget AR', rig: 'Armored rig', budget: 150000 },
  { level: 20, tier: 'Class 4', weapon: 'Mid-tier AR', rig: 'TV-110', budget: 300000 },
  { level: 30, tier: 'Class 5', weapon: 'Modded AK / M4', rig: 'AVS / Tactec', budget: 500000 },
  { level: 40, tier: 'Class 6', weapon: 'Meta weapon', rig: 'Slick + Rig', budget: 800000 },
];

function computeLoadout(playerLevel: number, vibeModifier: VibeModifier): LoadoutSuggestion {
  const baseTier = ARMOR_TIERS.reduce(
    (best, t) => (playerLevel >= t.level ? t : best),
    ARMOR_TIERS[0]
  );
  const budget = Math.round(baseTier.budget * vibeModifier.gearBudgetMultiplier);

  return {
    weapon: baseTier.weapon,
    armor: baseTier.tier,
    rig: baseTier.rig,
    estimatedBudget: budget,
  };
}

// ── POI Ranking ────────────────────────────────────────────────────

function rankPOIs(
  mapName: string,
  tasks: TarkovTask[],
  playerOpenTaskIds: Set<string>,
  vibeModifier: VibeModifier,
  maps: TarkovMap[]
): PrioritizedPOI[] {
  const pois: PrioritizedPOI[] = [];
  const mapData = maps.find((m) => m.name === mapName);

  // Quest-driven POIs
  for (const task of tasks) {
    if (!playerOpenTaskIds.has(task.id)) continue;
    for (const obj of task.objectives) {
      if (obj.maps.some((m) => m.name === mapName)) {
        pois.push({
          name: `${task.trader.name}: ${obj.description}`,
          lootExpectation: task.name,
          riskLevel: vibeModifier.riskTolerance === 'low' ? 'low' : 'medium',
        });
      }
    }
  }

  // Boss POIs
  if (vibeModifier.poiPriority === 'boss' && mapData) {
    for (const boss of mapData.bosses) {
      if (boss.spawnChance > 0) {
        pois.push({
          name: `${boss.name} spawn`,
          lootExpectation: `Boss loot (${Math.round(boss.spawnChance * 100)}% spawn)`,
          riskLevel: 'high',
        });
      }
    }
  }

  return pois.slice(0, 5);
}

// ── Watchlist ──────────────────────────────────────────────────────

function buildWatchlist(
  tasks: TarkovTask[],
  playerOpenTaskIds: Set<string>,
  vibeModifier: VibeModifier
): WatchlistItem[] {
  const items: WatchlistItem[] = [];

  for (const task of tasks) {
    if (!playerOpenTaskIds.has(task.id)) continue;
    for (const obj of task.objectives) {
      if (obj.type === 'giveItem' || obj.type === 'findItem') {
        items.push({
          itemId: obj.id,
          itemName: obj.description,
          priorityScore:
            vibeModifier.poiPriority === 'loot' ? 2 : 1,
          reason: `Quest: ${task.name} (${task.trader.name})`,
        });
      }
    }
  }

  return items
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8);
}

// ── Risk Assessment ────────────────────────────────────────────────

function assessRisks(mapName: string, maps: TarkovMap[]): RiskIndicator[] {
  const mapData = maps.find((m) => m.name === mapName);
  if (!mapData) return [];

  const risks: RiskIndicator[] = [];

  for (const boss of mapData.bosses) {
    if (boss.spawnChance > 0) {
      risks.push({
        type: 'boss',
        description: `${boss.name} — ${Math.round(boss.spawnChance * 100)}% spawn`,
        severity: boss.spawnChance > 0.5 ? 'high' : boss.spawnChance > 0.2 ? 'medium' : 'low',
      });
    }
  }

  // PvP density heuristic
  const highPvpMaps = ['Customs', 'Factory', 'Interchange', 'Reserve'];
  const medPvpMaps = ['Shoreline', 'Streets of Tarkov'];
  if (highPvpMaps.includes(mapName)) {
    risks.push({ type: 'pmc', description: 'High PMC density', severity: 'high' });
  } else if (medPvpMaps.includes(mapName)) {
    risks.push({ type: 'pmc', description: 'Medium PMC density', severity: 'medium' });
  } else {
    risks.push({ type: 'pmc', description: 'Low PMC density', severity: 'low' });
  }

  return risks;
}

// ── Vibe Intel Data ────────────────────────────────────────────────

function computeVibeIntelData(
  vibe: VibeModifier,
  mapName: string,
  questCount: number,
  topBossSpawnChance: number,
  hasGoonSighting: boolean,
  maps: TarkovMap[]
): VibeIntelData {
  switch (vibe.intelCard) {
    case 'quick-analysis': {
      // Loot Density: clamp(questCount × 12, 0, 100) → ~8 quests fills the bar.
      const lootDensity = Math.max(0, Math.min(100, Math.round(questCount * 12)));
      // Survival: inverse of danger heuristic — high boss chance + goons → low.
      const dangerSignal = topBossSpawnChance * 0.7 + (hasGoonSighting ? 0.3 : 0);
      const survivalProbability = Math.max(
        10,
        Math.min(95, Math.round((1 - dangerSignal) * 100))
      );
      return { kind: 'quick-analysis', lootDensity, survivalProbability };
    }
    case 'boss-encounter': {
      const mapData = maps.find((m) => m.name === mapName);
      const topBoss = mapData?.bosses.reduce<{ name: string; spawnChance: number } | null>(
        (best, b) => (!best || b.spawnChance > best.spawnChance ? b : best),
        null
      );
      const bossName = topBoss?.name ?? null;
      const intel = bossName ? getBossIntel(mapName, bossName) : null;
      return { kind: 'boss-encounter', bossName, mapName, intel };
    }
    case 'combat-strategy':
      return {
        kind: 'combat-strategy',
        mapName,
        protocols: getCombatProtocols(mapName, hasGoonSighting),
      };
  }
}

// ── Main Engine ────────────────────────────────────────────────────

export interface TeamImpact {
  name: string;
  questCount: number;
}

export interface RaidPlanResult {
  plan: RaidPlan;
  teamImpact: TeamImpact[];
  mapScores: MapScore[];
}

export function computeRaidPlan(
  progress: ProgressData,
  tasks: TarkovTask[],
  maps: TarkovMap[],
  vibeModifier: VibeModifier,
  teammates: ProgressData[],
  hasGoonSighting = false
): RaidPlanResult {
  const playerOpenTaskIds = new Set(
    progress.tasksProgress
      .filter((t) => !t.complete && !t.failed)
      .map((t) => t.id)
  );

  // Score all maps
  const uniqueMapNames = [...new Set(maps.map((m) => m.name))];
  const mapScores = uniqueMapNames
    .map((name) =>
      scoreMap(name, playerOpenTaskIds, tasks, vibeModifier, maps, teammates)
    )
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestMap = mapScores[0] ?? {
    mapName: 'Customs',
    score: 0,
    questCount: 0,
    teamOverlap: 0,
  };

  const bestMapData = maps.find((m) => m.name === bestMap.mapName);
  const mapRec: MapRecommendation = {
    mapId: bestMapData?.id ?? bestMap.mapName.toLowerCase().replace(/\s+/g, '-'),
    mapName: bestMap.mapName,
    reasoning: buildReasoning(bestMap, vibeModifier),
    questObjectiveCount: bestMap.questCount,
    raidDurationMin: bestMapData?.raidDuration ?? null,
  };

  const loadout = computeLoadout(progress.playerLevel, vibeModifier);
  const pois = rankPOIs(bestMap.mapName, tasks, playerOpenTaskIds, vibeModifier, maps);
  const watchlist = buildWatchlist(tasks, playerOpenTaskIds, vibeModifier);
  const risks = assessRisks(bestMap.mapName, maps);

  const topBossSpawnChance = (bestMapData?.bosses ?? []).reduce(
    (max, b) => Math.max(max, b.spawnChance),
    0
  );
  const vibeIntelData = computeVibeIntelData(
    vibeModifier,
    bestMap.mapName,
    bestMap.questCount,
    topBossSpawnChance,
    hasGoonSighting,
    maps
  );

  // Team impact
  const teamImpact: TeamImpact[] = [];
  for (const teammate of teammates) {
    const tmOpen = new Set(
      teammate.tasksProgress.filter((t) => !t.complete && !t.failed).map((t) => t.id)
    );
    let count = 0;
    for (const task of tasks) {
      if (!tmOpen.has(task.id)) continue;
      const onMap = task.map?.name === bestMap.mapName ||
        task.objectives.some((o) => o.maps.some((m) => m.name === bestMap.mapName));
      if (onMap) count++;
    }
    if (count > 0) {
      teamImpact.push({ name: teammate.displayName, questCount: count });
    }
  }

  return {
    plan: { map: mapRec, loadout, pois, watchlist, risks, vibeIntelData },
    teamImpact: teamImpact.sort((a, b) => b.questCount - a.questCount),
    mapScores: mapScores.slice(0, 5),
  };
}

function buildReasoning(mapScore: MapScore, vibe: VibeModifier): string {
  const parts: string[] = [];
  if (mapScore.questCount > 0) {
    parts.push(`${mapScore.questCount} open quest objective${mapScore.questCount > 1 ? 's' : ''}`);
  }
  if (mapScore.teamOverlap > 0) {
    parts.push(`${mapScore.teamOverlap} shared with teammates`);
  }
  if (vibe.poiPriority === 'boss') parts.push('optimized for boss spawns');
  if (vibe.poiPriority === 'loot') parts.push('favored for safe loot routes');
  return parts.length > 0 ? parts.join(' · ') : 'Best available option for your current progress';
}
