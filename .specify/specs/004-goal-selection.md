# Feature Spec: Goal Selection & Progress

> Status: `in-progress` (team integration pending)
> Priority: `P0`
> Feature: `goals`

## Overview
Let the player select one of four long-term progression Goals (rendered in UI as **"Directives"** to match the TTI brand language; folder name and types remain `goals` for code stability). The app computes real-time progress against the selected goal by cross-referencing the player's TarkovTracker state with the goal's requirements from tarkov.dev. When team data is available, tasks are annotated with teammate overlap — tasks that teammates also need are visually boosted for squad coordination. The active goal drives the Dashboard's recommendations.

The page adopts the Stitch **Directives Overview** layout: a hero **Active Directive Focus** card on the left (icon + name + target tier + headline progress + sub-category stat tiles + Hard Requirements list) and a side panel column (**`DirectiveScopeFilter`** at the top, **`ProgressionSummary`** showing sub-categories of the active directive, **`OpenQuestsPreview`**, and a "View Profile on TarkovTracker.org" CTA in the page header).

### Naming convention
- **In UI**: "Directives" (heading, nav label, copy)
- **In code**: `goals`, `useGoalState`, `GoalCard`, `features/goals/*` (no rename — spec stability)
- **Constant for label**: `siteConfig.nav` entry's `title` is the single source of truth for the displayed term; updating it flips the whole UI

## User Stories
- As a Tarkov player, I want to select "Kappa Container" as my goal so the app prioritizes quests I haven't completed yet.
- As a Tarkov player, I want to see a progress bar showing how close I am to my selected goal.
- As a Tarkov player, I want to see a list of my next open tasks for the active goal, sorted by priority.
- As a Tarkov player, I want my goal selection to persist so I don't have to re-select it every visit.
- As a squad player, I want to see which tasks my teammates also need so we can raid together for shared objectives.

## Data Requirements
### From TarkovTracker (Player State)
- `tasksProgress[]` — which tasks are complete/failed/invalid
- `taskObjectivesProgress[]` — which objectives are complete, with counts
- `hideoutModulesProgress[]` — which hideout modules are complete
- `playerLevel` — current level (some goals require specific levels)
- `pmcFaction` — BEAR/USEC (affects story ending paths)

### From TarkovTracker (Team State — via spec-007)
- `teammates[].tasksProgress[]` — each teammate's task completion status
- Used to compute shared open tasks between the player and teammates

### From tarkov.dev (Game Data)
- `tasks` — all tasks with their trader, objectives, map, level requirements, **XP reward (`experience`)**
- `hideoutStations` — hideout module requirements
- Task dependency chains (prerequisite tasks)

### Computed/Derived
- **Per Goal**:
  - `totalRequirements` — total tasks/items/levels needed
  - `completedRequirements` — how many are done (from TarkovTracker)
  - `percentage` — completion percentage
  - `openTasks` — remaining tasks, sorted by: (1) level requirement ≤ player level, (2) prerequisites met, (3) trader priority
  - `blockedTasks` — tasks whose prerequisites aren't met yet
  - `nextActionable` — top 5 tasks the player can do right now
- **Team-Aware**:
  - `teamSharedTasks` — open tasks for the active goal that 1+ teammates also need
  - `teammatesForTask(taskId)` — which teammates share that task (names/initials)
  - `teamBoostedTasks` — actionable tasks sorted with shared tasks first (squad efficiency)
- **Prestige-specific**:
  - `prestigeTarget` — the prestige level the player is currently targeting (1–6), persisted to localStorage. Drives the **"Target Tier"** label on the Active Directive Focus card and filters `totalRequirements` to that tier's task set.
  - **Note**: TarkovTracker's `/progress` endpoint does **not** expose the player's actual prestige level (only `playerLevel` / `gameEdition`). The target is therefore **player-declared**, not data-derived. If TarkovTracker ever exposes current prestige, default `prestigeTarget` to `currentPrestige + 1`.
  - `prestigeAxes` — multi-axis progress breakdown for the target tier. Each axis has a `current`, `target`, `met` (boolean), and `label`. The axes are:
    - **Level**: `current = playerLevel`, `target = tier.minPlayerLevel`
    - **Gating Quest**: `current = prerequisite quests completed`, `target = total quests in chain`
    - **Hideout Modules**: one entry per required module showing `current = player's module level`, `target = required level`. Computed by cross-referencing `hideoutModulesProgress` (TarkovTracker) against `hideoutStations` (tarkov.dev) and the tier's `hideoutRequirements`.
    - **Skills**: one entry per required skill. TarkovTracker does not expose skill levels, so these are untracked.
    - **Roubles**: TarkovTracker does not expose currency, so this is untracked.
  - **Tracked vs untracked axes**: Axes where `current` is known (level, quests, hideout) render as full progress cards with status icons, current/target values, and progress bars. Axes where `current` is unknown (skills, roubles) are combined into a single "Untracked Requirements" info section below the tracked axes — a muted border card listing the requirements as telemetry-styled labels (e.g., "Strength Lv10", "Endurance Lv10", "15M ₽"). No progress bars for untracked items. This avoids misleading "?/N" displays.
  - The overall prestige percentage is computed as: `(axes met) / (total axes)` — not a quest-only percentage. An axis is "met" when `current >= target` (or assumed unmet when data is unavailable).
  - The `ActiveDirectiveFocus` card must render the prestige axes as a stacked list using the **same visual treatment as `HardRequirementsList` rows**: `rounded-md border bg-background p-3` cards with `Circle`/`CheckCircle2` status icons, the axis label as the name, a telemetry-styled `current/target` or `COMPLETED` status on the right, and a progress bar showing proportional completion. This replaces the single quest-only progress bar for the Prestige goal. The card must **never show "Directive complete!"** unless all axes are met — having zero open quests is not sufficient for prestige completion.
- **Quest-line grouping** (for Kappa, P5-P6 prestige, and OpenQuestsPreview):
  - `questLines` — derived grouping computed from task names. Detects series by stripping ` - Part N` suffixes (primary) and ` - <subtitle>` patterns (secondary), grouping by shared prefix. A quest line requires 2+ tasks sharing the same prefix. Standalone tasks (no series match) are grouped by trader as fallback.
  - Each `QuestLine` has: `id`, `label`, `tasks[]`, `openTasks[]`, `completedTasks[]`, `total`, `completed`, `percentage`, `isComplete`, `isSeries` (true for name-detected series, false for trader fallback groups).
  - Used in `QuestLinePreview` (replaces `HardRequirementsList` for large task sets) and `OpenQuestsPreview` (replaces trader-only grouping).
  - Completed quest lines are collapsed into a single summary row ("N completed quest lines") to save space for in-progress lines.
- **XP-optimized task list** (for Prestige P1-P4):
  - `xpRecommendedTasks` — kappa-required tasks the player hasn't completed, filtered to `minPlayerLevel <= playerLevel` AND all prerequisites completed (actionable now), sorted by `experience` descending. Attached to `GoalProgress` as an optional field for P1-P4 only.
  - Rendered in `HardRequirementsList` with section label "XP Priority" and XP values in telemetry labels (e.g., "12,400 XP" instead of "PRAPOR · LVL 2").
  - Does NOT change `openTasks`/`total` (which drive prestige axes) — this is a separate recommendation layer.
- **Directive scope (sub-category)**:
  - `directiveScope` — currently selected sub-category of the active directive (e.g., `prestige-ops` / `economic` / `logistics` for Prestige; trader lines for Kappa). Persisted to localStorage under key `directive-scope:{goalId}` (per-goal so switching goals doesn't lose each goal's last filter).
  - When `directiveScope === 'all'` (default), `HardRequirementsList` and `OpenQuestsPreview` show everything for the active directive; otherwise both lists filter to that scope.
  - The list of available scopes per goal comes from a static `lib/directive-scopes.ts` map: `{ prestige: ['prestige-ops','economic','logistics'], kappa: TRADER_NAMES, story: ['bear','usec'], lightkeeper: ['all'] }`.
- **Stat tiles (deferred)**:
  - `statTiles` — per-tier numerical objectives shown below the headline progress bar (e.g., PMC Kills 08/10). **Deferred**: TarkovTracker's `/progress` endpoint does not expose PMC kill counts, raids-survived counts, or boss-kill counts. Until an external data source is identified, the stat-tiles row is **not rendered**. The Stitch reference shows them; we intentionally skip until the data exists. See Open Questions.

## Goal Definitions

### 🏆 Prestige Level
- **Target**: Meet all conditions for the player's chosen `prestigeTarget` (1–6) and complete the tier's gating quest
- **Player-declared**: TarkovTracker doesn't expose current prestige, so the player selects which tier they're working toward via a `PrestigeTargetSelect` control on the Active Directive Focus card. Defaults to `1` on first selection.
- **Requirements per tier**: Each prestige tier has multiple requirement axes that the ranking system must track:
  - **Player level** — 25 (P1) → 30 (P2) → 35 (P3) → 40 (P4) → 47 (P5/P6). The ranking system should prioritize quests with high XP rewards to accelerate leveling.
  - **Gating quest** — "New Beginning" (P1–P4) or "Collector" (P5–P6, requires ~68 prerequisite quests). Quest progress and prerequisite chains must be tracked.
  - **Skill levels** — Strength, Endurance, Charisma at tier-specific thresholds (none for P1; up to 20/20/20 for P5–P6). Skills progress passively through gameplay.
  - **Hideout modules** — Intelligence Center, Rest Space, Nutrition Unit, Security at tier-specific levels. The ranking system should track items needed for hideout module construction.
  - **Roubles** — 10M (P1) → 15M (P2–P4) → 20M (P5–P6). Currency accumulation is a passive goal the item watchlist supports.
  - **Figurines** — Every "New Beginning" quest requires 10 specific figurines (found-in-raid for P2+). These are a recurring loot grind bottleneck.
- **P4→P5 difficulty cliff**: P1–P4 are mid-game accessible (levels 25–40, moderate skills). P5–P6 are endgame (level 47, max skills, Collector quest). The UI should communicate this distinction.
- **Data source**: Tier definitions sourced from the tarkov.dev `prestige` API query (conditions, rewards, transfer settings). Hardcoded fallback in `features/goals/lib/prestige-tiers.ts`.
- **Display label**: "TARGET TIER · PRESTIGE {N}" instead of the Stitch "TIER 3 CLASSIFIED" placeholder
- **Complexity**: High — multi-axis progression (level, quests, skills, hideout, roubles, figurines)

### 📦 Kappa Container
- **Target**: Complete ALL trader quest lines + collect all Collector items
- **Requirements**: Every non-optional task in the game
- **Complexity**: High — requires mapping full quest dependency tree

### 📚 Story Endings
- **Target**: Complete branching BEAR or USEC story quest line
- **Requirements**: Faction-specific quest chain
- **Complexity**: Medium — requires faction-aware filtering

### 🔓 Lightkeeper Unlock
- **Target**: Complete the Lightkeeper prerequisite chain
- **Requirements**: Specific quest sequence with strict dependencies
- **Complexity**: Very High — deeply nested prerequisites

## UI Components
| Component | Location | Type | Description |
|-----------|----------|------|-------------|
| `GoalCard` | `features/goals/components/goal-card.tsx` | Client | Compact card showing goal name, icon, description, progress bar, select button. Used in the **bottom switcher row** of the Directives page (not as the primary content). Includes embedded `GoalProgressBar`. |
| `ActiveDirectiveFocus` | `features/goals/components/active-directive-focus.tsx` | Client | **Hero card**. Renders: large icon, goal name, **target-tier badge** (e.g., "TARGET TIER · PRESTIGE 3"), `{percentage}% COMPLETE` telemetry mono on the right, short description, full-width primary-colored progress bar, **(deferred) `StatTilesRow`** if data is available, and the `HardRequirementsList`. When goal is Prestige, renders an inline `PrestigeTargetSelect`. |
| `PrestigeTargetSelect` | `features/goals/components/prestige-target-select.tsx` | Client | Labeled selector (matches the TTI label-above-button pattern) showing the current target prestige tier (1–6). Persists to localStorage key `prestige-target`. Visible only when the active goal is `prestige`. |
| `StatTilesRow` | `features/goals/components/stat-tiles-row.tsx` | Client | **Deferred** — three telemetry tiles (e.g., PMC KILLS 08/10, RAIDS SURVIVED 12/15, BOSS KILLS 00/01) shown inside `ActiveDirectiveFocus` below the progress bar. **Not implemented until** an external data source for these counts is wired up (TarkovTracker `/progress` does not expose them). Component stub may exist returning `null`; spec authoritatively says: do not render. See Open Questions. |
| `HardRequirementsList` | `features/goals/components/hard-requirements-list.tsx` | Client | Top N open tasks for the active goal, each with a circle status icon + name + per-task progress bar (when the task has a count objective) + completion badge. Filtered by the current `directiveScope`. |
| `DirectiveScopeFilter` | `features/goals/components/directive-scope-filter.tsx` | Client | `LabeledSelector` rendered at the top of the right side column. Label "FILTER", trigger shows the current scope name in uppercase (e.g., "PRESTIGE OPS"). Options come from `lib/directive-scopes.ts` keyed by the active goal. Selecting a scope filters `HardRequirementsList` + `OpenQuestsPreview` and updates the highlighted row in `ProgressionSummary`. Persists to localStorage key `directive-scope:{goalId}`. |
| `ProgressionSummary` | `features/goals/components/progression-summary.tsx` | Client | Right-column side panel. **Sub-categories of the *active* directive** (NOT all four top-level goals). For Prestige: PRESTIGE / ECONOMIC / LOGISTICS mini bars; for Kappa: trader-line categories; for Story: BEAR / USEC; for Lightkeeper: a single "OVERALL" bar (no meaningful sub-categories). Clicking a row sets `directiveScope` to that sub-category. Header shows a circle icon + "PROGRESSION SUMMARY" telemetry label. |
| `DirectivesOverviewPanel` | `features/goals/components/directives-overview-panel.tsx` | Client | **(Optional, future)** A separate panel that lists all four top-level goals with their headline progress, intended for a "switch goal" UX once the goal switcher row needs replacement. Not part of the Stitch directives screen — placeholder for the prior "all 4 goals" semantics that `ProgressionSummary` previously held. Defer implementation until UX calls for it. |
| `OpenQuestsPreview` | `features/goals/components/open-quests-preview.tsx` | Client | Right-column side panel. Top 3 in-progress quest chains for the active directive (further filtered by current `directiveScope`) with per-chain % completion. Header has a "!" icon + "OPEN QUESTS" telemetry label and an "ACTIVE DATA" pill. "TRACK ALL QUESTS" outline button at the bottom. |
| `TarkovTrackerProfileLink` | `features/goals/components/tarkov-tracker-profile-link.tsx` | Client | Top-right primary CTA on the Directives page header. **Label: "View Profile on TarkovTracker.org"** with external-link icon (matches Stitch wording). Resolves to `https://tarkovtracker.io/` — the homepage of the active TarkovTracker fork, which lands logged-in users on their own progression view. There is **no public profile URL** on tarkovtracker.io (it's an authenticated SPA), so `progress.userId` is intentionally not used in the path; the label is the user-facing promise, the URL is the operational best we have. Hidden when disconnected. |

## Hooks
| Hook | Location | Description |
|------|----------|-------------|
| `useGoalState()` | `features/goals/hooks/use-goal-progress.ts` | Active goal selection (localStorage), per-goal progress computation by cross-referencing `useGameData()` tasks + `usePlayerState()` completion. Returns `allGoalProgress` (Map), `activeGoalProgress`, `gameDataLoaded`, `prestigeTarget`, `setPrestigeTarget`, `directiveScope`, `setDirectiveScope`, `scopeOptions` (the list of scopes valid for the current goal), `scopedProgress` (active-goal progress further filtered by the current scope — sub-category counts powering `ProgressionSummary` and the scoped task lists). |

### Per-Goal Task Filtering (in `use-goal-progress.ts`)
- **Kappa**: `tasks.filter(t => t.kappaRequired !== false)` — all required tasks
- **Lightkeeper**: tasks where `trader.name === 'Lightkeeper'`
- **Story Endings**: faction-aware filtering based on `progress.pmcFaction`
- **Prestige**: the tier's gating quest ("New Beginning" for P1–P4, "Collector" for P5–P6) plus its **full prerequisite chain**, resolved recursively via `taskRequirements`. This produces a focused task set (typically 10–40 quests for P1–P4, ~68+ for P5–P6) rather than the entire kappa quest list. Tasks outside the prerequisite chain are excluded — the player only sees quests that directly lead to their prestige goal. If the gating quest is not found in the game data, falls back to all kappa-required tasks with `minPlayerLevel ≤ tier.minPlayerLevel`.

## Requirements
### Functional
- [x] Each goal computes progress from `useGameData()` tasks + `usePlayerState()` completion
- [x] **Per-goal filtering**: Kappa = `kappaRequired`, Lightkeeper = trader, Story = faction, Prestige = tier task set
- [x] Active goal is stored in `localStorage` (key: `active-goal`)
- [x] All localStorage-backed state (`activeGoal`, `prestigeTarget`, `directiveScope`) must initialize with defaults during SSR and hydrate from localStorage in a client-side effect — never read localStorage during `useState` initialization, as this causes hydration mismatches between server-rendered defaults and client-stored values
- [x] Progress computation runs client-side via `useMemo` — reactive
- [x] 100% completion shows celebration state (🎉)
- [x] Page renders the **TTI Directives layout**: `PageHeader` with "Directives" title + subtitle + `TarkovTrackerProfileLink` primary CTA in the actions slot, **2-column body** (hero column 8/12 with `ActiveDirectiveFocus`, side column 4/12 stacking `DirectiveScopeFilter` → `ProgressionSummary` → `OpenQuestsPreview`)
- [x] On mobile (`<lg`), layout collapses to a single column: `ActiveDirectiveFocus` → `DirectiveScopeFilter` → `ProgressionSummary` → `OpenQuestsPreview` → goal switcher row
- [x] **Goal switcher row** (the small `GoalCard` grid) sits at the bottom of the page as a compact selector — no longer the primary content. For Prestige goals, the card must show axes-based progress (axes met / total axes) rather than quest-only progress, matching the `percentage` computed by `computePrestigeAxes`.
- [x] `ActiveDirectiveFocus` shows: icon, name, target tier badge, description, `{percentage}% COMPLETE` in telemetry mono, full-width primary-colored progress bar, completion fraction in telemetry mono
- [x] `StatTilesRow` is **not rendered** while external stat data is unavailable (see Open Questions). When implemented, it will sit between the progress bar and the Hard Requirements list.
- [x] When active goal is `prestige`: `PrestigeTargetSelect` (1–6) is visible inside the focus card; changing the target re-computes `activeGoalProgress` reactively
- [x] `prestigeTarget` persisted to localStorage (key: `prestige-target`), defaults to `1` on first selection
- [x] `HardRequirementsList` shows top 5 open tasks **filtered by the current `directiveScope`**; each item has a circle status icon, task name as a **clickable link to the Tarkov wiki** (`task.wikiLink`, opens in new tab), per-task progress bar (when objective has a count), and "COMPLETED" badge when done. Shows "+N more" when list is truncated.
- [x] `DirectiveScopeFilter` renders at the top of the side column with label "FILTER" and a `LabeledSelector` whose options come from `lib/directive-scopes.ts` for the active goal. Default value is `'all'`. Selecting a scope updates `directiveScope` (persisted to `directive-scope:{goalId}`) and reactively filters both `HardRequirementsList` and `OpenQuestsPreview`.
- [x] `ProgressionSummary` lists **sub-categories of the active directive** (not the 4 top-level goals) with mini progress bars in `space-y-3` rhythm. Clicking a row sets `directiveScope` to that sub-category (synchronizes with `DirectiveScopeFilter`).
- [x] `OpenQuestsPreview` shows top 3 in-progress task chains (grouped by trader-line where applicable) **filtered by the current `directiveScope`** with % completion
- [x] `TarkovTrackerProfileLink` rendered as primary-styled button with external-link icon, **label "View Profile on TarkovTracker.org"**; links to `https://tarkovtracker.io/`; hidden when disconnected
- [ ] Task list sorted by actionability: doable now → level-gated → blocked
- [ ] **Team boost**: tasks shared with teammates sorted higher within their tier
- [ ] **Team overlay**: tasks shared with 1+ teammates show teammate badge
- [ ] When team data is unavailable, lists work identically but without team badges

### Non-Functional
- [x] Progress calculation is fast (useMemo, no async)
- [x] Loading indicator while game data fetching
- [x] Smooth progress bar animation on value change (CSS transition-all duration-700)
- [x] Side panel column sticks to the top on long screens (`lg:sticky lg:top-20 lg:self-start`) so summaries stay visible while reading the focus card

## Success Criteria
- [ ] All 4 goals render with accurate progress when connected to TarkovTracker
- [ ] Selecting a goal persists across page reloads
- [ ] Open task list accurately reflects what's done and what's remaining
- [ ] "Next actionable" tasks are correctly filtered by level and prerequisites
- [ ] Shared tasks show teammate indicators when team data is available
- [ ] No errors or visual breakage when team data is unavailable
- [ ] `DirectiveScopeFilter` filters `HardRequirementsList`, `OpenQuestsPreview`, and the highlighted row in `ProgressionSummary` in sync
- [ ] Scope selection persists per goal — switching to a different goal and back restores that goal's last-used scope
- [ ] Stat tiles row is genuinely absent (no empty placeholder, no zeroed counts) — Stitch parity is intentionally deferred here

## Edge Cases
- No TarkovTracker connection → show `ActiveDirectiveFocus` with 0% progress and prompt to connect; `TarkovTrackerProfileLink` hidden; `DirectiveScopeFilter` still rendered (uses static scope list, not progress data)
- Player has completed all tasks for a goal → show 100% with celebration state in focus card
- Player has completed all tasks for the currently-selected scope but other scopes still have work → focus card stays at the goal-level percentage; `HardRequirementsList` shows "All caught up in {scope}" empty state
- Player's faction doesn't match Story Endings path → show warning inside focus card
- tarkov.dev task data doesn't match TarkovTracker task IDs → log mismatch, skip unknown IDs
- Player at level 1 with no tasks done → show all tasks as level-gated or blocked
- No TP permission → team overlay hidden, lists still work normally
- All teammates have completed a shared task → don't show team badge for that task
- `prestigeTarget` references a tier that doesn't exist in `prestige-tiers.ts` (e.g., future Prestige 7) → fall back to highest defined tier and surface a one-line warning
- `directiveScope` references a scope that doesn't exist for the current goal (e.g., after switching goals, the previously-stored scope key isn't valid for the new goal) → fall back to `'all'` and update localStorage
- `TarkovTrackerProfileLink` always points to the homepage — no userId substitution, so missing/malformed `userId` is a non-issue
- Stat tiles row stays hidden until a data source exists — never renders zeroed placeholders
- Prestige gating quest not found in game data (e.g., tarkov.dev hasn't added it yet for P5/P6) → fall back to all kappa-required tasks filtered by `minPlayerLevel ≤ tier.minPlayerLevel`
- Prestige gating quest found but has zero `taskRequirements` → show only the gating quest itself as the sole task requirement

## Dependencies
- Depends on: `spec-001` (App Shell — Goals page renders inside the shell)
- Depends on: `spec-002` (TarkovTracker Connection — player state)
- Depends on: `spec-003` (Game Data Service — task/hideout data from tarkov.dev)
- Enhances with: `spec-007` (Team Progress — team data for shared task indicators)

## Open Questions
- ✅ Resolved: Prestige tier requirements sourced from tarkov.dev `prestige` API and community wiki. Each tier defines `minPlayerLevel`, `roublesRequired`, `skillRequirements[]`, `hideoutRequirements[]`, `gatingQuestName`, and `requiresCollector` flag. Hardcoded in `features/goals/lib/prestige-tiers.ts` with values from the May 2026 Icebreaker update. Task filtering uses the tier's `minPlayerLevel` to scope kappa-required quests to what's achievable before the prestige level gate.
- ❓ **Stat tiles data source** — PMC Kills / Raids Survived / Boss Kills are not exposed by TarkovTracker's `/progress`. **Resolved for now**: `StatTilesRow` is **deferred and unrendered** until an external source is identified. Candidates to investigate later: Tarkov-Tools community datasets, BSG official stats endpoint (if/when it appears), manual user-entered counts in Settings. Do NOT render zeroed placeholders.
- ❓ Should blocked tasks show what's blocking them (prerequisite task name)? Recommend: yes, as a subtle tooltip or sub-label.
- ❓ Should Kappa goal filter out "optional" tasks that aren't required? Recommend: yes, use tarkov.dev's task `kappaRequired` field if available.
- ❓ How wide is the side panel column? Recommend: 3/8 of the body grid on `lg+` (≈ 280px at the 896px max-width), matching the Stitch reference.
- ❓ Should `OpenQuestsPreview` group by trader line or list raw tasks? Recommend: by trader line for the preview (matches Stitch — "The Punisher Chain · 82%"), with raw tasks in the expanded view.
- ❓ Sub-category definitions per goal (`lib/directive-scopes.ts`) — for Kappa, do we use trader lines or quest themes? Recommend: trader lines (Prapor / Therapist / Skier / etc.) as the simplest mental model; revisit if user testing prefers theme-based grouping.
