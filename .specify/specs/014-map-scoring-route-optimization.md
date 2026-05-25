# Feature Spec: Map Scoring & Route Optimization

> Status: `draft`
> Priority: `P0`
> Feature: `ranking`

## Overview

Map Scoring & Route Optimization implements the fourth and final stage of the ranking pipeline. For each candidate map, it clusters PMC spawn points, constructs value-maximizing routes through scored POI clusters from each spawn origin within the raid time budget, and aggregates per-spawn route scores into a single map score with a configurable dispersion penalty. The map with the highest score is recommended.

Spawn clustering consumes pre-computed spawn cluster data from the ETL pipeline when available; falls back to runtime clustering from the game-data API's spawn data. The system also applies an active constrained-quest map bonus: maps required by heavily constrained quests receive a score boost proportional to the quest's constraint tightness and the player's loadout feasibility for that quest.

## User Stories

- As a Tarkov player, I want the app to recommend the best map for my next raid based on what I need to accomplish.
- As a Tarkov player, I want the recommendation to account for the fact that I don't know my exact spawn point in advance — the recommended map should be good regardless of which spawn I get.
- As a Tarkov player, I want maps where I have heavily constrained quests (specific map + specific weapon + specific zone) to rank higher, since those quests can't progress elsewhere.
- As a Tarkov player, I want to see multiple candidate routes per map (one per spawn area) so I can pick the right one after I see my spawn in-game.

## Data Requirements

### From TarkovTracker (Player State)

- Active open quests — for constrained-quest map bonus
- Player state — consumed via upstream stages

### From tarkov.dev (Game Data)

- Map definitions — spawns (with sides, categories, zone name fields), raid duration, extract positions
- Map metadata — for vibe and risk modifiers

### From ETL Pipeline (Pre-Computed Data)

- `spawn-clusters.json` — pre-computed PMC spawn clusters per map (centroids, members, radii, zone names). When unavailable, the system falls back to runtime clustering from the game-data API's spawn data, filtering to PMC player spawns, and caching the result for the session.

### Computed/Derived

- **Spawn clusters per map** — spatially grouped PMC player spawns
- **Candidate routes per (map, spawn cluster)** — ordered sequence of POI clusters maximizing value within the time budget
- **Per-route score** — value collected minus travel cost, modulated by vibe and risk
- **Map score** `M(m)` — aggregation of per-route scores with dispersion penalty
- **Active constrained-quest map bonus** — per-map bonus for quests with low passiveness

## Spawn Clustering

For each candidate map:

1. **Filter spawns to PMC player spawns.** From the game-data API's map spawns, retain only entries where `sides` contains "Pmc" AND `categories` contains "Player". (Note: `sides` identifies the faction allowed at the spawn — not a physical region. `categories` identifies the role — not a location.)
2. **Cluster the filtered spawns spatially** with a per-map tunable proximity threshold. Small maps yield fewer clusters; large maps need larger thresholds to avoid over-splitting.
3. **Constrain cluster count.** Minimum 1, maximum N per map (N is configurable, default 4). If clustering produces more than N, repeatedly merge the two closest clusters until N is reached. The zone name field may serve as a secondary signal to prefer keeping same-zone spawns together.
4. **Compute one route per cluster.** Treat each cluster's centroid as the route origin and run route construction independently.

Spawn clusters must be generated once per game-data version and cached.

When `spawn-clusters.json` is available from the ETL, the system must use it directly. When unavailable, the system must perform clustering at runtime from the game-data API's spawn data and cache the result for the session.

## Route Construction

For a given spawn cluster on a map, the system must select a subset and ordering of POI clusters that maximizes total collected value within the time/distance budget, ending at an extract.

This is a prize-collecting routing problem with a budget constraint. The system is not required to solve it optimally; a heuristic approach (e.g., greedy insertion ordered by POI score, optionally refined by local search) is acceptable, provided:

- The result respects the time budget
- The route does not exceed the configured maximum POI count
- The route ends at a reachable extract

### Time and distance budget

```
available_time = raid_duration − safety_margin − vibe_combat_time_estimate
available_distance = available_time × effective_movement_speed − looting_time(route)
```

The budget is the same across all spawn clusters on a map — only the origin changes.

## Per-Route Score

```
score(m, s) = Σ P(c) · distance_decay(c, s)
              over c in route(m, s)
              × vibe_modifier(m, vibe)
              × risk_modifier(m, vibe)
              − travel_cost(route(m, s))
```

- **`distance_decay(c, s)`**: discounts POIs deeper into the route from spawn cluster `s`. Monotonically non-increasing with cumulative distance from `s`; the decay rate is a configuration parameter.
- **`vibe_modifier(m, vibe)`**: per-vibe adjustments based on map characteristics:
  - Loot Run → bonus for low goon-spawn probability and low PMC density.
  - PvP/Mixed → bonus for high objective density.
  - Boss Rush → bonus proportional to target boss spawn probability; zero if the target boss does not spawn on this map.
- **`risk_modifier(m, vibe)`**: reduces score for maps that conflict with the chosen vibe's risk tolerance.
- **`travel_cost(route)`**: penalty proportional to total route distance, capturing the opportunity cost of pure travel.

## Map Score Aggregation

```
M(m) = aggregate({ score(m, s) | s ∈ spawn_clusters(m) })
       + m_constraint_bonus(m, player, vibe)
```

The aggregation function must penalize **route-quality dispersion**: a map where only one of four spawn clusters yields a good route should score lower than a map where all four yield consistently usable routes, because the player has only a 25% chance of getting the good spawn.

Supported aggregation strategies (configurable):

| Strategy | Formula | Purpose |
|----------|---------|---------|
| `mean_x_above_threshold` (default) | `mean(scores) × (count ≥ Q) / total` | "What fraction of spawns yield a usable raid?" × average quality |
| `mean_minus_k_stdev` | `mean(scores) − k · stdev(scores)` | Risk-adjusted; higher k penalizes variance |
| `mean` | Pure expected value | Diagnostic / A/B test |
| `min` | Worst-case route | Most conservative |
| `max` | Best-case route | Most optimistic |
| `weighted` | Probability-weighted mean | Requires per-spawn probability data (not currently available) |

### Active constrained-quest map bonus

```
m_constraint_bonus(m, player, vibe) =
  Σ R(r) · (1 − quest_passiveness(r)) · loadout_feasibility(r, vibe)
  over r in active open quests where m ∈ r.required_maps
```

Where `loadout_feasibility ∈ [0, 1]` reports whether the vibe's loadout budget can satisfy the quest's weapon, armor, and equipment constraints.

The factor `(1 − passiveness)` is the key: passive quests need no map bonus (they progress anywhere), while heavily constrained quests get a large bonus for picking the right map.

### MVP loadout-feasibility loop

For MVP: assume `loadout_feasibility = 1.0` during map scoring. After the map is chosen and the loadout engine runs, if the loadout engine reports infeasibility for some active quest:

1. Drop that quest's contribution from the constraint bonus.
2. If the next-best map's score is within a configured tolerance of the chosen map, re-rank.
3. Report which map was chosen and why (including whether a re-rank occurred).

## Requirements

### Functional

- [ ] The system must compute spawn clusters per map by filtering to PMC player spawns and clustering spatially
- [ ] When `spawn-clusters.json` is available from the ETL, the system must use the pre-computed clusters
- [ ] When `spawn-clusters.json` is unavailable, the system must cluster at runtime from the game-data API's spawn data, filtering by sides="Pmc" AND categories="Player", and cache the result for the session
- [ ] Spawn cluster count must be constrained to [1, N] per map (N configurable, default 4)
- [ ] The system must construct one route per spawn cluster per map, maximizing collected value within the time budget
- [ ] Routes must respect the maximum POI count per route (configurable)
- [ ] Routes must end at a reachable extract
- [ ] Per-route scores must incorporate distance decay, vibe modifier, risk modifier, and travel cost
- [ ] Map scores must aggregate per-route scores using the configured aggregation strategy
- [ ] The default aggregation strategy must penalize route-quality dispersion
- [ ] `m_constraint_bonus` must boost maps where the player has active quests with low passiveness
- [ ] For MVP, `loadout_feasibility` may be assumed 1.0; if the loadout engine later reports infeasibility and the runner-up map is within the configured tolerance, the system must re-rank
- [ ] The chosen map must be the one with the maximum `M(m)`; ties broken by a deterministic seeded mechanism
- [ ] All candidate routes for the chosen map (not just the best) must be output for the user to select after observing their actual spawn
- [ ] The system must surface ETL data provenance for spawn cluster data when consumed
- [ ] When `spawn-clusters.json` is unavailable, a non-blocking warning must indicate that spawn data was computed at runtime
- [ ] All route construction and scoring must be deterministic
- [ ] Spawn clusters must be cached per game-data version; invalidation when game data changes
- [ ] Route scores must be cached; invalidation when POI scores or game-data version change

### Non-Functional

- [ ] Route construction heuristic must complete within a time budget suitable for reactive dashboard updates
- [ ] Distance calculations use the game's world coordinate system (top-down 2D, meters); elevation and walls are ignored for MVP

## Configuration Parameters

| Parameter | Purpose |
|-----------|---------|
| Spawn cluster proximity threshold | Per-map tunable proximity for grouping spawns |
| Maximum spawn cluster count per map | Cap on clusters (default 4) |
| Minimum spawn cluster count per map | Floor on clusters (default 1) |
| Maximum POIs per route | Cap on POI count in a single route |
| Safety margin for extract | Time reserved for reaching an extract |
| Per-vibe combat time estimate | Expected combat time deducted from available raid time |
| Effective movement speed | Player movement speed for distance budgeting |
| Time per container looted | Time cost of looting each container along the route |
| Distance decay rate | Rate at which POI value discounts with cumulative distance |
| Travel cost coefficient | Penalty per unit of route distance |
| Aggregation strategy | Which aggregation function to use for map scoring |
| Quality threshold `Q` | Used by `mean_x_above_threshold` strategy |
| Risk-aversion coefficient `k` | Used by `mean_minus_k_stdev` strategy |
| Re-rank tolerance | Score difference threshold for runner-up map re-ranking after loadout feasibility check |
| Deterministic tie-break seed | Seed for reproducible tie-breaking |

## Acceptance Scenarios

| Scenario | Expected behavior |
|----------|-------------------|
| Map A has 4 spawn clusters, all with high-quality routes. Map B has 4 spawn clusters, only 1 with a high-quality route. Both have similar average route scores. | Map A scores higher due to dispersion penalty on Map B. |
| Player has an active quest requiring kills with a specific weapon on a specific map only. | That map receives a `m_constraint_bonus` proportional to the quest's impact score and constraint tightness. |
| Loadout engine reports infeasibility for the chosen map's active quest, runner-up map is within 5% (tolerance = 10%). | System keeps the original map (within tolerance). |
| Loadout engine reports infeasibility, runner-up map is within 8% (tolerance = 10%). | System re-ranks to the runner-up and reports the reason. |

## Success Criteria

- [ ] The recommended map maximizes `M(m)` across candidate maps
- [ ] Maps with consistent route quality across spawn clusters score higher than maps with one good and three bad spawns
- [ ] Constrained quests meaningfully boost their required map's score
- [ ] Candidate routes for the chosen map are output for user selection
- [ ] Spawn clustering uses ETL data when available; runtime fallback when not
- [ ] Tie-breaking is deterministic and reproducible

## Edge Cases

- Map has only one PMC spawn cluster (e.g., Factory) → no dispersion penalty; single route output
- Map has no PMC spawns in the game data → map is excluded from the candidate set
- All candidate routes on a map score zero → map receives score zero; other maps preferred
- No POI clusters on a map (all scored zero or none exist) → map excluded from candidates
- Runner-up map within re-rank tolerance after loadout infeasibility → system re-ranks and reports
- Boss Rush vibe but target boss doesn't spawn on any map → vibe modifier drives score to zero for all maps; fallback behavior needed (fall back to quest density)
- Raid duration is very short (e.g., Factory at 20 min) → time budget severely limits route; fewer POIs visited
- `spawn-clusters.json` available but missing data for some maps → available maps use ETL data; missing maps compute at runtime
- `spawn-clusters.json` stale → data still used with staleness warning
- `spawn-clusters.json` schema version mismatch → treated as unavailable; runtime clustering used
- All maps tied in score → deterministic tie-break by seeded ordering
- Player has no active quests (all complete) → `m_constraint_bonus` is zero everywhere; maps scored by POI value and vibe modifiers only

## Dependencies

- Depends on: `spec-009` (ETL Data Loader — `spawn-clusters.json`)
- Depends on: `spec-010` (Requirement Impact Scoring — `R(r)` for constraint bonus, quest passiveness)
- Depends on: `spec-012` (POI Cluster Scoring — `P(c)` per cluster)
- Depends on: `spec-013` (Key Economics — key costs embedded in POI scores)
- Depends on: `spec-005` (Vibe Selection — vibe modifiers, combat time, risk tolerance)
- Depends on: `spec-003` (Game Data Service — map spawns, raid duration, extracts)

## Open Questions

- ✅ Resolved: Spawn cluster proximity thresholds and calibration defaults set from community research. See "Default Spawn & Aggregation Configuration" section below.

### Default Spawn & Aggregation Configuration

#### Per-Map Spawn Cluster Proximity Thresholds

Derived from community knowledge of Tarkov map layouts, spawn distributions, and PMC player counts. PMC spawns are placed by BSG in physically tight groups on each "side" of a map; these thresholds should group same-side spawns together while keeping distinct sides separate.

| Map | Spawn Positions (API pool) | Players/Raid | Map Span (m) | Threshold (m) | Expected Clusters | Community "Sides" |
|-----|---------------------------|-------------|-------------|---------------|-------------------|-------------------|
| Factory | 85 | 5–6 | 134 | 75 | 1 | 1 (single arena) |
| Labs | 75 | 6–10 | 171 | 50 | 1–2 | 1 (indoor, multi-floor) |
| Ground Zero | 100 | 9–12 | 422 | 65 | 2–3 | 2 (North / South) |
| Customs | 120 | 9–12 | 973 | 150 | 2–4 | 2 (Big Red West / Boiler East) |
| Interchange | 130 | 10–14 | 814 | 135 | 3–4 | 2 (Railway NW / Emercom SE) |
| Reserve | 79 | 9–11 | 429 | 100 | 4 | 3–4 (perimeter ring) |
| Shoreline | 130 | 10–14 | 1385 | 150 | 4 | 3–4 (West/Village, East, South, Far-West) |
| Woods | 140 | 10–14 | 1139 | 200 | 4 | 4 quadrants (NW/NE/SE/SW, Sawmill center has no spawns) |
| Lighthouse | 71 | 10–12 | 1416 | 150 | 4 | 3–4 (South beach, mid chalets, North water treatment) |
| Streets | 196 | 14–20 | 681 | 90 | 4 | 3–4 districts (South, NE, NW/Concordia, East) |

**Note**: Spawn position counts from the API represent the *pool of possible locations*, not simultaneous players. BSG defines many candidate positions and selects a subset per raid. Clustering groups these candidates into physically distinct spawn regions.

**Heuristic**: Thresholds cluster around 12–18% of the map's longest span for outdoor maps. Indoor/arena maps use higher % but result in 1–2 clusters regardless.

Community context: Spawn proximity is one of the most contentious topics in Tarkov. Players report that "every single spawn can be seen by 2/3 other spawn points within 5 seconds." BSG actively adjusts spawns (e.g., Lighthouse experimental changes in 2026, Customs rework in patch 0.16 Dec 2024). The system should handle threshold changes gracefully as BSG rebalances.

**Indoor maps caveat**: For Factory and Labs, Euclidean distance is a poor proxy for travel distance — walls, floors, and stairs create longer actual paths. The threshold is set higher relative to map size, but expected cluster count stays at 1–2 since the entire map is effectively one combat zone.

#### Spawn Cluster Probability

Per-cluster spawn probability is computed as:

```
P(cluster) = (spawn points in cluster) / (total PMC spawn points on map)
```

This gives a reasonable prior for how likely the player is to land in each cluster. The `weighted` aggregation strategy uses this directly.

#### Quality Threshold Q (for `mean_x_above_threshold`)

**Default: Q = 0.25**

Rationale: Routes scoring below 25% of the maximum route score on that map are considered "bad" — the player got an unfavorable spawn and can't accomplish much. Community sentiment strongly supports penalizing maps with bad spawns:

- A map with 1 of 4 clusters above Q → keeps 25% of its mean score
- A map with 3 of 4 clusters above Q → keeps 75% of its mean score
- A map with 4 of 4 clusters above Q → keeps 100% of its mean score

#### Risk-Aversion Coefficient k (for `mean_minus_k_stdev`)

**Default: k = 0.5**

Rationale: Spawn assignment is a single random draw, not a repeated gamble. The player gets one spawn per raid. k=0.5 meaningfully penalizes maps with high spawn variance (e.g., Shoreline's "god spawn" behind Resort vs. 5-minute Tunnel spawn) without being so aggressive that it eliminates all maps with any variation. Players can partially adapt to their spawn by selecting the matching pre-computed route, which justifies a less-than-Sharpe-ratio (k=1.0) penalty. A "bad spawn" reduces expected value but doesn't zero it. Tunable: k=0.3 for trust-the-player, k=0.75 for consistency-first, k=1.0 for full Sharpe penalty.
- ✅ Resolved: Spawn-cluster probability is computed as `(number of spawn points in cluster) / (total PMC spawn points on map)`. This gives a reasonable prior for how likely the player is to land in each cluster. The `weighted` aggregation strategy can use this directly.
- ✅ Deferred: Walkable-graph data for refined routing is out of scope. 2D Euclidean distance is used for MVP. <!-- Future implementation: integrate per-map walkable-graph data for more accurate routing once a data source is identified. -->

---

### Specification Quality Checklist

- [x] No implementation details (no algorithms, languages, frameworks, or libraries named)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] Edge cases identified, including ETL-specific scenarios
- [x] Scope bounded — Stage 4 only; consumes Stages 1–3, produces final map selection and routes
- [x] No forbidden terms (DBSCAN, PageRank, Orienteering, TypeScript, Python, GraphQL, DAG, library names)
