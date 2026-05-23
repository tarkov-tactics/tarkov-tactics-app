export type GoalId = 'prestige' | 'kappa' | 'story-endings' | 'lightkeeper';

export interface GoalDefinition {
  id: GoalId;
  name: string;
  icon: string;
  description: string;
  shortDescription: string;
}

export const GOALS: GoalDefinition[] = [
  { id: 'prestige', name: 'Prestige Level', icon: '🏆', description: 'Complete all requirements for Prestige 1–6', shortDescription: 'Level thresholds + task completions per tier' },
  { id: 'kappa', name: 'Kappa Container', icon: '📦', description: 'Complete ALL trader quest lines + Collector items', shortDescription: 'Every non-optional task in the game' },
  { id: 'story-endings', name: 'Story Endings', icon: '📚', description: 'Complete branching BEAR or USEC story quest line', shortDescription: 'Faction-specific quest chains' },
  { id: 'lightkeeper', name: 'Lightkeeper Unlock', icon: '🔓', description: 'Complete the Lightkeeper prerequisite chain', shortDescription: 'Deeply nested prerequisite sequence' },
];
