# Feature Spec: Game Data Service

> Status: `done`
> Priority: `P0`
> Feature: `shared`

## Overview
Fetch and cache game reference data from the tarkov.dev GraphQL API. This includes tasks (quests), maps, items, hideout stations, and **community-reported Goon Squad sightings**. Static reference data is fetched once on mount; the Goon Reports feed is live community telemetry that **polls on a short interval**. Other features (Goals, Vibes, Dashboard) consume this data to compute recommendations. The service operates at two levels: server-side functions for SSR/build-time use, and a client-side `GameDataProvider` context for shared access across all client components.

## User Stories
- As a Tarkov player, I want the app to know all available quests and their requirements so it can tell me what to do next.
- As a Tarkov player, I want map data (bosses, raid duration) to be available so the app can recommend where to go.
- As a Tarkov player, I want fast page loads — game data shouldn't be re-fetched on every navigation.

## Data Requirements
### From TarkovTracker (Player State)
- None for this spec (player state is spec-002).

### From tarkov.dev (Game Data)
- `tasks` — quest ID, name, trader, map, level requirement, `kappaRequired`, `taskRequirements`, objectives (type, description, maps)
- `maps` — map ID, name, bosses (name, spawn chance), raid duration, enemies
- `items` — item ID, name, icon, 24h price, sell-for prices
- `hideoutStations` — station ID, name, levels with item requirements
- `goonReports(gameMode)` — community-submitted Goon Squad sightings; returns `{ map { id name }, timestamp }[]`. Filterable by `pvp` / `pve` to match the player's connected game mode.
- `prestige` — prestige tier definitions: conditions (player level, skills, hideout stations, roubles, gating quest), rewards, and transfer settings. Used by the Prestige goal to determine tier requirements dynamically rather than relying solely on hardcoded values.

### Computed/Derived
- `tasksByMap` — tasks grouped by their primary map and objective maps
- `bossSpawnsByMap` — boss spawn chances keyed by map name
- `latestGoonSighting` — the single most recent goon report across all maps (used as the "Goons sighted" hero indicator)
- `goonSightingByMap(mapId)` — most recent report for a given map, with relative-time formatting (e.g., "2m ago")

## Architecture

### Server-Side (SSR / build-time)
| Function | Location | Description |
|----------|----------|-------------|
| `getGameTasks()` | `lib/api/tarkov-dev/game-data.ts` | Fetches all tasks, returns `TarkovTask[]` |
| `getGameMaps()` | `lib/api/tarkov-dev/game-data.ts` | Fetches all maps, returns `TarkovMap[]` |
| `getGameItems()` | `lib/api/tarkov-dev/game-data.ts` | Fetches all items, returns `TarkovItem[]` |
| `getHideoutStations()` | `lib/api/tarkov-dev/game-data.ts` | Fetches hideout data, returns `HideoutStation[]` |
| `getTasksByMap()` | `lib/api/tarkov-dev/game-data.ts` | Computed: tasks grouped by map |
| `getBossSpawnsByMap()` | `lib/api/tarkov-dev/game-data.ts` | Computed: boss spawns keyed by map |

### Client-Side (shared context)
| Component | Location | Description |
|-----------|----------|-------------|
| `GameDataProvider` | `hooks/use-game-data.tsx` | React context provider, fetches static tarkov.dev data once on mount via `/api/tarkov` BFF, exposes `useGameData()` |
| `GoonReportsProvider` | `hooks/use-goon-reports.tsx` | Lightweight provider nested inside `GameDataProvider`. Polls `/api/tarkov` for `goonReports` on a configurable interval (default **3 minutes**, paused when tab is hidden via `visibilitychange`). Exposes `useGoonReports()` returning `{ reports, latest, byMap(mapId), lastFetched, isStale }`. |

The `GameDataProvider` lives in `AppShell` (after `TeamStateProvider`) and ensures all pages share a single fetch of static game data. Goon reports are separated into their own provider so the polling lifecycle doesn't trigger re-renders of the entire static data tree. Every feature that needs game tasks/maps consumes `useGameData()`; sighting consumers use `useGoonReports()` — no duplicate fetches.

### BFF Route
| Route | Location | Description |
|-------|----------|-------------|
| `POST /api/tarkov` | `app/api/tarkov/route.ts` | Proxies GraphQL requests to `api.tarkov.dev/graphql` |

## Requirements
### Functional
- [x] Server-side data fetching functions in `lib/api/tarkov-dev/game-data.ts`
- [x] Client-side `GameDataProvider` context in `hooks/use-game-data.tsx`
- [x] `useGameData()` hook returns: `{ tasks, maps, isLoading, error, dataLoaded, refresh }`
- [x] Provider fetches tasks + maps on mount via `/api/tarkov` BFF (two parallel GraphQL queries)
- [x] `GameDataProvider` is mounted in `AppShell`, shared across all pages
- [x] GraphQL queries include `kappaRequired` and `taskRequirements` fields on tasks
- [x] Error handling: sets `error` state, returns empty arrays on failure
- [x] All data typed against `src/lib/api/tarkov-dev/types.ts`
- [x] Add `GOON_REPORTS_QUERY` to `lib/api/tarkov-dev/queries.ts` — includes `gameMode` variable and `limit: 50`
- [x] Goon reports fetched client-side via `GoonReportsProvider` (no separate server-side function — client fetches directly through BFF proxy)
- [x] `GoonReportsProvider` polls every 3 min (config constant `GOON_POLL_INTERVAL_MS`), passes the player's `gameMode` (from `usePlayerState`) as the query variable
- [x] Polling pauses when `document.visibilityState === 'hidden'`, resumes on visibility
- [x] `useGoonReports()` returns helpers: `latest` (most recent across all maps), `byMap(mapId)` (most recent for that map or `null`), `isStale` (true if `lastFetched > 10 min ago` due to errors)
- [x] Time formatting helper `formatRelativeTime(date)` exported from `lib/utils.ts` — returns "Xs/m/h ago"

### Non-Functional
- [x] Single fetch on mount — no refetching on navigation between pages
- [x] Uses `requestAnimationFrame` wrapper for initial fetch (React 19 compliance)
- [x] Cleanup via `AbortController` on unmount
- [x] `refresh()` function for manual re-fetch
- [x] Goon reports poll respects tarkov.dev fair-use (3 min default is conservative). Manual `refresh()` has no additional rate guard but the polling interval is the primary mechanism.

## Success Criteria
- [x] `useGameData()` returns typed task + map data on every page
- [x] Goals page shows real task counts from tarkov.dev (not 0)
- [x] Dashboard uses shared game data (no duplicate fetch)
- [x] Build passes with no TypeScript errors

## Edge Cases
- tarkov.dev API is down → `error` state set, empty arrays returned, UI shows error indicator
- tarkov.dev returns partial data → handle nullable fields in types
- Component unmounts during fetch → `AbortController` cancels, no state updates
- GraphQL query errors → error message surfaced via `error` state
- **Goon reports** — `goonReports` field unavailable on tarkov.dev (schema change / outage): `useGoonReports()` returns `{ reports: [], latest: null, isStale: true }` and consuming components hide the sighting indicator (no error toast — it's optional intel)
- **Goon reports** — no `gameMode` available yet (player not connected): provider stays idle until `gameMode` is set; defaults to `pvp` if player explicitly disconnects mid-session
- **Goon reports** — extremely old report (last sighting >24h ago): UI still renders the badge but with `stale` styling (muted color) since the threat profile is materially different

## Dependencies
- None for static data — independent of TarkovTracker connection
- Goon reports provider **reads** `gameMode` from `usePlayerState()` (spec-002) but degrades gracefully if disconnected

## Open Questions
- ✅ Resolved: Use raw fetch (not a GraphQL client library) — queries are static and few
- ❓ Should goon reports also poll while disconnected (default `pvp` mode)? Recommend: **no** — gating on connection avoids confusing PVE players with PVP sightings.
