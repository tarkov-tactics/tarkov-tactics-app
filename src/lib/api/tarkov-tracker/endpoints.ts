export const TARKOV_TRACKER_ENDPOINTS = {
  progress: '/progress',
  teamProgress: '/team/progress',
  updateLevel: (level: number) => `/progress/level/${level}`,
  updateTask: (taskId: string) => `/progress/task/${taskId}`,
  updateTasks: '/progress/tasks',
  updateObjective: (objectiveId: string) => `/progress/task/objective/${objectiveId}`,
} as const;

export const RATE_LIMITS = {
  read: 60,
  write: 30,
} as const;
