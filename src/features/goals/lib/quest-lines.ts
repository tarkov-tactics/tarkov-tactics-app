import type { TarkovTask } from '@/lib/api/tarkov-dev/types';

export interface QuestLine {
  id: string;
  label: string;
  tasks: TarkovTask[];
  completedTasks: TarkovTask[];
  openTasks: TarkovTask[];
  total: number;
  completed: number;
  percentage: number;
  isComplete: boolean;
  isSeries: boolean;
}

const PART_PATTERN = /^(.+?)\s*-\s*Part\s+\d+/i;
const DASH_PATTERN = /^(.+?)\s+-\s+/;

function detectPrefix(name: string): string | null {
  const partMatch = name.match(PART_PATTERN);
  if (partMatch) return partMatch[1].trim();

  const dashMatch = name.match(DASH_PATTERN);
  if (dashMatch) return dashMatch[1].trim();

  return null;
}

export function groupIntoQuestLines(
  openTasks: TarkovTask[],
  completedTasks: TarkovTask[],
): QuestLine[] {
  const allTasks = [...openTasks, ...completedTasks];
  const completedIds = new Set(completedTasks.map((t) => t.id));

  const prefixGroups = new Map<string, TarkovTask[]>();
  const standalone: TarkovTask[] = [];

  for (const task of allTasks) {
    const prefix = detectPrefix(task.name);
    if (prefix) {
      const group = prefixGroups.get(prefix) ?? [];
      group.push(task);
      prefixGroups.set(prefix, group);
    } else {
      standalone.push(task);
    }
  }

  const lines: QuestLine[] = [];

  for (const [prefix, tasks] of prefixGroups) {
    if (tasks.length < 2) {
      standalone.push(...tasks);
      continue;
    }
    const done = tasks.filter((t) => completedIds.has(t.id));
    const open = tasks.filter((t) => !completedIds.has(t.id));
    lines.push({
      id: `series:${prefix}`,
      label: prefix,
      tasks,
      completedTasks: done,
      openTasks: open,
      total: tasks.length,
      completed: done.length,
      percentage: Math.round((done.length / tasks.length) * 100),
      isComplete: open.length === 0,
      isSeries: true,
    });
  }

  const traderGroups = new Map<string, TarkovTask[]>();
  for (const task of standalone) {
    const trader = task.trader.name;
    const group = traderGroups.get(trader) ?? [];
    group.push(task);
    traderGroups.set(trader, group);
  }

  for (const [trader, tasks] of traderGroups) {
    const done = tasks.filter((t) => completedIds.has(t.id));
    const open = tasks.filter((t) => !completedIds.has(t.id));
    lines.push({
      id: `trader:${trader}`,
      label: trader,
      tasks,
      completedTasks: done,
      openTasks: open,
      total: tasks.length,
      completed: done.length,
      percentage: Math.round((done.length / tasks.length) * 100),
      isComplete: open.length === 0,
      isSeries: false,
    });
  }

  return lines;
}

export function sortQuestLinesByProgress(lines: QuestLine[]): QuestLine[] {
  return [...lines].sort((a, b) => {
    const aActive = a.percentage > 0 && a.percentage < 100;
    const bActive = b.percentage > 0 && b.percentage < 100;
    if (aActive !== bActive) return aActive ? -1 : 1;
    if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
    return b.percentage - a.percentage;
  });
}

export function getTopInProgressLines(lines: QuestLine[], limit: number): QuestLine[] {
  return sortQuestLinesByProgress(lines)
    .filter((l) => !l.isComplete)
    .slice(0, limit);
}
