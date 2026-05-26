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
import type { TarkovTask, TarkovMap, HideoutStation } from '@/lib/api/tarkov-dev/types';
import type { VibeModifier } from '@/features/vibes/types';
import { getBossIntel } from './boss-intel';
import { getCombatProtocols } from './combat-protocols';

// ── Actionable Task Filter ─────────────────────────────────────────

function getActionableTaskIds(
  progress: ProgressData,
  tasks: TarkovTask[],
): Set<string> {
  const completedIds = new Set(
    progress.tasksProgress.filter((t) => t.complete).map((t) => t.id)
  );
  const failedIds = new Set(
    progress.tasksProgress.filter((t) => t.failed).map((t) => t.id)
  );

  const actionable = new Set<string>();
  for (const task of tasks) {
    if (completedIds.has(task.id) || failedIds.has(task.id)) continue;
    if ((task.minPlayerLevel ?? 0) > progress.playerLevel) continue;
    if (task.trader.name === 'Fence') continue;

    const prereqsMet = (task.taskRequirements ?? []).every(
      (req) => completedIds.has(req.task.id)
    );
    if (prereqsMet) actionable.add(task.id);
  }
  return actionable;
}

// ── Early-Game Progression Bonus ──────────────────────────────────

const FLEA_MARKET_LEVEL = 15;
const TRADER_UNLOCK_QUESTS = new Set([
  'Debut', 'Shootout Picnic', 'Checking', 'Shortage',
  'Introduction', 'Acquaintance', 'Friend From the West - Part 1',
]);

function getProgressionMultiplier(
  task: TarkovTask,
  playerLevel: number,
): number {
  if (playerLevel >= FLEA_MARKET_LEVEL) return 1.0;

  if (TRADER_UNLOCK_QUESTS.has(task.name)) return 2.5;

  const unlocksOtherTasks = (task.taskRequirements?.length ?? 0) === 0;
  if (unlocksOtherTasks && task.minPlayerLevel <= 5) return 1.5;

  return 1.0;
}

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
  teammates: ProgressData[],
  playerLevel: number,
): MapScore {
  let questCount = 0;
  let weightedScore = 0;
  for (const task of tasks) {
    if (!playerOpenTaskIds.has(task.id)) continue;
    const multiplier = getProgressionMultiplier(task, playerLevel);
    for (const obj of task.objectives) {
      if (obj.maps.some((m) => m.name === mapName)) {
        questCount++;
        weightedScore += multiplier;
      }
    }
    if (task.map?.name === mapName) {
      questCount++;
      weightedScore += multiplier;
    }
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
    weightedScore * vibeMultiplier * (1 - riskPenalty) + teamOverlap * 0.3;

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

interface MapPOI {
  name: string;
  lootTypes: string[];
  risk: 'low' | 'medium' | 'high';
}

const MAP_POIS: Record<string, MapPOI[]> = {
  'Ground Zero': [
    { name: 'TerraGroup Parking Lot', lootTypes: ['electronics', 'medical', 'weapons'], risk: 'medium' },
    { name: 'Mira Avenue Shops', lootTypes: ['food', 'medical', 'barter'], risk: 'low' },
    { name: 'Police Checkpoint', lootTypes: ['weapons', 'ammo', 'armor'], risk: 'medium' },
    { name: 'Southern Apartments', lootTypes: ['electronics', 'barter', 'medical'], risk: 'low' },
    { name: 'Pinewood Hotel', lootTypes: ['valuables', 'electronics'], risk: 'medium' },
  ],
  'Customs': [
    { name: 'Dorms (3-Story)', lootTypes: ['valuables', 'weapons', 'medical', 'quest'], risk: 'high' },
    { name: 'Dorms (2-Story)', lootTypes: ['valuables', 'medical', 'quest'], risk: 'high' },
    { name: 'Crack House', lootTypes: ['medical', 'electronics', 'barter'], risk: 'medium' },
    { name: 'USEC Stash (Big Red)', lootTypes: ['weapons', 'ammo', 'armor'], risk: 'medium' },
    { name: 'Gas Station', lootTypes: ['medical', 'food', 'barter'], risk: 'medium' },
    { name: 'Warehouse (New Gas)', lootTypes: ['electronics', 'barter', 'weapons'], risk: 'low' },
    { name: 'Military Checkpoint', lootTypes: ['ammo', 'weapons', 'armor'], risk: 'medium' },
  ],
  'Woods': [
    { name: 'USEC Camp', lootTypes: ['weapons', 'ammo', 'armor', 'medical'], risk: 'medium' },
    { name: 'Sawmill', lootTypes: ['weapons', 'valuables', 'quest'], risk: 'high' },
    { name: 'Abandoned Village', lootTypes: ['food', 'barter', 'medical'], risk: 'low' },
    { name: 'ZB-014 Bunker', lootTypes: ['electronics', 'medical', 'ammo'], risk: 'low' },
    { name: 'Sunken Village', lootTypes: ['medical', 'barter', 'food'], risk: 'low' },
    { name: 'Scav House', lootTypes: ['barter', 'weapons', 'ammo'], risk: 'medium' },
  ],
  'Shoreline': [
    { name: 'Resort (East Wing)', lootTypes: ['valuables', 'electronics', 'medical', 'weapons'], risk: 'high' },
    { name: 'Resort (West Wing)', lootTypes: ['valuables', 'electronics', 'medical'], risk: 'high' },
    { name: 'Pier', lootTypes: ['barter', 'food', 'electronics'], risk: 'medium' },
    { name: 'Village', lootTypes: ['medical', 'food', 'barter'], risk: 'low' },
    { name: 'Power Station', lootTypes: ['electronics', 'barter', 'weapons'], risk: 'medium' },
    { name: 'Gas Station', lootTypes: ['medical', 'food', 'electronics'], risk: 'medium' },
  ],
  'Interchange': [
    { name: 'IDEA Store', lootTypes: ['barter', 'electronics', 'food'], risk: 'medium' },
    { name: 'OLI Store', lootTypes: ['barter', 'electronics', 'fuel'], risk: 'medium' },
    { name: 'Goshan Store', lootTypes: ['food', 'medical', 'barter'], risk: 'medium' },
    { name: 'KIBA Store', lootTypes: ['weapons', 'armor', 'ammo'], risk: 'high' },
    { name: 'Tech Stores (2nd Floor)', lootTypes: ['electronics', 'valuables'], risk: 'high' },
    { name: 'Power Station', lootTypes: ['electronics', 'barter'], risk: 'low' },
  ],
  'Reserve': [
    { name: 'Black Knight', lootTypes: ['weapons', 'ammo', 'electronics'], risk: 'high' },
    { name: 'White Knight', lootTypes: ['weapons', 'armor', 'ammo'], risk: 'high' },
    { name: 'Marked Room (RB-BK)', lootTypes: ['valuables', 'weapons', 'rare'], risk: 'high' },
    { name: 'Underground Bunker', lootTypes: ['electronics', 'medical', 'ammo'], risk: 'medium' },
    { name: 'Helicopter Area', lootTypes: ['weapons', 'ammo', 'valuables'], risk: 'high' },
  ],
  'Lighthouse': [
    { name: 'Water Treatment Plant', lootTypes: ['electronics', 'valuables', 'weapons'], risk: 'high' },
    { name: 'Chalet Area', lootTypes: ['valuables', 'electronics', 'barter'], risk: 'medium' },
    { name: 'Rogue Camp', lootTypes: ['weapons', 'ammo', 'armor'], risk: 'high' },
    { name: 'Southern Road', lootTypes: ['barter', 'food', 'medical'], risk: 'low' },
  ],
  'Factory': [
    { name: 'Office Area', lootTypes: ['electronics', 'valuables', 'weapons'], risk: 'high' },
    { name: 'Gate 3 Corridor', lootTypes: ['weapons', 'ammo'], risk: 'high' },
    { name: 'Showers', lootTypes: ['medical', 'barter'], risk: 'medium' },
  ],
  'Streets of Tarkov': [
    { name: 'Concordia Apartments', lootTypes: ['valuables', 'electronics', 'medical'], risk: 'high' },
    { name: 'Lexos Car Dealership', lootTypes: ['valuables', 'electronics'], risk: 'medium' },
    { name: 'Pinewood Hotel', lootTypes: ['valuables', 'electronics', 'barter'], risk: 'medium' },
    { name: 'Cardinal Building', lootTypes: ['electronics', 'weapons'], risk: 'high' },
    { name: 'Abandoned Factory', lootTypes: ['barter', 'weapons', 'ammo'], risk: 'medium' },
  ],
  'The Lab': [
    { name: 'Manager Office', lootTypes: ['valuables', 'electronics', 'rare'], risk: 'high' },
    { name: 'Weapons Testing Area', lootTypes: ['weapons', 'ammo', 'armor'], risk: 'high' },
    { name: 'Medical Block', lootTypes: ['medical', 'electronics'], risk: 'medium' },
    { name: 'Server Room', lootTypes: ['electronics', 'valuables'], risk: 'medium' },
  ],
};

const ITEM_LOOT_CATEGORIES: Record<string, string[]> = {
  'salewa': ['medical'],
  'morphine': ['medical'],
  'cms': ['medical'],
  'ifak': ['medical'],
  'medkit': ['medical'],
  'module-3m': ['armor'],
  'body armor': ['armor'],
  'shotgun': ['weapons'],
  'pistol': ['weapons'],
  'rifle': ['weapons'],
  'mp-133': ['weapons'],
  'toz': ['weapons'],
  'dogtag': ['quest'],
  'whiskey': ['food'],
  'tarcola': ['food'],
  'figurine': ['barter', 'valuables'],
  'flash drive': ['electronics'],
  'usb': ['electronics'],
};

function matchItemToLootCategory(description: string): string[] {
  const lower = description.toLowerCase();
  for (const [keyword, categories] of Object.entries(ITEM_LOOT_CATEGORIES)) {
    if (lower.includes(keyword)) return categories;
  }
  return [];
}

const HIDEOUT_ITEM_CATEGORIES: Record<string, string[]> = {
  'salewa': ['medical'],
  'car first aid kit': ['medical'],
  'ifak': ['medical'],
  'grizzly': ['medical'],
  'hose': ['barter'],
  'bolts': ['barter'],
  'nut': ['barter'],
  'screw': ['barter'],
  'bulb': ['barter', 'electronics'],
  'wire': ['electronics'],
  'relay': ['electronics'],
  'circuit': ['electronics'],
  'battery': ['electronics'],
  'cpu fan': ['electronics'],
  'power supply': ['electronics'],
  'gpu': ['electronics'],
  'graphics card': ['electronics'],
  'gas analyzer': ['electronics'],
  'fuel': ['fuel'],
  'expeditionary fuel': ['fuel'],
  'metal fuel tank': ['fuel'],
  'drill': ['barter'],
  'wrench': ['barter'],
  'screwdriver': ['barter'],
  'tape': ['barter'],
  'pliers': ['barter'],
  'capacitor': ['electronics'],
  'motor': ['barter'],
  'filter': ['barter'],
  'tube': ['medical'],
  'ledx': ['electronics', 'medical'],
};

function matchHideoutItemToCategories(name: string): string[] {
  const lower = name.toLowerCase();
  for (const [keyword, categories] of Object.entries(HIDEOUT_ITEM_CATEGORIES)) {
    if (lower.includes(keyword)) return categories;
  }
  return [];
}

interface HideoutNeed {
  itemName: string;
  stationLabel: string;
  categories: string[];
}

function getHideoutNeeds(
  progress: ProgressData,
  hideoutStations: HideoutStation[],
): HideoutNeed[] {
  const completedModuleIds = new Set(
    progress.hideoutModulesProgress.filter((m) => m.complete).map((m) => m.id)
  );
  const needs: HideoutNeed[] = [];

  for (const station of hideoutStations) {
    const sortedLevels = [...station.levels].sort((a, b) => a.level - b.level);
    for (const lvl of sortedLevels) {
      const moduleId = `${station.id}-${lvl.level}`;
      if (completedModuleIds.has(moduleId) || completedModuleIds.has(station.id)) continue;

      for (const req of lvl.itemRequirements) {
        needs.push({
          itemName: req.item.name,
          stationLabel: `${station.name} Lv${lvl.level}`,
          categories: matchHideoutItemToCategories(req.item.name),
        });
      }
      break;
    }
  }
  return needs;
}

function rankPOIs(
  mapName: string,
  tasks: TarkovTask[],
  playerOpenTaskIds: Set<string>,
  vibeModifier: VibeModifier,
  maps: TarkovMap[],
  progress: ProgressData,
  hideoutStations: HideoutStation[],
): PrioritizedPOI[] {
  const mapData = maps.find((m) => m.name === mapName);
  const knownPOIs = MAP_POIS[mapName] ?? [];

  interface POIItemInfo { reason: string; wikiLink?: string }
  const neededCategories = new Set<string>();
  const neededItemNames = new Map<string, Map<string, POIItemInfo>>();
  const questContext = new Map<string, string[]>();

  // Quest-driven needs — use structured item data from the API
  for (const task of tasks) {
    if (!playerOpenTaskIds.has(task.id)) continue;
    for (const obj of task.objectives) {
      const mapsForObj = obj.maps.map((m) => m.name);
      const taskMap = task.map?.name ?? '';
      const isMapSpecific = mapsForObj.includes(mapName) || (mapsForObj.length === 0 && taskMap === mapName);
      const isItemObj = ['giveItem', 'findItem', 'findQuestItem'].includes(obj.type);
      const isAnyMap = mapsForObj.length === 0 && !taskMap;

      if (!isMapSpecific && !(isItemObj && isAnyMap)) continue;

      const itemRef = obj.item ?? obj.questItem;
      const categories = itemRef ? matchItemToLootCategory(itemRef.name) : matchItemToLootCategory(obj.description);
      for (const cat of categories) neededCategories.add(cat);

      for (const poi of knownPOIs) {
        const overlaps = poi.lootTypes.some((lt) => categories.includes(lt));
        if (overlaps || isMapSpecific) {
          const ctx = questContext.get(poi.name) ?? [];
          ctx.push(`${task.name}: ${obj.description}`);
          questContext.set(poi.name, ctx);

          if (itemRef && overlaps) {
            const fir = obj.foundInRaid === true;
            const pillLabel = fir ? `${itemRef.name} - FIR` : itemRef.name;
            const items = neededItemNames.get(poi.name) ?? new Map<string, POIItemInfo>();
            if (!items.has(pillLabel)) {
              items.set(pillLabel, { reason: `${task.trader.name}: ${task.name}`, wikiLink: task.wikiLink });
            }
            neededItemNames.set(poi.name, items);
          }
        }
      }
    }
  }

  // Hideout-driven needs — boost POIs that spawn items needed for hideout upgrades
  const hideoutNeeds = getHideoutNeeds(progress, hideoutStations);
  for (const need of hideoutNeeds) {
    for (const cat of need.categories) neededCategories.add(cat);

    for (const poi of knownPOIs) {
      if (poi.lootTypes.some((lt) => need.categories.includes(lt))) {
        const items = neededItemNames.get(poi.name) ?? new Map<string, POIItemInfo>();
        if (!items.has(need.itemName)) {
          items.set(need.itemName, { reason: `Hideout: ${need.stationLabel}` });
        }
        neededItemNames.set(poi.name, items);
      }
    }
  }

  const pois: PrioritizedPOI[] = knownPOIs
    .map((poi) => {
      const matchingCategories = poi.lootTypes.filter((lt) => neededCategories.has(lt));
      const quests = questContext.get(poi.name) ?? [];
      const itemMap = neededItemNames.get(poi.name);

      const neededItems = itemMap
        ? [...itemMap.entries()].map(([name, info]) => ({ name, reason: info.reason, wikiLink: info.wikiLink }))
        : undefined;

      const lootExpectation = matchingCategories.length > 0
        ? matchingCategories.join(' · ') + ' loot'
        : poi.lootTypes.join(', ');

      return {
        name: poi.name,
        lootExpectation,
        riskLevel: poi.risk,
        neededItems,
        lootCategories: matchingCategories.length > 0 ? matchingCategories : poi.lootTypes,
        questObjectives: quests.length > 0 ? quests : undefined,
        _relevance: matchingCategories.length + quests.length + (itemMap?.size ?? 0) * 2,
      };
    })
    .sort((a, b) => b._relevance - a._relevance)
    .map(({ _relevance, ...poi }) => poi);

  if (vibeModifier.poiPriority === 'boss' && mapData) {
    for (const boss of mapData.bosses) {
      if (boss.spawnChance > 0) {
        pois.unshift({
          name: `${boss.name} Spawn`,
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
  vibeModifier: VibeModifier,
  progress: ProgressData,
  hideoutStations: HideoutStation[],
): WatchlistItem[] {
  const seen = new Map<string, WatchlistItem>();

  // Quest items — use structured item data from the API
  for (const task of tasks) {
    if (!playerOpenTaskIds.has(task.id)) continue;
    for (const obj of task.objectives) {
      if (obj.type !== 'giveItem' && obj.type !== 'findItem') continue;

      const itemRef = obj.item;
      if (!itemRef) continue;

      const normalizedKey = itemRef.id;
      const fir = obj.foundInRaid === true;
      const priority = vibeModifier.poiPriority === 'loot' ? 2 : 1;

      const existing = seen.get(normalizedKey);
      if (existing) {
        if (fir) existing.fir = true;
        continue;
      }

      seen.set(normalizedKey, {
        itemId: itemRef.id,
        itemName: itemRef.name,
        priorityScore: priority,
        reason: `${task.trader.name}: ${task.name}`,
        reasonWikiLink: task.wikiLink,
        fir,
      });
    }
  }

  // Hideout items — find the next incomplete level per station and add its required items
  const completedModuleIds = new Set(
    progress.hideoutModulesProgress.filter((m) => m.complete).map((m) => m.id)
  );

  for (const station of hideoutStations) {
    const sortedLevels = [...station.levels].sort((a, b) => a.level - b.level);
    for (const lvl of sortedLevels) {
      const moduleId = `${station.id}-${lvl.level}`;
      if (completedModuleIds.has(moduleId) || completedModuleIds.has(station.id)) continue;

      for (const req of lvl.itemRequirements) {
        const normalizedKey = req.item.name.toLowerCase();
        if (seen.has(normalizedKey)) continue;

        const label = `${station.name} Lv${lvl.level}`;
        seen.set(normalizedKey, {
          itemId: req.item.id,
          itemName: req.item.name,
          priorityScore: vibeModifier.poiPriority === 'loot' ? 1.5 : 0.8,
          reason: `Hideout: ${label} (×${req.count})`,
          fir: false,
        });
      }
      break; // only the next incomplete level per station
    }
  }

  return [...seen.values()]
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
  hasGoonSighting = false,
  hideoutStations: HideoutStation[] = [],
): RaidPlanResult {
  const playerOpenTaskIds = getActionableTaskIds(progress, tasks);

  // Score all maps
  const uniqueMapNames = [...new Set(maps.map((m) => m.name))];
  const mapScores = uniqueMapNames
    .map((name) =>
      scoreMap(name, playerOpenTaskIds, tasks, vibeModifier, maps, teammates, progress.playerLevel)
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
  const pois = rankPOIs(bestMap.mapName, tasks, playerOpenTaskIds, vibeModifier, maps, progress, hideoutStations);
  const watchlist = buildWatchlist(tasks, playerOpenTaskIds, vibeModifier, progress, hideoutStations);
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
