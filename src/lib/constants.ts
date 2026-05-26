export const TARKOV_DEV_API = 'https://api.tarkov.dev/graphql';
export const TARKOV_TRACKER_API = 'https://api.tarkovtracker.org';

export const TARKOV_DEV_PRICE_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const TARKOV_TRACKER_RATE_LIMITS = {
  read: 60,
  write: 30,
} as const;

export const GAME_CONSTANTS = {
  MAX_LEVEL: 79,
  MIN_LEVEL: 1,
  PRESTIGE_LEVELS: 6,
} as const;

// ── Goon report staleness ────────────────────────────────────────

export const STALE_GOON_REPORT_MS = 30 * 60 * 1000;

// ── PvP density classification ───────────────────────────────────

export const HIGH_PVP_MAPS = new Set([
  'Customs', 'Factory', 'Interchange', 'Reserve',
]);
export const MED_PVP_MAPS = new Set([
  'Shoreline', 'Streets of Tarkov',
]);

export type PvpDensity = 'high' | 'medium' | 'low';

export function getPvpDensity(mapName: string): PvpDensity {
  if (HIGH_PVP_MAPS.has(mapName)) return 'high';
  if (MED_PVP_MAPS.has(mapName)) return 'medium';
  return 'low';
}

export const PVP_HOTSPOTS: Record<string, string> = {
  Customs: 'Dorms, Crackhouse',
  Factory: 'Office, Gates',
  Interchange: 'Mall, Power',
  Reserve: 'Train, RB',
  'Streets of Tarkov': 'Concordia, Pinewood',
  Shoreline: 'Resort, Pier',
};
