/**
 * Prestige tier requirements. Hand-curated for MVP — see spec-004 Open Q's
 * for the long-term plan to source this from a wiki/data file.
 *
 * Each tier defines a `minPlayerLevel` (the wipe-level floor for prestiging
 * into that tier) and, optionally, an explicit `requiredTaskIds` set. When
 * `requiredTaskIds` is omitted, the goal falls back to "all kappa-required
 * tasks" so the player still gets a meaningful progress %.
 */

export type PrestigeTarget = 1 | 2 | 3 | 4 | 5 | 6;

export interface PrestigeTierDefinition {
  tier: PrestigeTarget;
  label: string;
  minPlayerLevel: number;
  /** Optional explicit task ID set — when omitted, all kappa-required tasks count. */
  requiredTaskIds?: string[];
}

export const PRESTIGE_TIERS: Record<PrestigeTarget, PrestigeTierDefinition> = {
  1: { tier: 1, label: "Prestige 1", minPlayerLevel: 55 },
  2: { tier: 2, label: "Prestige 2", minPlayerLevel: 55 },
  3: { tier: 3, label: "Prestige 3", minPlayerLevel: 55 },
  4: { tier: 4, label: "Prestige 4", minPlayerLevel: 55 },
  5: { tier: 5, label: "Prestige 5", minPlayerLevel: 55 },
  6: { tier: 6, label: "Prestige 6", minPlayerLevel: 55 },
};

export const PRESTIGE_TIERS_LIST: PrestigeTierDefinition[] = Object.values(PRESTIGE_TIERS);

export const DEFAULT_PRESTIGE_TARGET: PrestigeTarget = 1;
