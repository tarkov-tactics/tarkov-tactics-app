import { TARKOV_TRACKER_API } from '@/lib/constants';

export class TarkovTrackerClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = TARKOV_TRACKER_API;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limited. Retry after ${retryAfter}s`);
    }

    if (!response.ok) {
      throw new Error(`TarkovTracker API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json as T;
  }

  async getProgress() {
    return this.request<import('./types').ProgressResponse>('/progress');
  }

  async getTeamProgress() {
    return this.request<import('./types').TeamProgressResponse>('/team/progress');
  }

  async updateLevel(level: number) {
    return this.request(`/progress/level/${level}`, { method: 'POST' });
  }

  async updateTask(taskId: string, state: 'completed' | 'uncompleted' | 'failed') {
    return this.request(`/progress/task/${taskId}`, {
      method: 'POST',
      body: JSON.stringify({ state }),
    });
  }

  async updateObjective(objectiveId: string, state: 'completed' | 'uncompleted', count?: number) {
    return this.request(`/progress/task/objective/${objectiveId}`, {
      method: 'POST',
      body: JSON.stringify({ state, ...(count !== undefined && { count }) }),
    });
  }
}
