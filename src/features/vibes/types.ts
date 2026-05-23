export type VibeId = 'loot-run' | 'pvp-mixed' | 'boss-rush';

export interface VibeModifier {
  poiPriority: 'loot' | 'quest' | 'boss';
  gearBudgetMultiplier: number;
  riskTolerance: 'low' | 'high';
}

export interface VibeDefinition {
  id: VibeId;
  name: string;
  icon: string;
  description: string;
  modifier: VibeModifier;
}

export const VIBES: VibeDefinition[] = [
  {
    id: 'loot-run',
    name: 'Loot Run',
    icon: '💰',
    description: 'Safe routes, high value-per-slot, budget gear. Minimize risk-per-death.',
    modifier: { poiPriority: 'loot', gearBudgetMultiplier: 0.3, riskTolerance: 'low' },
  },
  {
    id: 'pvp-mixed',
    name: 'PvP / Mixed',
    icon: '⚔️',
    description: 'Maximum quest progress, meta gear, high quest density maps.',
    modifier: { poiPriority: 'quest', gearBudgetMultiplier: 1.0, riskTolerance: 'high' },
  },
  {
    id: 'boss-rush',
    name: 'Boss Rush',
    icon: '👹',
    description: 'Hunt bosses. Optimized by spawn chance, tailored loadouts.',
    modifier: { poiPriority: 'boss', gearBudgetMultiplier: 1.2, riskTolerance: 'high' },
  },
];
