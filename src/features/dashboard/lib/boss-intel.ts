/**
 * Curated tactical intel keyed by `{mapName}::{bossName}`. Populated by hand
 * for the MVP — when the active vibe is Boss Rush and the recommended map has
 * an entry, the `BossEncounterCard` shows the entry's data. Otherwise the
 * card renders its "intel not yet available" empty state.
 *
 * Migrate to a JSON data file or community-maintained source later.
 */

export interface BossIntel {
  spawnPoints: string;
  guardStatus: string;
  uniqueLoot: string;
  tacticalApproach: string;
  flankManeuvers: string;
}

function key(mapName: string, bossName: string): string {
  return `${mapName.toLowerCase()}::${bossName.toLowerCase()}`;
}

const INTEL: Record<string, BossIntel> = {
  [key("Interchange", "Killa")]: {
    spawnPoints: "Primary: Mantis, Kiba, Brutal. Secondary: IDEA / OLLI.",
    guardStatus: "Solo Boss. No guards, but highly mobile.",
    uniqueLoot: "Killa Helmet, 6B13 M Armor, RPK-16.",
    tacticalApproach:
      "Avoid long hallways where he can spray. Use grenades to force him out of cover or into a reload state. He will slide-peek corners — keep crosshair at chest/head height.",
    flankManeuvers:
      "Utilize the back corridors of stores to reposition. Never re-peek the same angle twice. If he locks onto you, retreat and rotate through the second floor if possible.",
  },
  [key("Customs", "Reshala")]: {
    spawnPoints: "Dorms (2-story + 3-story), Gas Station, New Gas Station.",
    guardStatus: "4 armored guards. Aggressive, push hard with shotguns and AKs.",
    uniqueLoot: "TT pistol (gold), Dorm 314 Marked Key, rare watches.",
    tacticalApproach:
      "Identify guard positions before engaging. Reshala himself stays back — pick off guards from cover, then close the gap.",
    flankManeuvers:
      "Use the dorm rooflines and the warehouse approach to flank. Avoid the open courtyard. Smoke grenades break sightlines from windows.",
  },
  [key("Factory", "Tagilla")]: {
    spawnPoints: "Office, Locker Room, Pumping Station.",
    guardStatus: "Solo Boss. No guards.",
    uniqueLoot: "Tagilla face shield, Tagilla armor, sledgehammer.",
    tacticalApproach:
      "Tagilla charges in melee — keep distance and use stairs to break his line. Headshots only; his armor laughs at body shots.",
    flankManeuvers:
      "Lure into tight corridors with grenades, then rotate to high ground. Never engage in the locker room — too many corners for him to close.",
  },
};

export function getBossIntel(mapName: string, bossName: string): BossIntel | null {
  return INTEL[key(mapName, bossName)] ?? null;
}
