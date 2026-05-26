import type { VibeModifier } from "@/features/vibes/types";

/**
 * Composition map: per-vibe layout shape + which cards land where, with which
 * variant. `DashboardGrid` reads this and renders. New vibes = new row here.
 */

export type DashboardShape = "12col-with-secondary" | "2col-split";

export type CardVariant = "hero" | "compact" | "kit-detailed" | "kit-categorized";
export type ThreatFormat = "tiles" | "rows" | "bars";
export type POISortMode = "priority" | "boss-spawn-proximity";

export type DashboardCardKey =
  | "threat"
  | "map"
  | "pois"
  | "watchlist"
  | "loadout"
  | "intel"
  | "team-impact";

export interface CardSlot {
  key: DashboardCardKey;
  /** Density variant; omitted = default-for-card. */
  variant?: CardVariant;
  /** Threat-only: which of the 3 visual formats. */
  format?: ThreatFormat;
  /** POI-only: ordering mode. */
  sortMode?: POISortMode;
}

export interface DashboardComposition {
  shape: DashboardShape;
  hero: CardSlot[];
  /** Only used by `12col-with-secondary`. */
  secondary: CardSlot[];
  sidebar: CardSlot[];
}

const LOOT_LAYOUT: DashboardComposition = {
  shape: "12col-with-secondary",
  hero: [{ key: "pois", variant: "hero", sortMode: "priority" }],
  secondary: [{ key: "watchlist", variant: "hero" }],
  sidebar: [
    { key: "map", variant: "compact" },
    { key: "threat", variant: "compact", format: "rows" },
    { key: "intel" },
  ],
};

const QUEST_LAYOUT: DashboardComposition = {
  shape: "2col-split",
  hero: [
    { key: "threat", variant: "hero", format: "bars" },
    { key: "intel" },
  ],
  secondary: [],
  sidebar: [
    { key: "map", variant: "hero" },
    { key: "pois", variant: "compact", sortMode: "priority" },
    { key: "watchlist", variant: "compact" },
    { key: "team-impact" },
  ],
};

const BOSS_LAYOUT: DashboardComposition = {
  shape: "12col-with-secondary",
  hero: [{ key: "threat", variant: "hero", format: "tiles" }],
  secondary: [
    { key: "intel" },
    { key: "pois", variant: "hero", sortMode: "boss-spawn-proximity" },
  ],
  sidebar: [
    { key: "map", variant: "compact" },
    { key: "watchlist", variant: "compact" },
  ],
};

export function getDashboardComposition(vibe: VibeModifier): DashboardComposition {
  switch (vibe.poiPriority) {
    case "loot":
      return LOOT_LAYOUT;
    case "boss":
      return BOSS_LAYOUT;
    case "quest":
    default:
      return QUEST_LAYOUT;
  }
}
