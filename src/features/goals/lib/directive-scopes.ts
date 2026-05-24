/**
 * Sub-category definitions for the active directive. Drives `DirectiveScopeFilter`
 * (label + selector) and the reframed `ProgressionSummary` (per-scope mini bars).
 *
 * The scope `'all'` is the implicit default and is not listed here — it means
 * "no filter applied". `getScopeOptions()` prepends it.
 *
 * Categorization heuristics are deliberately string-match-based against
 * `task.trader.name` and `task.name` so they survive missing tarkov.dev fields.
 */

import type { GoalId } from "../types";
import type { TarkovTask } from "@/lib/api/tarkov-dev/types";

export type ScopeId = string; // free-form per goal — `'all'` is the wildcard

export interface ScopeDefinition {
  id: ScopeId;
  label: string;
  /** Returns true when the task belongs in this scope. */
  match: (task: TarkovTask) => boolean;
}

// ── Prestige scopes ───────────────────────────────────────────────
// Sub-categories shown on the Stitch Prestige screen (Prestige / Economic /
// Logistics) — surfaced from trader/objective heuristics for the MVP.

const PRESTIGE_OPS_TRADERS = new Set([
  "Prapor",
  "Skier",
  "Jaeger",
  "Lightkeeper",
]);
const ECONOMIC_TRADERS = new Set(["Therapist", "Ragman", "Peacekeeper"]);
const LOGISTICS_TRADERS = new Set(["Mechanic", "Fence", "Ref"]);

const PRESTIGE_SCOPES: ScopeDefinition[] = [
  {
    id: "prestige-ops",
    label: "Prestige Ops",
    match: (t) => PRESTIGE_OPS_TRADERS.has(t.trader.name),
  },
  {
    id: "economic",
    label: "Economic",
    match: (t) => ECONOMIC_TRADERS.has(t.trader.name),
  },
  {
    id: "logistics",
    label: "Logistics",
    match: (t) => LOGISTICS_TRADERS.has(t.trader.name),
  },
];

// ── Kappa scopes (trader lines) ───────────────────────────────────

const KAPPA_TRADER_NAMES = [
  "Prapor",
  "Therapist",
  "Skier",
  "Peacekeeper",
  "Mechanic",
  "Ragman",
  "Jaeger",
  "Lightkeeper",
  "Ref",
];

const KAPPA_SCOPES: ScopeDefinition[] = KAPPA_TRADER_NAMES.map((name) => ({
  id: name.toLowerCase(),
  label: name,
  match: (t) => t.trader.name === name,
}));

// ── Story scopes ──────────────────────────────────────────────────

const STORY_SCOPES: ScopeDefinition[] = [
  { id: "bear", label: "BEAR", match: (t) => t.name.toLowerCase().includes("bear") },
  { id: "usec", label: "USEC", match: (t) => t.name.toLowerCase().includes("usec") },
];

// ── Lightkeeper scopes ───────────────────────────────────────────
// Single "all" scope — no meaningful sub-categories within the Lightkeeper chain.

const LIGHTKEEPER_SCOPES: ScopeDefinition[] = [];

// ── Public API ────────────────────────────────────────────────────

const SCOPES_BY_GOAL: Record<GoalId, ScopeDefinition[]> = {
  prestige: PRESTIGE_SCOPES,
  kappa: KAPPA_SCOPES,
  "story-endings": STORY_SCOPES,
  lightkeeper: LIGHTKEEPER_SCOPES,
};

export interface ScopeOption {
  id: ScopeId;
  label: string;
}

export const ALL_SCOPE: ScopeOption = { id: "all", label: "All" };

export function getScopeOptions(goalId: GoalId): ScopeOption[] {
  const scopes = SCOPES_BY_GOAL[goalId];
  if (scopes.length === 0) return [ALL_SCOPE];
  return [ALL_SCOPE, ...scopes.map(({ id, label }) => ({ id, label }))];
}

export function getScopeDefinition(
  goalId: GoalId,
  scopeId: ScopeId
): ScopeDefinition | null {
  if (scopeId === "all") return null;
  return SCOPES_BY_GOAL[goalId].find((s) => s.id === scopeId) ?? null;
}

export function isValidScopeForGoal(goalId: GoalId, scopeId: ScopeId): boolean {
  if (scopeId === "all") return true;
  return SCOPES_BY_GOAL[goalId].some((s) => s.id === scopeId);
}

/**
 * Filters a task list by the active scope. `'all'` passes everything through.
 */
export function filterTasksByScope(
  goalId: GoalId,
  scopeId: ScopeId,
  tasks: TarkovTask[]
): TarkovTask[] {
  const def = getScopeDefinition(goalId, scopeId);
  if (!def) return tasks;
  return tasks.filter(def.match);
}
