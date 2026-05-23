export type VibeType = 'loot-run' | 'pvp-mixed' | 'boss-rush';

export interface VibeDefinition {
  id: VibeType;
  name: string;
  description: string;
  icon: string;
  mapPreference: string;
  loadoutBudget: 'budget' | 'mid' | 'meta';
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface VibeModifier {
  vibeType: VibeType;
  mapWeights: Record<string, number>;
  poiPriority: 'loot' | 'quest' | 'boss';
  gearBudgetMultiplier: number;
}
