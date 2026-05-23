# Feature Module Pattern

Each feature is a self-contained module with co-located code:

```
features/<name>/
├── components/   # Feature-specific UI components
├── hooks/        # Feature-specific React hooks
├── lib/          # Feature-specific utilities, types, logic
└── types.ts      # Feature-specific type definitions (preferred over lib/types.ts)
```

## Rules
- Features may import from `@/lib`, `@/hooks`, `@/types`, `@/components`
- Features must NOT import from other features (except `VibeQuickSwitch` used in Dashboard — cross-feature UI is acceptable for embedding)
- Cross-feature **data** communication goes through shared hooks (`usePlayerState`, `useTeamState`, `useGameData`)

## Shared Data Providers (in `src/hooks/`)
- `usePlayerState()` — TarkovTracker player progression
- `useTeamState()` — TarkovTracker team progression
- `useGameData()` — tarkov.dev game tasks + maps (shared context, fetched once)

**Critical rule**: Features must NEVER fetch game data independently. Always consume `useGameData()` from the shared provider.

## Current Features
- `goals/` — Goal engine: per-goal progress computation (cross-references `useGameData()` + `usePlayerState()`)
- `vibes/` — Vibe engine: raid mode selection, map/loadout weighting
- `dashboard/` — Next Raid Dashboard: recommendation engine combining Goals + Vibes + Team via `useGameData()`
- `team/` — Team Progress: teammate cards, shared tasks, permission prompt
- `settings/` — TarkovTracker connection settings
