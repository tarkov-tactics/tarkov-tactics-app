# Feature Spec: Key Economics Module

> Status: `draft`
> Priority: `P0`
> Feature: `ranking`

## Overview

The Key Economics Module models keys as purchasable consumables with an amortized per-raid cost, eliminating the need for the player to manually maintain a key inventory. It computes the effective acquisition cost for each key across all available purchase paths, amortizes that cost over expected usage, and integrates the result into POI scoring. When a key is unobtainable (no purchase path available at the player's current progression), the module splits affected POI clusters into accessible and locked sub-clusters so the player is neither penalized for inaccessible loot nor sent to doors they can't open.

## User Stories

- As a Tarkov player, I want key costs factored into POI recommendations so that "lucrative" rooms behind expensive keys show their true net value.
- As a Tarkov player, I want to see the key cost breakdown so I know how much of my raid budget goes to key amortization.
- As a Tarkov player, I want locked areas behind keys I can't obtain to be clearly marked rather than silently penalizing my route score.
- As a Tarkov player, I want the app to infer which keys I own from completed quests that reward those keys.

## Data Requirements

### From TarkovTracker (Player State)

- Player PMC level — affects flea-market access for keys with level requirements
- Trader loyalty levels — affects which trader-sold keys are available
- Completed quests — used to infer ownership of quest-reward keys

### From tarkov.dev (Game Data)

- Key item definitions — flea tradability flag, flea-market level requirement, durability (use count)
- Trader purchase paths per key — price and loyalty-level requirement per trader
- Flea-market price per key
- Map lock definitions — which locked doors exist, which keys open them, door positions

### From ETL Pipeline (Pre-Computed Data)

- None directly.

### Computed/Derived

- **Effective key cost** — minimum price across all available purchase paths for each key
- **Per-raid amortized cost** — effective cost divided by expected usage (use count or amortization horizon)
- **Key availability status** — `obtainable` (at least one purchase path exists) or `unobtainable` (no path available at current progression)
- **Quest-inferred key ownership** — keys assumed held based on completed quest rewards
- **Degraded sub-clusters** — when a cluster contains containers behind an unobtainable key, the cluster is split into accessible and locked portions

## Key Cost Computation

### Effective acquisition cost

For a key `k` and a player state, the effective cost is the **minimum** price across all _available_ purchase paths:

- **Flea-market path**: available if (a) the key is flea-tradeable AND (b) the player's PMC level meets the key's flea-market level requirement.
- **Trader path**: available if the player's loyalty level at that trader meets the required level for that purchase.
- **No available path**: the key cost is _unobtainable_ (treated as infinite in scoring).

### Per-raid amortization

- For keys with a finite use count: `effective_cost / use_count`.
- For keys with effectively infinite uses: `effective_cost / AMORT_DEFAULT`, where `AMORT_DEFAULT` is a configuration parameter representing the amortization horizon in raids.

Keys are stored in the Secure Container and survive player death. The amortization horizon reflects opportunity cost and time-to-value, not literal loss risk.

### Quest-locked keys

Some keys have no purchase path and are only obtainable as quest rewards. For these:

- If the quest that rewards the key is marked complete → assume the player holds the key (cost = 0).
- If the quest is not complete → key is unobtainable (unless another purchase path exists).

This inference is imperfect (the player may have lost the key after acquiring it) but acceptable for MVP.

### Degraded sub-clusters

When a POI cluster contains containers behind a lock whose key is unobtainable for the current player:

- Split into an **accessible sub-cluster** (containers reachable without the unobtainable lock) — used for scoring.
- And a **locked sub-cluster** (containers behind the unobtainable lock) — excluded from scoring and surfaced in the user interface as "locked area: key unobtainable."

The player must not be penalized in scoring for inaccessible loot they were never going to reach.

### Loadout integration

The amortized key cost for the chosen route's POIs must be added to the loadout total cost line item. The user must be able to see the breakdown so the rouble math is honest: a "lucrative" run where the key amortization eats half the expected return must be visible.

## Requirements

### Functional

- [ ] For each key that gates access to any POI cluster, the system must compute the effective acquisition cost as the minimum across all available purchase paths
- [ ] Flea-market path availability must be gated by the key's tradability flag AND the player's level meeting the flea-market level requirement
- [ ] Trader path availability must be gated by the player's trader loyalty level meeting the required level for that purchase
- [ ] When no purchase path is available, the key must be classified as unobtainable
- [ ] Per-raid amortized cost must divide the effective cost by the key's use count (finite) or by a configurable amortization horizon (infinite-use keys)
- [ ] Quest-reward keys must infer ownership from quest completion status: complete → owned (cost = 0); incomplete → unobtainable via that path (may still be obtainable via other paths)
- [ ] When a cluster contains containers behind an unobtainable key, the system must split it into accessible and locked sub-clusters
- [ ] The accessible sub-cluster must be scored normally; the locked sub-cluster must be excluded from scoring
- [ ] The locked sub-cluster must be surfaced in the user interface as "locked area: key unobtainable"
- [ ] The amortized key cost for the chosen route's POIs must be included in the loadout total cost line item
- [ ] The cost breakdown must be visible to the user so they can see how key costs affect the route's net value
- [ ] All computations must be deterministic

### Non-Functional

- [ ] Key cost computation must be efficient across all maps (hundreds of locked doors across all maps)
- [ ] Key economics data must be cacheable; invalidation when player level or trader loyalty changes

## Configuration Parameters

| Parameter | Purpose |
|-----------|---------|
| `λ_K` | Weight of key cost deduction in the POI score formula |
| Key amortization horizon (`AMORT_DEFAULT`) | Number of raids over which infinite-use key cost is spread |

## Acceptance Scenarios

| Scenario | Expected behavior |
|----------|-------------------|
| Player has flea access and a key costs 500K₽ with 25 uses | Amortized cost = 500K / 25 = 20K₽ per raid |
| Player lacks flea access, key is only available via flea | Key is unobtainable; containers behind it form a locked sub-cluster |
| Key is only obtainable as a quest reward, quest is complete | Key is inferred as owned; cost = 0 |
| Key is only obtainable as a quest reward, quest is incomplete | Key is unobtainable; locked sub-cluster |
| A "lucrative" room costs 2M₽ key amortized to 100K₽/raid, expected loot is 150K₽ | Net POI value reflects the 100K₽ deduction; key cost visibly reduces the room's attractiveness |

## Success Criteria

- [ ] POI scores reflect key costs — rooms behind expensive keys show lower net value than equivalent unlocked rooms
- [ ] Unobtainable keys produce locked sub-clusters, not scoring penalties on the player
- [ ] Quest-reward key ownership is correctly inferred from player progression data
- [ ] Key cost breakdown is visible in the loadout/route cost summary

## Edge Cases

- Key has zero durability data (missing field) → treat as infinite-use; apply amortization horizon
- Key is both flea-tradeable and available from a trader → minimum of the two prices is used
- Player can buy from trader at a lower price than flea → trader price is used
- Player level is exactly at the flea-market level requirement → flea path is available
- Quest that rewards a key is failed (not just incomplete) → key is treated as unobtainable via that quest path (may still be obtainable via other paths)
- Multiple keys open the same door (key variants) → minimum cost across variants
- A cluster has containers behind two different locks (nested key requirements) → both keys must be considered; if either is unobtainable, the containers behind it are locked
- All containers in a cluster are behind unobtainable locks → entire cluster becomes a locked sub-cluster with zero score; surfaced as "fully locked" in the UI
- No locked doors on a map → key economics contributes zero cost to all clusters; module is a no-op for that map
- Key price is zero (free quest reward, already owned) → no cost deduction

## Dependencies

- Depends on: `spec-003` (Game Data Service — key items, trader data, lock definitions)
- Depends on: `spec-002` (TarkovTracker Connection — player level, trader loyalty, quest completion)
- Consumed by: `spec-012` (POI Cluster Scoring — `key_cost_amortized` in `P(c)`)
- Consumed by: `spec-015` (Ranking-to-Loadout Interface — key cost in loadout total)

## Open Questions

- ✅ Resolved: Keys not represented in the game-data API are ignored — they are omitted from scoring entirely. The system only scores keys it has data for. Missing keys will be picked up automatically when the game-data API is updated.

---

### Specification Quality Checklist

- [x] No implementation details (no algorithms, languages, frameworks, or libraries named)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] Edge cases identified
- [x] Scope bounded — key cost computation and cluster splitting only; consumed by spec-012 and spec-015
- [x] No forbidden terms (DBSCAN, PageRank, Orienteering, TypeScript, Python, GraphQL, DAG, library names)
