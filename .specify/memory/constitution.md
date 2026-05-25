# Tarkov Tactics — Project Constitution

> This document defines the immutable principles, standards, and architecture for the Tarkov Tactics app. All AI-generated code MUST follow these rules.

## Project

Tarkov Tactics is a companion app for Escape from Tarkov. It does **not** replace TarkovTracker or tarkov.dev — it sits on top of them to deliver a single answer: **"What should my squad and I do in our next raid?"**

## Tech Stack

- **Framework**: Next.js 15 App Router
- **Language**: TypeScript (strict mode, no `any`)
- **Styling**: Tailwind CSS v4 + shadcn/ui (New York style)
- **Fonts**: **Hanken Grotesk** (UI / body / headlines) / **Geist Mono** (telemetry, labels, numerics) — both via next/font. Geist Mono is preferred over Geist sans for telemetry because numerical alignment in metric tiles ("100%", "6.5M/10M", spawn chances) is functionally important; the Stitch DESIGN.md references "Geist" but the project brief prescribes a monospaced font for tactical data — we follow the brief.
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
- **localStorage hydration**: never read `localStorage` inside `useState` initializers — it runs on the server (where `window` is undefined) and produces values that mismatch the client, causing hydration errors. Always initialize with a static default and sync from `localStorage` in a `useEffect`.

## Design System — Tarkov Tactical Interface (TTI)

Visual identity: **Corporate-Industrial, high-contrast tactical dark mode** — evokes a weathered military field tablet. The Stitch design exports in `stitch-import/` are the canonical reference; this section codifies the rules code must follow.

### Mode
- Default to dark mode (`<html class="dark">`). Light mode is a fallback only.

### Color tokens (oklch in `globals.css`)

All app colors come from CSS variables. Code never hard-codes hex.

- **Surface tiers** (tonal layers, no shadows): `--background` (Blackout Slate `#141318`), `--card` (Ballistic Carbon `#201f24`), `--muted` (`#2b292f`). Separation via 1px `--border` (`#4b4453`), not drop shadows.
- **Primary** — Tactical Violet (`#d9b9ff` ≈ `oklch(0.82 0.10 305)`): active states, focus rings, critical telemetry, progress bars.
- **Functional state tokens** (semantic, hue-locked):
  - `--emerald` — secure pathways, completed tasks, low risk
  - `--amber` — pending objectives, medium threats, key-gated
  - `--destructive` — high-risk zones, boss spawns, extreme threats (already exists)
- Each functional token must also expose `/10` (background) and `/20` (border) opacity variants for the standard **pill badge** pattern.

### Typography
- **Hanken Grotesk** — all UI text, headlines, body. Headlines use tight tracking (`-0.025em` for display, `-0.015em` for headline-md). Exposed as the Tailwind `font-sans` token via `--font-sans` in `globals.css`.
- **Geist Mono** — telemetry, numerics, item budgets, coordinates, monospaced labels. Exposed as the Tailwind `font-mono` token via `--font-mono` → `--font-geist-mono`.
- **Telemetry label utility** (`text-telemetry`, defined via `@utility` in `globals.css`): Geist Mono, 10px, weight 600, `letter-spacing: 0.05em`, uppercase. Used on every panel label (e.g., "SELECT VIBE", "BOSS PROBABILITY", "PMC LEVEL 42"). High repetition — must be a single utility, not a copy-paste class chain.

### Layout & spacing
- **4px base unit.** Spacing tokens: `xs=4`, `sm=8`, `md=16`, `lg=24`, `xl=32`.
- **Centralized dashboard column** — max-width 896–1024px on desktop, mimicking a tablet interface.
- **Sidebar**: 224px on desktop, 64px icon-only on tablet, slide-out Sheet on mobile.
- Tight vertical rhythm (`space-y-3`/`space-y-4`) — dense, scannable.

### Shape language
- Cards / panels: `rounded-lg` (0.5rem)
- Buttons / inputs: `rounded-md` (0.375rem) — tool-like, compact
- Pill badges: `rounded-full`
- Buttons: 32px (default) / 36px (lg) height. Primary = solid Tactical Violet fill. Secondary = transparent + 1px border.

### Interaction
- Active state uses **mechanical translation** (`active:translate-y-px`) — already in the Button base, must apply to interactive cards/list items too.
- Focus ring: 3px Tactical Violet ring (`--ring`).
- Overlays: 80% backdrop + 12px blur.

### Standard component patterns
- **Tactical Card** — `bg-card`, `border border-border`, `rounded-lg`, 16–20px internal padding. Header may include a telemetry label in the top corner.
- **Status pill badge** — `rounded-full`, `bg-{state}/10`, `border border-{state}/20`, mono text, high contrast.
- **Progress bar** — `bg-muted` track, `bg-primary` fill, 2–3px height, sharp edges or minimally rounded.
- **Labeled selector** — small telemetry label above a compact button with chevron (used in "INTEL BRIEFING" header for Vibe + Directive switching, and in the Directives side column for scope filtering).
- **Card density variants** — tactical cards that appear in more than one dashboard slot expose a `variant` prop (typically `'hero' | 'compact'`; Loadout adds `'kit-detailed'`; Threat Assessment exposes an orthogonal `format: 'tiles' | 'rows' | 'bars'`). The variant is assigned by the active layout composition, NOT inferred from screen size — mobile keeps the assigned variant. One component, multiple densities; no per-vibe duplicate components.

### Reference
- Visual exports: `stitch-import/tarkov_tactical_interface/DESIGN.md` (tokens), `stitch-import/*/code.html` (reference markup), `stitch-import/*/screen.png` (target renders).
- Brand brief: `stitch-import/project_brief_tarkov_tactical_interface.md`.

## Testing

- Vitest + React Testing Library
- Test business logic in `lib/` directories
- Test hooks with renderHook

