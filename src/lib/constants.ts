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
