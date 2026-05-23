# Tarkov Tactics — Spec Roadmap

> This document maps out the recommended spec decomposition and build order.
> Each spec lives in `.specify/specs/` and follows the [spec template](../templates/spec-template.md).

## How Spec-Kit Works

```
Constitution (who we are)
    ↓
Spec (what to build)        ←── you write / review this
    ↓
Plan (how to build it)      ←── AI drafts, you approve
    ↓
Tasks (step-by-step work)   ←── AI executes, you verify
```

### The Workflow

1. **You write a Spec** — describe *what* you want in plain language using the template. Focus on the player experience, data needs, and edge cases. Don't worry about implementation details.

2. **AI drafts a Plan** — given your spec, the AI proposes the technical approach: which files to create/modify, data flow, component structure.

3. **You review the Plan** — approve, request changes, or add constraints.

4. **AI generates Tasks** — a phased checklist (data layer → logic → UI → integration).

5. **AI executes Tasks** — builds the feature, verifying as it goes.

6. **You verify** — run the app, check the result.

---

## Recommended Spec Order

Specs are ordered by dependency — each one builds on the previous.

### Layer 0: Foundation (no API needed)

| # | Spec | Feature | What it delivers |
|---|------|---------|-----------------|
| [`001`](001-app-shell.md) | **App Shell & Navigation** | `shared` | Sidebar, header, responsive layout, route navigation |

> ✅ Done — the app skeleton is live.

---

### Layer 1: Data Connection

| # | Spec | Feature | What it delivers |
|---|------|---------|-----------------|
| [`002`](002-tracker-connection.md) | **TarkovTracker Connection** | `shared` | Settings page token input, BFF proxy, `usePlayerState` wired to real data, connection status indicator |
| [`003`](003-game-data-service.md) | **Game Data Service** | `shared` | tarkov.dev queries for tasks/maps/items, server-side caching, typed query hooks |
| [`007`](007-team-progress.md) | **Team Progress & Squad Data** | `shared` | `useTeamState()`, BFF proxy for team endpoint, shared task computation, Team page |

> 002 is ✅ Done. After 003 + 007, the app has all data: player + team + game reference.

---

### Layer 2: Core Features

| # | Spec | Feature | What it delivers |
|---|------|---------|-----------------|
| [`004`](004-goal-selection.md) | **Goal Selection & Progress** | `goals` | Goal cards with live progress bars, active goal persistence, task breakdown with team overlap indicators |
| [`005`](005-vibe-selection.md) | **Vibe Selection** | `vibes` | Vibe mode cards, active vibe persistence, vibe → modifier mapping, team impact summary |

> Now the player can configure their Goal + Vibe — the two inputs to the dashboard. Team data enriches both.

---

### Layer 3: The Dashboard

| # | Spec | Feature | What it delivers |
|---|------|---------|-----------------|
| [`006`](006-dashboard.md) | **Next Raid Dashboard** | `dashboard` | Team-aware map scoring, loadout suggestion, prioritized POIs with teammate indicators, item watchlist with team needs, Team Impact section, risk indicators |

> The crown jewel — combines Goals + Vibes + Team into squad-optimized "next raid" output.

---

### Layer 4: Polish & Enhancements

| # | Spec | Feature | What it delivers |
|---|------|---------|-----------------|
| [`008`](008-error-resilience.md) | **Offline & Error Resilience** | `shared` | Graceful API failures, cached state, retry logic |

---

## Dependency Graph

```
001 (App Shell) ✅
 ├── 002 (Tracker Connection) ✅
 │    └── 007 (Team Progress) ←── promoted from Layer 4 to Layer 1
 ├── 003 (Game Data Service)
 ├── 004 (Goals) ←── enhanced by 007
 ├── 005 (Vibes) ←── enhanced by 007
 └── 006 (Dashboard) ←── depends on 002, 003, 004, 005, 007
      └── 008 (Error Resilience)
```

## How to Start

Pick a spec number and tell me:

> "Let's build spec 003"

I'll draft it using the template, you review and refine, then we move to plan → tasks → build.

**Next recommended spec: `spec-003` (Game Data Service)** — it's the last data layer piece before we can build features.
