# Feature Spec: Game Data Service

> Status: `done`
> Priority: `P0`
> Feature: `shared`

## Overview
Fetch and cache game reference data from the tarkov.dev GraphQL API. This includes tasks (quests), maps, items, and hideout stations. This data is static within a wipe cycle and changes infrequently. Other features (Goals, Vibes, Dashboard) consume this data to compute recommendations. The service operates at two levels: server-side functions for SSR/build-time use, and a client-side `GameDataProvider` context for shared access across all client components.

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

### Computed/Derived
- `tasksByMap` — tasks grouped by their primary map and objective maps
- `bossSpawnsByMap` — boss spawn chances keyed by map name

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
| `GameDataProvider` | `hooks/use-game-data.tsx` | React context provider, fetches tarkov.dev data once on mount via `/api/tarkov` BFF, exposes `useGameData()` |

The `GameDataProvider` lives in `AppShell` (after `TeamStateProvider`) and ensures all pages share a single fetch of game data. Every feature that needs game tasks/maps consumes `useGameData()` — no duplicate fetches.

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

### Non-Functional
- [x] Single fetch on mount — no refetching on navigation between pages
- [x] Uses `requestAnimationFrame` wrapper for initial fetch (React 19 compliance)
- [x] Cleanup via `AbortController` on unmount
- [x] `refresh()` function for manual re-fetch

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

## Dependencies
- None — this is independent of TarkovTracker connection

## Open Questions
- ✅ Resolved: Use raw fetch (not a GraphQL client library) — queries are static and few
