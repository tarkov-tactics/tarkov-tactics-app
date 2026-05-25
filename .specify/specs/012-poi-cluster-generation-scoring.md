# Feature Spec: POI Cluster Generation & Scoring

> Status: `draft`
> Priority: `P0`
> Feature: `ranking`

## Overview

POI Cluster Generation & Scoring implements the third stage of the ranking pipeline. It groups loot containers, quest objective positions, and boss spawn locations on each map into spatially coherent clusters, scores each cluster by the expected goal-progress gain of visiting it, and attaches human-readable names. The output is a set of scored, named POI clusters per map that Stage 4 (Map Scoring) routes through.

Loot-gain scoring consumes pre-computed item probability distributions from the ETL pipeline when available; falls back to uniform priors when not. The named POI layer consumes pre-computed human-readable names from the ETL; falls back to synthetic identifiers.

## User Stories

- As a Tarkov player, I want the app to identify the most valuable locations on each map based on my current needs, not just generic "good loot" areas.
- As a Tarkov player, I want POIs named with recognizable map landmarks ("Dorms", "Gas Station") rather than numbered clusters.
- As a Tarkov player, I want POI scores to reflect both loot value and quest objectives, weighted by my active goal and vibe.
- As a Tarkov player, I want to know when loot scoring is based on estimated probabilities versus precise data.

## Data Requirements

### From TarkovTracker (Player State)

- None directly. Consumes Stage 2 item scores `I(i)` which incorporate player state.

### From tarkov.dev (Game Data)

- Map definitions — container positions, loose-loot spawn positions, boss spawn locations and spawn chances, extract positions
- Task objectives — objective positions, named zones, map assignments
- Extract/switch/named positions — for the named POI layer fallback hierarchy

### From ETL Pipeline (Pre-Computed Data)

- `loot-probabilities.json` — per-map, per-container-type item probability distributions with confidence flags. When unavailable, the system must use uniform priors (`1 / item_count_per_container_type`).
- `named-pois.json` — human-readable names for POI clusters. When unavailable, the system must use synthetic identifiers.

### Computed/Derived

- **POI clusters per map** — spatially coherent groups with centroid, member positions, radius, and access requirements
- **Per-cluster score** `P(c) ∈ [0, 1]` (normalized per map) — expected value of visiting the cluster
- **Per-cluster name** — human-readable label from the named POI layer
- **Per-cluster confidence** — whether loot scoring used pre-computed probabilities or uniform priors

## Cluster Generation

The system must generate POI clusters per map by spatially grouping:

- Loot container positions
- Loose-loot spawn positions
- Quest objective positions (from coordinate fields or inferred from named zones)
- Boss spawn locations

Grouping must use a spatial-proximity-based approach with:

- A configurable _proximity threshold_ (maximum distance between two points to be grouped together)
- A configurable _minimum cluster size_ (lone high-value points such as a single boss spawn must be retained as their own cluster)

Clusters must be generated once per game-data version and cached. Re-generation must be triggered when upstream map data changes.

## POI Score P(c)

```
P(c) = ( E[loot_gain(c)]
       + E[objective_gain(c)]
       + E[boss_gain(c)]
       − λ_K · key_cost_amortized(c, player)
       ) · extract_proximity(c)
```

- **`E[loot_gain(c)]`** = for each container in the cluster, sum over items: `spawn_probability(item, container) × I(item)`. Spawn probabilities sourced from `loot-probabilities.json` when available; uniform priors (`1 / item_count_per_container_type`) when not.
- **`E[objective_gain(c)]`** = for each quest objective positioned in the cluster: `R(parent_quest) × completion_probability`. For most objectives, completion probability is 1; for stochastic objectives (e.g., "survive a raid"), it is less.
- **`E[boss_gain(c)]`** = for each boss spawn point in the cluster: `spawn_chance × boss_value`. Boss value is a roll-up of boss-unique drops priced via `I(i)` plus any active boss-kill quest objectives.
- **`key_cost_amortized(c, player)`** — from the Key Economics Module (spec-013).
- **`extract_proximity(c)`** — distance from cluster centroid to the nearest reliable extract, normalized; closer to extract scores higher.

`P(c)` must be normalized per map: `P(c) / max(P(c'))` across all clusters on the map. This prevents maps with many POIs from inflating relative to maps with fewer but higher-value POIs.

## Named POI Layer

POI clusters must be presented to the user with human-recognizable names. The naming source hierarchy (each tried in order):

1. **ETL-provided names** (`named-pois.json`) — pre-computed human-readable names derived from extract/switch positions and directional proximity fallback.
2. **Game-data API named positions** — for spawns, extracts, switches, and named map positions, use names from the API directly.
3. **One-shot generated description** (optional) — if a language-model integration is configured, generate a description from surrounding landmarks. Cache for the cluster's lifetime. If not configured, skip this step.
4. **Synthetic identifier** — a generated identifier (e.g., `{map-name}-cluster-{index}`) as the final fallback.

**Quest-text matching**: the named POI layer must enable matching quest objectives to clusters by name (e.g., "in the Dorms area") as an alternative to coordinate matching. This is more robust to map-data updates.

Multi-floor maps must disambiguate floors correctly using vertical-layer information when available.

## Requirements

### Functional

- [ ] The system must generate spatially coherent POI clusters per map from container positions, loose-loot spawns, quest objective positions, and boss spawn locations
- [ ] Clustering must use a proximity-based approach with configurable threshold and minimum cluster size
- [ ] Clusters must be generated once per game-data version and cached; re-generation triggered on game-data change
- [ ] `P(c)` must be computed as specified: loot gain + objective gain + boss gain − key cost, modulated by extract proximity
- [ ] Loot gain must use per-container item probabilities from `loot-probabilities.json` when available
- [ ] When `loot-probabilities.json` is unavailable, the system must use uniform priors and set confidence to indicate estimated data
- [ ] When `loot-probabilities.json` is unavailable, a warning must be surfaced to the user that loot scoring accuracy is reduced
- [ ] `P(c)` must be normalized per map so the maximum equals 1
- [ ] Each cluster must be assigned a human-readable name following the naming hierarchy (ETL names → game-data names → optional LLM description → synthetic identifier)
- [ ] When `named-pois.json` is unavailable, the system must use synthetic identifiers as the final fallback
- [ ] The system must surface ETL data provenance for loot probability and named POI data
- [ ] Quest objectives must be matchable to clusters by both position and name
- [ ] Multi-floor maps must disambiguate clusters by vertical layer when layer data is available
- [ ] All cluster generation and scoring must be deterministic

### Non-Functional

- [ ] Cluster generation must be performant across all supported maps (currently 16)
- [ ] The confidence indicator (pre-computed probabilities vs. uniform prior) must be accessible per cluster

## Configuration Parameters

| Parameter | Purpose |
|-----------|---------|
| POI proximity threshold | Maximum distance between points for grouping into a cluster |
| Minimum POI cluster size | Minimum number of points to form a cluster; lone high-value points (boss spawns) retained as single-point clusters |

## Success Criteria

- [ ] Every supported map produces a set of named, scored POI clusters
- [ ] Clusters with quest objectives for high-impact requirements score higher than pure loot clusters (when the player has active quests)
- [ ] Boss spawn clusters are retained even when they contain only a single spawn point
- [ ] Named POIs use human-readable names when ETL data is available; synthetic identifiers otherwise
- [ ] Loot scoring uses pre-computed probabilities when available; uniform priors with degradation warning otherwise
- [ ] Cluster generation is consistent across identical game-data versions

## Edge Cases

- Map has no loot containers (e.g., a hypothetical arena map) → clusters generated from quest objectives and boss spawns only
- Map has no quest objectives for the player → clusters scored by loot and boss value only
- Map has no boss spawns → `E[boss_gain]` is zero for all clusters; clusters scored by loot and objectives
- All containers in a cluster are behind a locked door → cluster scored as locked area per spec-013 (Key Economics)
- Quest objective has coordinates that don't fall near any container or other point → objective forms its own cluster (minimum cluster size = 1 for quest objectives)
- `loot-probabilities.json` available but missing data for some maps → available maps use pre-computed data; missing maps use uniform priors
- `loot-probabilities.json` available but confidence flag is `uniform_prior` for some container types → those entries are treated as estimated data
- `loot-probabilities.json` available but confidence flag is `id_unmatched` for some items → items with unmatched IDs are excluded from loot scoring for that container type; warning surfaced
- `named-pois.json` available but missing names for some clusters → named clusters get ETL names; unnamed clusters fall through to the naming hierarchy
- `loot-probabilities.json` stale → data still used with staleness warning
- `loot-probabilities.json` schema version mismatch → treated as unavailable; uniform priors used
- `named-pois.json` stale → data still used with staleness warning
- `named-pois.json` schema version mismatch → treated as unavailable; synthetic identifiers used
- Two quest objectives reference the same named zone but the zone has no coordinate data → objectives grouped by zone name match rather than spatial proximity

## Dependencies

- Depends on: `spec-009` (ETL Data Loader — for `loot-probabilities.json` and `named-pois.json`)
- Depends on: `spec-010` (Requirement Impact Scoring — `R(r)` for objective gain)
- Depends on: `spec-011` (Item Priority Scoring — `I(i)` for loot gain and boss value)
- Depends on: `spec-013` (Key Economics — `key_cost_amortized` for key-gated clusters)
- Depends on: `spec-003` (Game Data Service — map data, container positions, extract positions)

## Open Questions

- ✅ Resolved: `extract_proximity(c)` uses straight-line distance to the nearest extract, ignoring conditional-availability extracts for now. All extracts are treated as equally reliable. <!-- Future implementation: weight by extract reliability (conditional vs. always-open) once extract condition data is available from the game-data API. -->
- ✅ Resolved: Loose-loot spawn positions have the same weight as container positions during cluster generation — no differentiation.

---

### Specification Quality Checklist

- [x] No implementation details (no algorithms, languages, frameworks, or libraries named)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] Edge cases identified, including ETL-specific scenarios for both loot probabilities and named POIs
- [x] Scope bounded — Stage 3 cluster generation and scoring; Key Economics separated into spec-013
- [x] No forbidden terms (DBSCAN, PageRank, Orienteering, TypeScript, Python, GraphQL, DAG, library names)
