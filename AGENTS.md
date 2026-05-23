# Tarkov Tactics App

## Project Overview
Companion app for Escape from Tarkov that generates personalized raid recommendations by combining player progression state (TarkovTracker) with game reference data (tarkov.dev).

## Tech Stack
- Next.js 15 App Router with TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui (New York style)
- Self-hosted containerized deployment

## Data Sources
- **TarkovTracker REST API** (`api.tarkovtracker.org`): Player progression — tasks, hideout, level, faction. Bearer token auth.
- **tarkov.dev GraphQL API** (`api.tarkov.dev/graphql`): Game reference data — items, quests, maps, traders, ammo. No auth.

## Core Concepts
- **Goals**: Static progression paths (Prestige Level, Kappa Container, Story Endings, Lightkeeper Unlock)
- **Vibes**: Short-term raid intent (Loot Run, PvP/Mixed, Boss Rush)
- **Team**: TarkovTracker team progression, shared tasks, squad coordination
- **Dashboard**: Next Raid output combining Goals + Vibes + Team into map, loadout, POIs, watchlist

## Data Architecture

Three global context providers live in `AppShell` (in this order):
1. **`PlayerStateProvider`** (`src/hooks/use-player-state.tsx`) — TarkovTracker player progression
2. **`TeamStateProvider`** (`src/hooks/use-team-state.tsx`) — TarkovTracker team progression (requires TP permission)
3. **`GameDataProvider`** (`src/hooks/use-game-data.tsx`) — tarkov.dev game reference data (tasks, maps)

Features consume these via `usePlayerState()`, `useTeamState()`, `useGameData()`.
Progress computation always cross-references game data (tarkov.dev) with player state (TarkovTracker).

## Workflow — Spec-Driven Development

**Specs are the single source of truth.** Follow this order strictly:

1. **Read existing specs** before making any change
2. **Update specs first** if the implementation requires changes to data flow, architecture, or components
3. **Implement based on updated specs** — code follows spec, not the other way around
4. **Verify specs match code** after implementation — loop back and fix any drift

Never implement something that isn't described in the relevant spec. If a spec is missing something, add it to the spec first.

Spec files: `.specify/specs/*.md`
Constitution: `.specify/memory/constitution.md`

## Conventions
- Server Components by default; only add `'use client'` when interactive state is needed
- Feature-based folder structure under `src/features/`
- Import alias: `@/*` maps to `src/*`
- No `any` type; strict TypeScript throughout
- Dark mode default with purple accent palette
- Base UI Button: use `nativeButton={false}` when rendering as `<Link>` or `<a>`

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
