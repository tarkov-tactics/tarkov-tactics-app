export interface RaidPlan {
  map: MapRecommendation;
  loadout: LoadoutSuggestion;
  pois: PrioritizedPOI[];
  watchlist: WatchlistItem[];
  risks: RiskIndicator[];
}

export interface MapRecommendation {
  mapId: string;
  mapName: string;
  reasoning: string;
  questObjectiveCount: number;
}

export interface LoadoutSuggestion {
  weapon: string;
  armor: string;
  rig: string;
  estimatedBudget: number;
}

export interface PrioritizedPOI {
  name: string;
  coordinates?: { x: number; y: number };
  lootExpectation: string;
  keyRequired?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface WatchlistItem {
  itemId: string;
  itemName: string;
  priorityScore: number;
  reason: string;
}

export interface RiskIndicator {
  type: 'boss' | 'pmc' | 'key';
  description: string;
  severity: 'low' | 'medium' | 'high';
}
