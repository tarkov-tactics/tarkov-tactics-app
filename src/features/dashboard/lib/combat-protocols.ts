/**
 * Tactical-notes copy for the PvP/Mixed `CombatStrategyCard`. Keyed by map
 * name with a fallback "default" entry. When goons are sighted on the
 * recommended map, an "Anti-Goon Maneuver" protocol is appended.
 *
 * Curated for MVP. Migrate to a community-maintained data source later.
 */

export interface CombatProtocol {
  title: string;
  body: string;
}

const ANTI_GOON: CombatProtocol = {
  title: "Anti-Goon Maneuver",
  body:
    "If goons are sighted, disengage from LOS immediately. Suppress with smoke and rotate via known cover lines. Do not push together — they cross-cover and will down a stacked squad in seconds.",
};

const PROTOCOLS_BY_MAP: Record<string, CombatProtocol[]> = {
  Customs: [
    {
      title: "CQB Protocol",
      body:
        "Engage in short bursts. Favor high-capacity magazines for Dorms sweeps. Pre-frag windows on entry; never push a held angle without smoke.",
    },
  ],
  Interchange: [
    {
      title: "Mall Sweep Protocol",
      body:
        "Move store-to-store along the rear corridors. Treat Kiba and Mantis as no-rush zones — Killa will punish anyone caught in the open atriums.",
    },
  ],
  "Streets of Tarkov": [
    {
      title: "Urban Push Protocol",
      body:
        "Stick to high-floor angles. Pre-aim windows when crossing streets. Avoid the courtyards near Concordia after the 10-minute mark — sniper density spikes.",
    },
  ],
  Factory: [
    {
      title: "Tight-Quarters Protocol",
      body:
        "Shotguns and SMGs only. Pre-frag the office and locker room on entry. Never reload in the open — break LOS through the tunnels.",
    },
  ],
  Reserve: [
    {
      title: "Bunker Protocol",
      body:
        "Hatchet rushes are common on the early raid clock — pre-aim known exfil camp lines. Use the train horn to trigger movement and re-position.",
    },
  ],
};

const DEFAULT_PROTOCOLS: CombatProtocol[] = [
  {
    title: "Engagement Protocol",
    body:
      "Take fights from cover and rotate after every exchange. Don't reload in the open. If outnumbered, disengage and re-approach from a different angle.",
  },
];

export function getCombatProtocols(
  mapName: string,
  hasGoonSighting: boolean
): CombatProtocol[] {
  const base = PROTOCOLS_BY_MAP[mapName] ?? DEFAULT_PROTOCOLS;
  return hasGoonSighting ? [...base, ANTI_GOON] : base;
}
