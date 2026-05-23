# Tarkov Tactics — Project Constitution

> This document defines the immutable principles, standards, and architecture for the Tarkov Tactics app. All AI-generated code MUST follow these rules.

## Project

Tarkov Tactics is a companion app for Escape from Tarkov. It does **not** replace TarkovTracker or tarkov.dev — it sits on top of them to deliver a single answer: **"What should my squad and I do in our next raid?"**

## Tech Stack

- **Framework**: Next.js 15 App Router
- **Language**: TypeScript (strict mode, no `any`)
- **Styling**: Tailwind CSS v4 + shadcn/ui (New York style)
- **Fonts**: Red Hat Text (primary) / Geist Mono (code) via next/font
- **Deployment**: Self-hosted, containerized (Docker, standalone output)

## Architecture

Domain-driven structure around four Core Concepts:

1. **Goals** — Static progression paths (Prestige, Kappa, Story Endings, Lightkeeper)
2. **Vibes** — Short-term raid intent (Loot Run, PvP/Mixed, Boss Rush)
3. **Team** — TarkovTracker team progression, shared tasks, and squad coordination
4. **Dashboard** — Next Raid output combining Goals + Vibes + Team into map, loadout, POIs, watchlist

### Data Provider Stack

Three global context providers live in `AppShell` (order matters):

```
PlayerStateProvider  →  TarkovTracker /progress (Bearer token)
  TeamStateProvider  →  TarkovTracker /team/progress (TP permission)
    GameDataProvider →  tarkov.dev GraphQL (no auth, cached)
```

- `usePlayerState()` — player tasks, hideout, level, faction
- `useTeamState()` — teammates' progress, shared tasks, permission status
- `useGameData()` — all game tasks, maps from tarkov.dev (fetched once, shared)

**Critical rule**: progress computation ALWAYS cross-references game data (tarkov.dev) with player state (TarkovTracker). Never compute progress from player data alone — the game data defines the universe of tasks, the player data says which are complete.

## Data Sources

| Source | Type | Auth | Purpose |
|--------|------|------|---------|
| TarkovTracker (`api.tarkovtracker.org`) | REST | Bearer token | Player + team progression state |
| tarkov.dev (`api.tarkov.dev/graphql`) | GraphQL | None | Game reference data |

### Team Data

TarkovTracker tokens with `TP` (Team Progress) permission unlock the `/team/progress` endpoint, returning the full `ProgressData` for every visible teammate. This data is a **first-class input** to the recommendation engine:

- **Map Scoring**: maps where teammates also have open quests score higher (squad efficiency)
- **Task Priority**: shared tasks (needed by player + teammates) are visually boosted
- **Item Watchlist**: items needed by teammates appear with "teammate needs this" context
- **Dashboard**: "Team Impact" section shows which teammates benefit from the recommendation

When the token lacks `TP` permission, team features degrade gracefully — no errors, just individual-only recommendations.

## Workflow — Spec-Driven Development

**Specs (`.specify/specs/*.md`) are the single source of truth.** Follow this order strictly:

1. **Read relevant specs** before making any change
2. **Update specs first** if the implementation requires changes to data flow, architecture, or components
3. **Implement based on updated specs** — code follows spec, not the other way around
4. **Verify specs match code** after implementation — loop back and fix any drift

Never implement something that isn't described in the relevant spec. If a spec is missing something, add it to the spec first.

## Code Rules

- Server Components by default; only add `'use client'` when interactive state is needed
- Feature-based folder structure under `src/features/`
- Import alias: `@/*` maps to `src/*`
- No `any` type; strict TypeScript throughout
- ESLint enforced, conventional commits
- Named exports preferred (except page components)
- Base UI Button: use `nativeButton={false}` when rendering as `<Link>` or `<a>`

## Design System

- Dark military theme with purple accent palette (oklch hue 285)
- Default to dark mode (`<html class="dark">`)
- shadcn/ui primitives for all UI components
- Responsive-first design
- Geist Mono for code, Red Hat Text for UI via next/font

## Testing

- Vitest + React Testing Library
- Test business logic in `lib/` directories
- Test hooks with renderHook

