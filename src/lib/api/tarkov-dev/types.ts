export interface TarkovItem {
  id: string;
  name: string;
  shortName: string;
  iconLink: string;
  wikiLink: string;
  avg24hPrice: number;
  sellFor: Array<{
    vendor: { name: string };
    price: number;
    currency: string;
  }>;
}

export interface TarkovTask {
  id: string;
  name: string;
  trader: { name: string };
  map: { name: string } | null;
  minPlayerLevel: number;
  kappaRequired?: boolean;
  taskRequirements?: Array<{ task: { id: string; name: string } }>;
  objectives: TarkovObjective[];
}

export interface TarkovObjective {
  id: string;
  type: string;
  description: string;
  maps: Array<{ name: string }>;
}

export interface TarkovMap {
  id: string;
  name: string;
  description: string;
  enemies: string[];
  raidDuration: number;
  bosses: Array<{
    name: string;
    spawnChance: number;
  }>;
}

export interface HideoutStation {
  id: string;
  name: string;
  levels: Array<{
    level: number;
    itemRequirements: Array<{
      item: { id: string; name: string };
      count: number;
    }>;
  }>;
}

export interface GoonReport {
  map: { id: string; name: string };
  /** ISO 8601 string or unix-seconds string — tarkov.dev returns a String scalar. */
  timestamp: string;
}

/** tarkov.dev `GameMode` enum values. Maps from our internal pvp/pve. */
export type TarkovDevGameMode = 'regular' | 'pve';
