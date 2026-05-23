export type GameMode = 'pvp' | 'pve';
export type PmcFaction = 'USEC' | 'BEAR';
export type TaskState = 'completed' | 'uncompleted' | 'failed';

export interface ProgressTask {
  id: string;
  complete: boolean;
  failed?: boolean;
  invalid?: boolean;
}

export interface ProgressObjective {
  id: string;
  complete: boolean;
  count?: number;
  invalid?: boolean;
}

export interface ProgressHideoutModule {
  id: string;
  complete: boolean;
}

export interface ProgressHideoutPart {
  id: string;
  complete: boolean;
  count?: number;
}

export interface ProgressData {
  tasksProgress: ProgressTask[];
  taskObjectivesProgress: ProgressObjective[];
  hideoutModulesProgress: ProgressHideoutModule[];
  hideoutPartsProgress: ProgressHideoutPart[];
  displayName: string;
  userId: string;
  playerLevel: number;
  gameEdition: number;
  pmcFaction: PmcFaction;
}

export interface ProgressResponse {
  success: true;
  data: ProgressData;
  meta: {
    self: string;
    gameMode: GameMode;
  };
}

export interface TeamProgressResponse {
  success: true;
  data: ProgressData[];
  meta: {
    self: string;
    hiddenTeammates: string[];
  };
}
