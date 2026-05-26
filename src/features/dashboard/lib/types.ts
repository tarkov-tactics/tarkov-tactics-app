import type { BossIntel } from './boss-intel';
import type { CombatProtocol } from './combat-protocols';

export interface RaidPlan {
  map: MapRecommendation;
  loadout: LoadoutSuggestion;
  pois: PrioritizedPOI[];
  watchlist: WatchlistItem[];
  risks: RiskIndicator[];
  vibeIntelData: VibeIntelData;
}

export interface MapRecommendation {
  mapId: string;
  mapName: string;
  reasoning: string;
  questObjectiveCount: number;
  /** Raid duration in minutes (from tarkov.dev). null if unknown. */
  raidDurationMin?: number | null;
}

export interface LoadoutSuggestion {
  weapon: string;
  armor: string;
  rig: string;
  estimatedBudget: number;
}

/**
 * Discriminated payload consumed by the active vibe's intel card on the
 * dashboard. Discriminator matches `VibeModifier.intelCard`.
 */
export type VibeIntelData =
  | { kind: 'quick-analysis'; lootDensity: number; survivalProbability: number }
  | {
      kind: 'boss-encounter';
      bossName: string | null;
      mapName: string;
      intel: BossIntel | null;
    }
  | {
      kind: 'combat-strategy';
      mapName: string;
      protocols: CombatProtocol[];
    };

export interface PrioritizedPOI {
  name: string;
  coordinates?: { x: number; y: number };
  lootExpectation: string;
  keyRequired?: string;
  riskLevel: 'low' | 'medium' | 'high';
  /** Items the player needs that can be found at this POI, with per-item tooltip reasons */
  neededItems?: Array<{ name: string; reason: string; wikiLink?: string }>;
  /** Loot categories available at this POI */
  lootCategories?: string[];
  /** Quest objectives at this location */
  questObjectives?: string[];
}

export interface WatchlistItem {
  itemId: string;
  itemName: string;
  priorityScore: number;
  reason: string;
  /** Wiki link for the quest/source referenced in `reason`. */
  reasonWikiLink?: string;
  /** Whether this item must be Found In Raid. */
  fir: boolean;
}

export interface RiskIndicator {
  type: 'boss' | 'pmc' | 'key';
  description: string;
  severity: 'low' | 'medium' | 'high';
}
