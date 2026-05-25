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

### Layer 5: Ranking System

The ranking system replaces the simplified scoring formulas in spec-006 with a full four-stage pipeline. All specs are `ranking` feature type.

| # | Spec | Feature | What it delivers |
|---|------|---------|-----------------|
| [`009`](009-etl-data-loader.md) | **ETL Data Loader** | `ranking` | Fetches, validates (SHA-256), and caches pre-computed data from the companion ETL pipeline. Defensive fallback per file. |
| [`010`](010-requirement-impact-scoring.md) | **Requirement Impact Scoring** | `ranking` | Stage 0 (open requirements) + Stage 1 (`R(r)`): unlock graph, gating value, passive-quest scoring with constraint decomposition. |
| [`011`](011-item-priority-scoring.md) | **Item Priority Scoring** | `ranking` | Stage 2 (`I(i)`): roll-up from requirement impact to items, FIR handling, stash blind spot. |
| [`012`](012-poi-cluster-generation-scoring.md) | **POI Cluster Generation & Scoring** | `ranking` | Stage 3 cluster generation + `P(c)` scoring: spatial clustering, loot/objective/boss gains, named POI layer. |
| [`013`](013-key-economics-module.md) | **Key Economics Module** | `ranking` | Stage 3 sub-module: amortized key cost, degraded sub-clusters for unobtainable keys, loadout cost integration. |
| [`014`](014-map-scoring-route-optimization.md) | **Map Scoring & Route Optimization** | `ranking` | Stage 4 (`M(m)`): spawn clustering, route construction, dispersion-penalized map aggregation, constrained-quest bonus. |
| [`015`](015-ranking-loadout-interface.md) | **Ranking-to-Loadout Interface Contract** | `ranking` | Structured output payload: map, routes, watchlist, constraints, reason structures. |

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
      ├── 008 (Error Resilience)
      └── Ranking System (009–015) ←── replaces 006's inline scoring formulas
           009 (ETL Data Loader) ←── foundation, no ranking deps
            ├── 010 (Requirement Impact) ←── depends on 009
            │    └── 011 (Item Priority) ←── depends on 010
            │         ├── 012 (POI Clusters) ←── depends on 011, 009
            │         └── 013 (Key Economics) ←── depends on 011
            │              └── 014 (Map Scoring) ←── depends on 012, 013, 009
            │                   └── 015 (Ranking-Loadout Interface) ←── depends on 014
            └── (all ranking specs also depend on 002, 003, 004, 005)
```

## How to Start

Pick a spec number and tell me:

> "Let's build spec 003"

I'll draft it using the template, you review and refine, then we move to plan → tasks → build.

**Next recommended spec: `spec-009` (ETL Data Loader)** — it's the foundation of the ranking system and must be implemented before the other ranking specs.
