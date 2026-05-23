# Feature Spec: Goal Selection & Progress

> Status: `done`
> Priority: `P0`
> Feature: `goals`

## Overview
Let the player select one of four long-term progression Goals. The app computes real-time progress against the selected goal by cross-referencing the player's TarkovTracker state with the goal's requirements from tarkov.dev. When team data is available, tasks are annotated with teammate overlap — tasks that teammates also need are visually boosted for squad coordination. The active goal drives the Dashboard's recommendations.

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
- `tasks` — all tasks with their trader, objectives, map, level requirements
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

## Goal Definitions

### 🏆 Prestige Level
- **Target**: Complete all requirements for Prestige 1–6
- **Requirements**: Level thresholds + specific task completions per prestige tier
- **Complexity**: Medium — linear progression

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
| `GoalCard` | `features/goals/components/goal-card.tsx` | Client | Card showing goal name, icon, description, progress bar, select button. Includes embedded `GoalProgressBar`. |
| `GoalTaskList` | Inline in `app/goals/page.tsx` | Client | Scrollable list of open tasks for active goal (up to 10 shown, "+N more" overflow) |

## Hooks
| Hook | Location | Description |
|------|----------|-------------|
| `useGoalState()` | `features/goals/hooks/use-goal-progress.ts` | Active goal selection (localStorage), per-goal progress computation by cross-referencing `useGameData()` tasks + `usePlayerState()` completion. Returns `allGoalProgress` (Map), `activeGoalProgress`, `gameDataLoaded`. |

### Per-Goal Task Filtering (in `use-goal-progress.ts`)
- **Kappa**: `tasks.filter(t => t.kappaRequired !== false)` — all required tasks
- **Lightkeeper**: tasks where `trader.name === 'Lightkeeper'`
- **Story Endings**: faction-aware filtering based on `progress.pmcFaction`
- **Prestige**: all tasks (general progression)

## Requirements
### Functional
- [x] Goals page shows 4 goal cards in a 2×2 grid (single column on mobile)
- [x] Each card shows: icon, name, description, progress bar, completion fraction
- [x] Clicking a card selects it as the active goal (visual highlight, persisted)
- [x] Active goal is stored in `localStorage` (key: `active-goal`)
- [x] Below the grid: expanded view of the active goal showing open task list
- [x] Each task item shows: task name, trader name, map name, required level
- [x] **Progress uses `useGameData()`**: game tasks from tarkov.dev define the total universe; TarkovTracker marks which are complete
- [x] **Per-goal filtering**: each goal type filters to its relevant subset of tasks (Kappa = kappaRequired, Lightkeeper = trader, etc.)
- [x] Progress computation runs client-side via `useMemo` — reactive to player state + game data changes
- [x] Goal progress updates when player state refreshes (no page reload needed)
- [x] Loading indicator shown while game data is being fetched from tarkov.dev
- [x] 100% completion shows celebration state (🎉)
- [ ] Task list sorted by actionability: doable now → level-gated → blocked
- [ ] **Team boost**: tasks shared with teammates sorted higher within their tier
- [ ] **Team overlay**: tasks shared with 1+ teammates show teammate badge
- [ ] When team data is unavailable (no TP permission), task list works identically but without team badges

### Non-Functional
- [x] Progress calculation is fast (useMemo, no async)
- [x] Loading indicator while game data fetching
- [x] Smooth progress bar animation on value change (CSS transition-all duration-700)

## Success Criteria
- [ ] All 4 goals render with accurate progress when connected to TarkovTracker
- [ ] Selecting a goal persists across page reloads
- [ ] Open task list accurately reflects what's done and what's remaining
- [ ] "Next actionable" tasks are correctly filtered by level and prerequisites
- [ ] Shared tasks show teammate indicators when team data is available
- [ ] No errors or visual breakage when team data is unavailable

## Edge Cases
- No TarkovTracker connection → show goals with 0% progress and prompt to connect
- Player has completed all tasks for a goal → show 100% with celebration state
- Player's faction doesn't match Story Endings path → show warning
- tarkov.dev task data doesn't match TarkovTracker task IDs → log mismatch, skip unknown IDs
- Player at level 1 with no tasks done → show all tasks as level-gated or blocked
- No TP permission → team overlay hidden, task list still works normally
- All teammates have completed a shared task → don't show team badge for that task

## Dependencies
- Depends on: `spec-001` (App Shell — Goals page renders inside the shell)
- Depends on: `spec-002` (TarkovTracker Connection — player state)
- Depends on: `spec-003` (Game Data Service — task/hideout data from tarkov.dev)
- Enhances with: `spec-007` (Team Progress — team data for shared task indicators)

## Open Questions
- ❓ For Prestige goals, where do the per-tier requirements come from? (Wiki-scraped? Hardcoded?) Recommend: hardcode for MVP, migrate to data file later.
- ❓ Should blocked tasks show what's blocking them (prerequisite task name)? Recommend: yes, as a subtle tooltip or sub-label.
- ❓ Should Kappa goal filter out "optional" tasks that aren't required? Recommend: yes, use tarkov.dev's task `kappaRequired` field if available.
