# Feature Spec: Item Priority Scoring

> Status: `draft`
> Priority: `P0`
> Feature: `ranking`

## Overview

Item Priority Scoring rolls up the per-requirement impact scores from Stage 1 into a single priority score `I(i) ∈ [0, 1]` for every item in the game catalog. This tells the player which items matter most for their current progression. The score combines goal-driven need (how much each item contributes to open requirements) with vibe-modulated intrinsic market value (how much each item is worth on the flea market). The output drives the item watchlist on the dashboard and feeds into POI loot-gain scoring in Stage 3.

## User Stories

- As a Tarkov player, I want to know which items I should prioritize picking up during a raid, based on my current quest and hideout needs.
- As a Tarkov player on a Loot Run vibe, I want high-value items to score higher so I can maximize my profit.
- As a Tarkov player, I want items needed Found-in-Raid to be clearly distinguished, since I can't just buy them on the flea market.
- As a Tarkov player, I want to understand that the watchlist reflects quest/hideout requirements and may not account for items already in my stash.

## Data Requirements

### From TarkovTracker (Player State)

- Task objective progress — which items have been turned in, quantities remaining
- Hideout module progress — which modules need which items

### From tarkov.dev (Game Data)

- Item catalog — item ID, name, size (slots), flea-market price, types
- Item flea-market level requirement — minimum player level to buy on flea
- Task objectives — which items each task requires, quantities, Found-in-Raid flag
- Hideout station levels — which items each module requires

### From ETL Pipeline (Pre-Computed Data)

- None directly. This stage consumes Stage 1 output (`R(r)`) and game data only.

### Computed/Derived

- **Per-item priority score** `I(i) ∈ [0, 1]` — rolled up from requirement impact scores and intrinsic value
- **Per-item need breakdown** — which requirements drive each item's score, with quantities still needed
- **FIR flag per (requirement, item) link** — whether the item must be Found-in-Raid for that specific requirement

## Scoring Formula

```
I(i) = Σ R(r) · need(r, i)  +  λ_V · V(i)
       over all open requirements r
```

Where:

- `need(r, i)` = units of item `i` still required by requirement `r`, divided by total units required. Zero if `i` does not satisfy `r`.
- `V(i)` = intrinsic flea-market value of `i`, expressed as price-per-slot normalized against the maximum price-per-slot in the current item catalog.
- `λ_V` = vibe-modulated weight: higher for Loot Run (rouble efficiency matters), lower for PvP/Mixed and Boss Rush (goal progress dominates).

After roll-up, `I` must be normalized across the catalog so the maximum equals 1.

## Found-in-Raid Handling

Items required Found-in-Raid (FIR) for a quest cannot be substituted with flea-bought copies. The system must explicitly track the FIR flag per `(requirement, item)` link. For FIR-only links, the player's flea-purchase capacity does not reduce `need`.

## Stash Inventory Blind Spot

Until stash inventory data becomes available from an external source, `need(r, i)` reflects only the items still required by external progression tracking — not items the player has acquired but not yet turned in. The system must:

- Surface this limitation clearly in the user interface (e.g., "Based on quest/hideout requirements — does not account for items already in your stash")
- Be designed so that stash data can be integrated in the future without structural changes to the scoring formula

## Requirements

### Functional

- [ ] The system must compute `I(i)` for every item in the game catalog that is referenced by at least one open requirement or has non-trivial intrinsic value
- [ ] `need(r, i)` must reflect the proportion of the requirement for item `i` that remains unmet
- [ ] For requirements where the item must be Found-in-Raid, the player's flea-market purchase capacity must not reduce `need` — FIR items can only be satisfied by in-raid acquisition
- [ ] `V(i)` must be computed as the item's price-per-slot normalized against the catalog maximum
- [ ] `λ_V` must vary by active vibe and be drawn from configuration
- [ ] After roll-up, `I` must be normalized so the maximum across the catalog equals 1
- [ ] The system must track the FIR flag per `(requirement, item)` link and make it available to downstream consumers (watchlist display, POI scoring)
- [ ] All per-item scores must be cacheable; invalidation must occur when Stage 1 scores or player progress change
- [ ] All scores must be deterministic

### Non-Functional

- [ ] Computation must be efficient across the full item catalog (thousands of items); items with zero need and negligible intrinsic value may be skipped
- [ ] The stash inventory limitation must be surfaced in the user interface so users understand the score's basis

## Configuration Parameters

| Parameter | Purpose |
|-----------|---------|
| `λ_V` (per vibe) | Intrinsic-value weight. Higher = flea value matters more. One value per vibe defined in configuration. |

## Success Criteria

- [ ] Items required by high-impact requirements (high `R(r)`) score higher than items for low-impact requirements
- [ ] On Loot Run vibe, high flea-value items receive a meaningful score boost compared to PvP/Mixed or Boss Rush
- [ ] FIR-flagged items are correctly identified and their need is not reduced by flea purchase capacity
- [ ] The stash blind spot limitation is visible to the user
- [ ] Changing the active vibe updates item scores reactively (via the `λ_V` weight change)

## Edge Cases

- Item required by multiple open requirements → its score is the sum of contributions from all requirements (not just the highest)
- Item has zero flea-market price (untradeable) → `V(i) = 0`; scored by goal need only
- Item has no goal need and low market value → `I(i)` ≈ 0; excluded from watchlist
- Item required Found-in-Raid AND available on flea → FIR flag takes precedence; `need` is not reduced by flea purchase
- Player has already partially turned in items for a quest → `need` reflects remaining quantity only
- No items in the catalog satisfy any open requirement → all items scored by intrinsic value only (watchlist shows high-value loot)
- Item catalog is empty or unavailable (game-data API failure) → item scoring produces an empty result; downstream stages handle gracefully
- Player level below flea-market unlock level → flea prices still used for `V(i)` normalization (the value exists even if the player can't sell yet)

## Dependencies

- Depends on: `spec-010` (Requirement Impact Scoring — `R(r)` scores)
- Depends on: `spec-003` (Game Data Service — item catalog, prices)
- Depends on: `spec-004` (Goal Selection — active goal)
- Depends on: `spec-005` (Vibe Selection — active vibe for `λ_V`)

## Open Questions

- ✅ Acknowledged: Stash inventory integration (spec-context §7.3). No integration path has been identified. The stash blind spot remains an acknowledged limitation — `need(r, i)` does not account for items already in the player's stash. The UI must surface this clearly. Revisit when an external data source becomes available.

---

### Specification Quality Checklist

- [x] No implementation details (no algorithms, languages, frameworks, or libraries named)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] Edge cases identified
- [x] Scope bounded — Stage 2 only; consumes Stage 1, produces scores for Stage 3
- [x] No forbidden terms (DBSCAN, PageRank, Orienteering, TypeScript, Python, GraphQL, DAG, library names)
