export type GoalType = 'prestige' | 'kappa' | 'story-endings' | 'lightkeeper';

export interface GoalDefinition {
  id: GoalType;
  name: string;
  description: string;
  icon: string;
  requirements: GoalRequirement[];
}

export interface GoalRequirement {
  id: string;
  type: 'task' | 'hideout' | 'level' | 'item';
  targetId: string;
  description: string;
}

export interface GoalProgress {
  goalType: GoalType;
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  openTasks: GoalRequirement[];
}
