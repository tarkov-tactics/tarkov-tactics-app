import type { VibeModifier } from "@/features/vibes/types";

/**
 * Which named card lands in each grid slot, per active vibe.
 *
 * Slots:
 *   hero       — top-left, takes col-span-8 on lg
 *   secondary  — below hero, also col-span-8 on lg
 *   sidebar[]  — right column, col-span-4 on lg, stacked
 *
 * Card keys map to dashboard components in `app/page.tsx`.
 */
export type DashboardSlot = "hero" | "secondary" | "sidebar";
export type DashboardCardKey =
  | "threat"
  | "map"
  | "pois"
  | "watchlist"
  | "loadout"
  | "team-impact";

export interface DashboardLayout {
  hero: DashboardCardKey[];
  secondary: DashboardCardKey[];
  sidebar: DashboardCardKey[];
}

const LOOT_LAYOUT: DashboardLayout = {
  hero: ["watchlist"],
  secondary: ["pois"],
  sidebar: ["map", "threat", "loadout"],
};

const QUEST_LAYOUT: DashboardLayout = {
  hero: ["map", "threat"],
  secondary: ["pois"],
  sidebar: ["loadout", "watchlist", "team-impact"],
};

const BOSS_LAYOUT: DashboardLayout = {
  hero: ["threat"],
  secondary: ["pois"],
  sidebar: ["map", "watchlist", "loadout"],
};

export function getDashboardLayout(vibe: VibeModifier): DashboardLayout {
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
