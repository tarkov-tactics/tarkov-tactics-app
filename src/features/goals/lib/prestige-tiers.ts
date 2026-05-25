/**
 * Prestige tier requirements sourced from the tarkov.dev prestige API
 * and community wiki. BSG reduced P1-P4 requirements in the May 2026
 * Icebreaker update — these values reflect the current state.
 *
 * The ranking system uses these to determine what the player needs to
 * work toward for their target prestige tier: level, skills, hideout
 * modules, roubles, and the gating quest (New Beginning / Collector).
 */

export type PrestigeTarget = 1 | 2 | 3 | 4 | 5 | 6;

export interface SkillRequirement {
  name: string;
  level: number;
}

export interface HideoutRequirement {
  stationName: string;
  level: number;
}

export interface PrestigeTierDefinition {
  tier: PrestigeTarget;
  label: string;
  minPlayerLevel: number;
  roublesRequired: number;
  skillRequirements: SkillRequirement[];
  hideoutRequirements: HideoutRequirement[];
  /** The gating quest that must be completed to prestige. */
  gatingQuestName: string;
  /**
   * For P5-P6 the gating quest is Collector, which itself requires ~68
   * prerequisite quests. This flag signals a dramatically harder tier.
   */
  requiresCollector: boolean;
}

export const PRESTIGE_TIERS: Record<PrestigeTarget, PrestigeTierDefinition> = {
  1: {
    tier: 1,
    label: "Prestige 1",
    minPlayerLevel: 25,
    roublesRequired: 10_000_000,
    skillRequirements: [],
    hideoutRequirements: [
      { stationName: "Intelligence Center", level: 1 },
      { stationName: "Rest Space", level: 2 },
      { stationName: "Nutrition Unit", level: 2 },
    ],
    gatingQuestName: "New Beginning",
    requiresCollector: false,
  },
  2: {
    tier: 2,
    label: "Prestige 2",
    minPlayerLevel: 30,
    roublesRequired: 15_000_000,
    skillRequirements: [
      { name: "Strength", level: 10 },
      { name: "Endurance", level: 10 },
      { name: "Charisma", level: 7 },
    ],
    hideoutRequirements: [
      { stationName: "Intelligence Center", level: 1 },
      { stationName: "Rest Space", level: 2 },
      { stationName: "Nutrition Unit", level: 2 },
    ],
    gatingQuestName: "New Beginning",
    requiresCollector: false,
  },
  3: {
    tier: 3,
    label: "Prestige 3",
    minPlayerLevel: 35,
    roublesRequired: 15_000_000,
    skillRequirements: [
      { name: "Strength", level: 10 },
      { name: "Endurance", level: 10 },
      { name: "Charisma", level: 7 },
    ],
    hideoutRequirements: [
      { stationName: "Intelligence Center", level: 1 },
      { stationName: "Rest Space", level: 2 },
      { stationName: "Nutrition Unit", level: 2 },
    ],
    gatingQuestName: "New Beginning",
    requiresCollector: false,
  },
  4: {
    tier: 4,
    label: "Prestige 4",
    minPlayerLevel: 40,
    roublesRequired: 15_000_000,
    skillRequirements: [
      { name: "Strength", level: 15 },
      { name: "Endurance", level: 15 },
      { name: "Charisma", level: 12 },
    ],
    hideoutRequirements: [
      { stationName: "Intelligence Center", level: 1 },
      { stationName: "Rest Space", level: 2 },
      { stationName: "Nutrition Unit", level: 2 },
    ],
    gatingQuestName: "New Beginning",
    requiresCollector: false,
  },
  5: {
    tier: 5,
    label: "Prestige 5",
    minPlayerLevel: 47,
    roublesRequired: 20_000_000,
    skillRequirements: [
      { name: "Strength", level: 20 },
      { name: "Endurance", level: 20 },
      { name: "Charisma", level: 20 },
    ],
    hideoutRequirements: [
      { stationName: "Intelligence Center", level: 2 },
      { stationName: "Rest Space", level: 3 },
      { stationName: "Security", level: 3 },
    ],
    gatingQuestName: "New Beginning",
    requiresCollector: true,
  },
  6: {
    tier: 6,
    label: "Prestige 6",
    minPlayerLevel: 47,
    roublesRequired: 20_000_000,
    skillRequirements: [
      { name: "Strength", level: 20 },
      { name: "Endurance", level: 20 },
      { name: "Charisma", level: 20 },
    ],
    hideoutRequirements: [
      { stationName: "Intelligence Center", level: 2 },
      { stationName: "Rest Space", level: 3 },
      { stationName: "Security", level: 3 },
    ],
    gatingQuestName: "New Beginning",
    requiresCollector: true,
  },
};

export const PRESTIGE_TIERS_LIST: PrestigeTierDefinition[] = Object.values(PRESTIGE_TIERS);

export const DEFAULT_PRESTIGE_TARGET: PrestigeTarget = 1;
