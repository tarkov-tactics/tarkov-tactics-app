# Feature Spec: Team Progress & Squad Data

> Status: `done`
> Priority: `P0`
> Feature: `shared`

## Overview
Fetch, cache, and expose the TarkovTracker team progression data as a **first-class input** to the recommendation engine. When the player's token has `TP` (Team Progress) permission, the app fetches all visible teammates' progression and makes it available app-wide via `useTeamState()`. This data feeds into Goals (shared tasks), Vibes (team impact summary), and the Dashboard (team-aware map/POI/watchlist scoring). A dedicated Team page also lets players view and compare squad progression.

## User Stories
- As a squad player, I want the app to know my teammates' quest progress so it can recommend maps that benefit the whole group.
- As a squad player, I want to see which quests my teammates also need so we can coordinate raids.
- As a squad player, I want to see my teammates' levels and factions at a glance.
- As a squad player, I want the Dashboard to tell me how many teammates benefit from each recommendation.
- As a solo player, I want team features to degrade gracefully — no errors, just individual recommendations.

## Data Requirements
### From TarkovTracker (Player State)
- `GET /team/progress` — returns array of `ProgressData` for all visible teammates
- Requires `TP` (Team Progress) permission on the token
- Rate limit: shares the same pool as other TarkovTracker endpoints (~60 req/min)

### From tarkov.dev (Game Data)
- `tasks` — to resolve task IDs to names/maps (for shared task display)

### Computed/Derived
- `teammates` — array of `TeammateData` (enriched `ProgressData` with computed fields)
- `hasTeamPermission` — whether the token has `TP` permission
- `sharedOpenTasks` — tasks that the player AND 1+ teammates both need (incomplete)
- `teamTaskOverlap(mapId)` — count of shared open task objectives on a given map
- `teammatesByMap(mapId)` — which teammates have open objectives on that map
- `teamGoalAlignment` — for the active goal, how many requirements overlap with teammates
- `teamSize` — count of visible teammates (0 = solo / no permission)

## UI Components
| Component | Location | Type | Description |
|-----------|----------|------|-------------|
| `TeamOverview` | `features/team/components/team-overview.tsx` | Client | Grid of teammate summary cards |
| `TeammateCard` | `features/team/components/teammate-card.tsx` | Client | Name, level, faction, progress bar, shared task count |
| ~~`SharedTasksList`~~ | — | — | **Inlined** — shared tasks are rendered directly in the Team page (`app/team/page.tsx`) as a flat list with wiki-linked task names and teammate counts. Not extracted into a separate component. |
| ~~`SharedTaskItem`~~ | — | — | **Inlined** — individual shared task rows are rendered inline in the Team page. |
| `TeamPermissionPrompt` | `features/team/components/team-permission-prompt.tsx` | Client | CTA to upgrade token with TP permission |

## Requirements
### Functional
- [x] Team page accessible from sidebar navigation (icon: Users)
- [x] `TeamStateProvider` context wraps the app, exposing `useTeamState()` globally
- [x] Team data is fetched alongside player data when token has `TP` permission
- [x] **Reactive token sync**: `TeamStateProvider` must react to token changes from `PlayerStateProvider`. When a user enters their API key for the first time, team data must be fetched automatically without requiring a page reload. Implementation: `TeamStateProvider` consumes `usePlayerState()` to get the current connection status and token, rather than reading localStorage directly on mount.
- [x] BFF route `/api/tracker/team` proxies `GET /team/progress`
- [x] Team page shows teammate cards in a responsive grid
- [x] Each teammate card: display name, level (badge), faction, shared quest count with player. Edition and overall task completion % are **not shown** — task completion was confusing without context (it showed ALL game tasks, not just relevant ones)
- [x] "Shared Tasks" section: tasks that the player AND 1+ teammates both need (displayed as flat list with teammate counts). The player's open task set is filtered for **actionability** (prerequisites met, player level sufficient, Fence excluded) before computing shared tasks — blocked quests don't appear. Task names must be resolved to human-readable names by cross-referencing task IDs against the game data task list from `useGameData()` — never display raw task IDs to the user. **Task names must link to the Tarkov wiki** via `task.wikiLink` (from tarkov.dev), opening in a new tab.
- [ ] Shared tasks grouped by map for easy raid planning
- [ ] Each shared task shows which teammates need it (avatar/initial bubbles)
- [x] If token lacks `TP` permission → show upgrade prompt with link to TarkovTracker
- [x] If no teammates → show "No teammates found" empty state
- [ ] Hidden teammates (from `meta.hiddenTeammates`) shown as "Hidden" count
- [x] Computed helpers are exported for other specs to consume:
  - `getSharedOpenTasks(playerProgress, teamProgress[], gameTasks[])` 
  - `getTeamTaskOverlap(mapId, playerProgress, teamProgress[], gameTasks[])`
  - ~~`getTeammatesByMap(mapId, teamProgress[], gameTasks[])`~~ — deferred until ranking system needs it

### Non-Functional
- [ ] Team data cached for 5 minutes (reduce API load) — deferred to spec-008
- [ ] Stale team data shown with freshness indicator — deferred to spec-008
- [x] Team features never block or error when TP permission is missing
- [x] Team computation should be fast (<100ms for 5 teammates)

## Success Criteria
- [ ] Connected player with TP permission sees all visible teammates
- [ ] Shared tasks correctly computed and displayed
- [ ] `useTeamState()` returns team data anywhere in the app
- [ ] Missing TP permission shows clear, non-blocking upgrade message
- [ ] Other specs (004, 005, 006) can consume team computed helpers

## Edge Cases
- Token doesn't have `TP` permission → `teamSize = 0`, all team features show graceful empty states
- No teammates in team → show "No teammates found" (different from no permission)
- Teammate has hidden their profile → listed in `hiddenTeammates`, shown as count
- API rate limited → show cached team data with staleness indicator
- Teammate has different game mode (PVP vs PVE) → show warning badge on their card
- Very large team (10+ members) → paginate or scroll, limit shared task computation
- Shared task ID not found in game data (tarkov.dev task list outdated or ID mismatch) → display the raw task ID as fallback, do not hide the task

## Dependencies
- Depends on: `spec-001` (App Shell — Team page renders inside the shell)
- Depends on: `spec-002` (TarkovTracker Connection — token and player state)

## Open Questions
- ❓ Should team data auto-refresh on a timer or only on manual refresh? Recommend: auto-refresh every 5 min if tab is visible, manual refresh button always available.
