# Feature Spec: Requirement Impact Scoring

> Status: `draft`
> Priority: `P0`
> Feature: `ranking`

## Overview

Requirement Impact Scoring implements the first two stages of the ranking pipeline: computing the set of open requirements for the active goal (Stage 0) and scoring each open requirement by its importance to advancing that goal (Stage 1). It produces a scalar impact score `R(r) ∈ [0, 1]` for every open requirement, reflecting how much completing that requirement advances the player toward their selected goal.

The scoring combines five weighted components — direct goal contribution, downstream unlock value (gating), passive-quest acceleration potential, bottleneck criticality, and trader-level pressure — modulated by availability dampening and key-accessibility penalties. The passive-quest component uses per-objective constraint analysis to quantify how much a quest can progress in the background without dedicated effort, consuming enriched constraint data from the ETL pipeline when available.

This feature's output is the primary input to Item Priority Scoring (spec-011) and feeds indirectly into all downstream stages.

## User Stories

- As a Tarkov player, I want the app to know which of my open requirements matter most for my active goal so that it prioritizes the right quests and items.
- As a Tarkov player, I want requirements that unlock many downstream quests to score higher, because completing them accelerates my overall progress.
- As a Tarkov player, I want quests that progress passively (kill objectives I'll complete naturally) to boost the priority of their prerequisites, so I unlock them early and benefit from background progress.
- As a Tarkov player, I want requirements blocked by unobtainable keys to score near zero, so the app doesn't send me to places I can't access.
- As a Tarkov player working toward Prestige, I want the app to prioritize quests that give the most XP, because reaching the level requirement is a key bottleneck.
- As a Tarkov player working toward Prestige, I want the app to track hideout module requirements and include the items I need for those modules in my watchlist.

## Prestige Goal — Multi-Axis Requirement Expansion

When the active goal is **Prestige**, the open requirement set must include not just quest completions but all axes of prestige progression:

### Requirement types for Prestige goals

1. **Player level** — The tier's `minPlayerLevel` defines a level target. The system must treat this as an open requirement when the player's level is below the target. Quests that award XP contribute toward this requirement; quests with higher XP rewards should score higher when the level gap is the binding constraint.

2. **Gating quest** — The tier's gating quest ("New Beginning" for P1–P4, or "Collector" for P5–P6) plus its full prerequisite chain must be included as requirements in the unlock graph. For P5–P6, the Collector quest has ~68 prerequisites — the system must resolve this deep dependency chain.

3. **Skill levels** — Strength, Endurance, and Charisma at tier-specific thresholds. Skills progress passively through gameplay. The system should treat unmet skill requirements as open requirements with high passiveness (they progress naturally). When skill levels are far below the threshold, the system may boost quests or activities that accelerate specific skills.

4. **Hideout modules** — Intelligence Center, Rest Space, Nutrition Unit, and Security at tier-specific levels. Each hideout module requires items to construct. The system must:
   - Identify which hideout modules are not yet at the required level.
   - Determine the items needed to build those modules (from hideout station data).
   - Include those item needs as requirements that flow into Item Priority Scoring (spec-011), so they appear in the watchlist.

5. **Roubles** — 10M–20M depending on tier. The system should treat this as a soft requirement that influences the vibe-modulated intrinsic value weight (`λ_V`) — when the player needs roubles for prestige, loot value becomes more important even outside Loot Run vibe.

6. **Figurines** — Every "New Beginning" quest requires 10 specific figurines (found-in-raid for P2+). These are specific item requirements that should appear in the item watchlist and influence POI scoring.

### XP optimization for level requirements

When the player's current level is below the tier's `minPlayerLevel`, the system must apply an **XP reward bonus** to the requirement impact score:

```
xp_bonus(r) = xp_reward(r) / max_xp_reward_in_open_set × level_gap_factor
```

Where:
- `xp_reward(r)` is the XP awarded for completing requirement `r` (from tarkov.dev task data).
- `max_xp_reward_in_open_set` normalizes across the open set.
- `level_gap_factor ∈ [0, 1]` scales with how far the player is from the level target: higher when the gap is large, tapering to zero as the player approaches the target.

This bonus is added to `R(r)` as a sixth component `X(r)` with its own configurable weight `w_X`, active only when the Prestige goal is selected and the player is below the level target. When the player reaches the level target, `w_X` becomes zero and the remaining weights re-normalize.

## Data Requirements

### From TarkovTracker (Player State)

- Task completion status — which tasks are complete, failed, or in progress
- Task objective progress — per-objective completion counts
- Hideout module completion — which modules are built
- Player level — affects availability classification
- PMC faction — affects faction-specific quest filtering
- Trader loyalty levels — affects key accessibility and trader pressure scoring

### From tarkov.dev (Game Data)

- Task definitions — objectives, prerequisites, map restrictions, trader, reward keys
- Hideout station definitions — module requirements, item needs
- Item definitions — key tradability, flea-market level requirements, trader purchase paths
- Task dependency relationships — which tasks unlock which

### From ETL Pipeline (Pre-Computed Data)

- `quest-enhancements.json` — structured constraint extraction per quest objective. When available, provides per-objective constraint axes (map, zone, body part, weapon class, weapon item, mods required, wearing required, not wearing, distance min/max, time of day, shot type, health state, required keys). When unavailable, the system falls back to the game-data API's structured fields (map restriction and objective type only).

### Computed/Derived

- **Open requirement set** — all requirements for the active goal that are not yet satisfied, classified as _available_ (prerequisites met) or _locked_ (prerequisites unmet)
- **Requirement unlock graph** — the directed graph of prerequisite relationships among requirements, with edges from prerequisites to the requirements they unlock
- **Per-requirement impact score** `R(r) ∈ [0, 1]` — a weighted combination of the components below, multiplied by gate factors

## Stage 0 — Open Requirements

Before scoring, the system must compute the open requirement set for the active goal.

A requirement is _open_ if:

- Its status from the player progression tracker is not "satisfied" or "failed", AND
- Its definition is known (defined in static game data or a derived requirement set).

Each open requirement must be classified by availability:

- **Available**: all prerequisites are satisfied. The player can start work on it now.
- **Locked**: at least one prerequisite is open. The player cannot start it yet.

Both available and locked requirements remain in the open set. Locked requirements still propagate value through the unlock graph to their prerequisites in Stage 1.

## Stage 1 — Scoring Components

Each component produces a value in `[0, 1]`. They are combined as:

```
R(r) = (w_D · D(r) + w_G · G(r) + w_B · B(r) + w_T · T(r) + w_P · P_passive(r) + w_X · X(r)) · A(r) · K(r)
```

| Component | Description |
|-----------|-------------|
| `D(r)` — Direct contribution | 1.0 if `r` is itself a top-level requirement of the active goal; 0 otherwise. |
| `G(r)` — Gating value | Measures the goal-relevant value of all requirements reachable from `r` in the unlock direction, with exponential decay by hop distance. After computing for all open requirements, normalized so the maximum equals 1. |
| `B(r)` — Bottleneck factor | Measures whether `r` is on a critical path (no alternative routes exist). `B(r) ∈ [0, 1]` where 1 means `r` is the sole path to some goal-required descendant. For MVP, `w_B` may be zero — `G(r)` captures most of this signal in practice. |
| `T(r)` — Trader-level pressure | Normalized share of remaining trader loyalty levels that `r` advances, weighted by the count of goal-relevant items or quests gated behind those loyalty levels. For MVP, `w_T` may be zero. |
| `P_passive(r)` — Passive-quest unlock value | Measures the passive-progress opportunity `r` unlocks downstream — the background-progress accelerator effect. See "Passive-Quest Scoring" below. |
| `X(r)` — XP reward bonus | Active only when the Prestige goal is selected and the player is below the tier's level target. Normalized XP reward of `r` scaled by the level gap factor. Zero for non-Prestige goals or when the player has reached the level target. See "Prestige Goal" section above. |
| `A(r)` — Availability dampener | 1.0 if `r` is available (prerequisites met); smaller for requirements deeper in the locked portion of the unlock graph. |
| `K(r)` — Key-block penalty | Near zero if `r` is geographically gated by a key the player cannot currently obtain; 1.0 otherwise. |

### Gating Value G(r)

`G(r)` propagates goal-relevant value backward through the unlock graph:

```
G(r) = goal_contribution(r) + DECAY × Σ G(r')
       for each r' unlocked by r (excluding satisfied descendants)
```

Where `DECAY ∈ (0, 1)` is a configuration parameter controlling how quickly value attenuates with graph distance. After computing for all open requirements, `G` must be normalized so the maximum across the open set equals 1.

### Passive-Quest Scoring

#### Per-objective passiveness

Each quest objective has a _base passiveness_ determined by its type, multiplied by _penalty factors_ for each constraint axis that narrows the scenarios in which the objective can progress.

Base passiveness spans a spectrum:

- **High (≈ 1.0)**: objectives that progress during any play (gain experience, accumulate trader rep, reach a player level).
- **Medium (≈ 0.5–0.8)**: kill objectives, skill objectives.
- **Low (≈ 0.3)**: extract-specific objectives.
- **Zero (0.0)**: fully active objectives (found-in-raid item handover, place a marker, use a specific item, build a weapon).

A _constraint multiplier_ in `(0, 1]` is applied for each non-empty constraint field on the objective. The constraint axes the system must recognize:

| Constraint Axis | Example |
|-----------------|---------|
| Map restriction | Objective limited to specific maps |
| Zone restriction | Within a named zone on a map |
| Body-part restriction | Headshots only |
| Weapon restriction (specific item) | Must use a specific weapon |
| Weapon restriction (weapon class) | Must use an SMG |
| Weapon mod requirement | Weapon must have specific modifications |
| Equipment-worn requirement | Must be wearing specific gear |
| Equipment-not-worn requirement | Must NOT be wearing specific gear |
| Distance restriction | Kill from 50m+ |
| Time-of-day restriction | Must be during daytime |
| Shot-type restriction | Must be headshot |
| Health-state restriction | Player or enemy in a specific health state |
| Required-key restriction | Area requires a specific key |

Per-objective passiveness = base value × product of all applicable constraint multipliers.

**All base values and constraint multipliers must be configuration parameters.**

When `quest-enhancements.json` is available from the ETL pipeline, the system uses the full constraint breakdown per objective. When unavailable, the system uses only the structured fields from the game-data API (map restriction and objective type), and objectives with missing constraint data contribute zero to constraint-based scoring, relying on map-level matching only.

#### Per-quest aggregation

A quest's overall passiveness is the **minimum** of its objectives' passiveness values.

Rationale: a quest only completes when all its objectives complete; the least-passive objective is the bottleneck. A quest with one passive objective and one active objective is not half-passive — it is fully gated by the active objective.

#### Propagation to prerequisites

```
P_passive(r) = Σ (quest_passiveness(r') + DECAY · P_passive(r'))
               for each open r' unlocked by r
```

Normalized across the open requirement set after computation.

## Acceptance Scenarios

These scenarios validate the passive-quest scoring. Exact values depend on final configuration; ordering and rough magnitude must hold.

| Quest description | Expected passiveness (approximate) |
|-------------------|-------------------------------------|
| "Kill 5 PMCs in a specific map with a specific weapon platform from 50m+" (four constraint axes active) | Very low (< 0.10) |
| "Kill 5 PMCs as Scav" (no constraints, any map) | High (≈ 0.8) |
| "Reach trader standing 0.20" (passive type, no constraints) | High (≈ 0.9) |
| "Deliver item to trader" (fully active type) | Zero (0.0) |

## Requirements

### Functional

- [ ] The system must compute the open requirement set for the active goal, including all requirements not yet satisfied
- [ ] Each open requirement must be classified as _available_ (all prerequisites satisfied) or _locked_ (at least one prerequisite is open)
- [ ] Both available and locked requirements must remain in the open set — locked requirements propagate value through the unlock graph to their prerequisites
- [ ] The system must construct the unlock graph from task dependency relationships in the game data
- [ ] `R(r)` must be computed as a weighted sum of normalized components `D`, `G`, `B`, `T`, `P_passive`, multiplied by gate factors `A` and `K`
- [ ] Component weights must sum to 1.0 and be drawn from a single configuration source
- [ ] `G(r)` must propagate value backward through the unlock graph with configurable exponential decay, excluding satisfied descendants, and be normalized to [0, 1] across the open set
- [ ] `P_passive(r)` must be computed using per-objective passiveness (base value × constraint multipliers), aggregated per quest as the minimum across objectives, and propagated through the unlock graph
- [ ] When `quest-enhancements.json` is available, the system must use the full constraint breakdown for each objective
- [ ] When `quest-enhancements.json` is unavailable, the system must use only the structured fields from the game-data API; objectives with missing constraint data must contribute zero to constraint-based scoring
- [ ] The system must surface ETL data provenance (version, staleness) for quest enhancement data when it is being consumed
- [ ] `A(r)` must be 1.0 for available requirements and must decrease for deeper-locked requirements
- [ ] `K(r)` must be near zero for requirements geographically gated by unobtainable keys; 1.0 otherwise
- [ ] `B(r)` and `T(r)` may have zero weight for MVP but must be structurally present in the formula
- [ ] When the active goal is Prestige, the open requirement set must include: quest completions (level-gated by the tier's `minPlayerLevel`), the gating quest and its prerequisite chain, unmet hideout module requirements (with their item needs), unmet skill level requirements, and the rouble target
- [ ] Hideout module item requirements for unmet prestige-required modules must flow into Item Priority Scoring (spec-011) so they appear in the watchlist
- [ ] When the Prestige goal is active and the player is below the tier's level target, `X(r)` must apply an XP reward bonus normalized across the open set, scaled by the level gap factor
- [ ] When the player reaches the tier's level target, `w_X` must become zero and the remaining weights re-normalize
- [ ] Figurine item requirements from the gating "New Beginning" quest must be included as item needs (FIR for P2+)
- [ ] All scores must be deterministic — same inputs must produce same outputs
- [ ] The open requirement set and all Stage 1 scores must be cacheable; invalidation must occur when player progress or active goal changes

### Non-Functional

- [ ] Stage 0 and Stage 1 computation must complete within a time budget suitable for reactive UI updates (triggered by goal or progress changes)
- [ ] The unlock graph must be constructible from the game-data API's task dependency data without external dependencies

## Configuration Parameters

| Parameter | Purpose |
|-----------|---------|
| `w_D` | Weight for direct contribution component |
| `w_G` | Weight for gating value component |
| `w_B` | Weight for bottleneck factor (zero for MVP) |
| `w_T` | Weight for trader-level pressure (zero for MVP) |
| `w_P` | Weight for passive-quest unlock value |
| `w_X` | Weight for XP reward bonus (Prestige goal only; zero for other goals). When active, all weights must still sum to 1.0. |
| Unlock graph decay factor (`DECAY`) | Exponential decay rate shared by `G(r)`, `P_passive(r)`, and `A(r)`. Default: **0.7**. |
| Base passiveness per objective type | One value per objective type category (high/medium/low/zero spectrum) |
| Constraint multiplier per axis | One multiplier per constraint axis (13 axes listed above) |

All weights `w_D + w_G + w_B + w_T + w_P + w_X` must sum to 1.0. When `w_X` is non-zero (Prestige goal with level gap), the other weights are proportionally reduced to maintain the sum constraint.

## Success Criteria

- [ ] Every open requirement for the active goal receives a score in [0, 1]
- [ ] Changing the active goal recomputes the open requirement set and all scores
- [ ] Requirements that unlock many downstream goal-relevant requirements score higher via `G(r)` than leaf requirements
- [ ] Passive quests (low constraint count, passive objective types) propagate higher `P_passive` to their prerequisites than constrained quests
- [ ] Acceptance scenarios produce passiveness values with the correct ordering and approximate magnitude
- [ ] Requirements behind unobtainable keys receive near-zero scores
- [ ] The system functions (with degraded constraint accuracy) when quest enhancement ETL data is unavailable

## Edge Cases

- Active goal has zero open requirements (all complete) → scoring produces an empty set; downstream stages handle gracefully
- A requirement has no prerequisites (root node in the unlock graph) → `A(r) = 1.0`, no decay applied
- A requirement unlocks zero downstream requirements (leaf node) → `G(r) = 0` (no gating value); scored by `D`, `P_passive`, and other components only
- Circular dependency in task prerequisites (data error) → the system must detect cycles and break them deterministically (e.g., by dropping the back-edge)
- Quest with zero objectives (data anomaly) → passiveness defaults to zero (conservative)
- Quest with one passive and one active objective → quest passiveness equals the active objective's passiveness (min aggregation), which is zero or very low
- Key is unobtainable for all known purchase paths → `K(r)` near zero; the requirement is effectively deprioritized without being removed
- Player's faction filters out certain quests → those quests are excluded from the open requirement set entirely (not scored as zero)
- `quest-enhancements.json` available but contains objectives not present in the game-data API → enriched objectives are matched by objective ID; unmatched objectives use game-data-only fallback
- `quest-enhancements.json` unavailable → fallback to game-data structured fields; warning surfaced per spec-009
- `quest-enhancements.json` stale (older than configured threshold) → data is still used with staleness warning
- `quest-enhancements.json` schema version mismatch → file treated as unavailable; fallback behavior applies
- Prestige goal with player already at or above the tier's level target → `X(r)` is zero; scoring reverts to standard 5-component formula
- Prestige goal targeting P5/P6 → Collector quest and its ~68 prerequisites are added to the unlock graph; the deep chain exercises `G(r)` extensively
- Prestige goal: hideout module already at required level → that module is removed from the open requirement set; its item needs no longer contribute
- Prestige goal: skill requirement met → that skill is removed from the open requirement set
- Prestige goal: all axes met except the gating quest → scoring focuses entirely on the quest prerequisite chain
- P5/P6 difficulty cliff: the system should not recommend P5 progression strategies to a player who hasn't completed any P4 quests — the open requirement set naturally handles this since Collector's 68 prerequisites will dominate

## Dependencies

- Depends on: `spec-009` (ETL Data Loader — for `quest-enhancements.json`)
- Depends on: `spec-002` (TarkovTracker Connection — player state)
- Depends on: `spec-003` (Game Data Service — task definitions, dependencies)
- Depends on: `spec-004` (Goal Selection — active goal definition)

## Open Questions

- ✅ Resolved: Passiveness base values and constraint multipliers calibrated from community research. See "Default Passiveness Configuration" section below. These values are derived from community sentiment (Tarkov forums, guides, patch discussions) and the tarkov.dev `TaskObjective` type system. They should be treated as a starting point — empirical tuning against the current wipe's quest set is recommended after initial deployment.

### Default Passiveness Configuration

#### Base Passiveness per Objective Type

Mapped to the tarkov.dev `TaskObjective` subtypes. Higher = more passive (progresses naturally during normal play).

| Objective Type | Default | Rationale |
|----------------|---------|-----------|
| `PlayerLevel` | 1.0 | Pure progression — XP accumulates naturally every raid. |
| `TraderLevel` | 0.95 | Nearly automatic through quest completion and purchases. |
| `TraderStanding` | 0.95 | Same as trader level — rep accumulates through normal quest flow. |
| `TaskStatus` | 0.95 | Prerequisite gate — no direct action, just waiting for another quest to complete. |
| `Experience` | 0.90 | XP accrues naturally; `healthEffect` constraint (if present) adds friction. |
| `Shoot` (kill targets) | 0.60 | Base kill-anything objective is fairly natural; constraints reduce this heavily via multipliers. Jaeger's stacked-constraint kill quests are the single most complained-about quest category. |
| `Skill` | 0.60 | Most skills (endurance, strength) level passively through movement. Sniper skill is notoriously grindy — players resort to intentional leveling strategies. |
| `HideoutStation` | 0.40 | Requires resource accumulation, planning, and roubles — no in-raid component but deliberate. |
| `Extract` | 0.30 | Must survive and reach specific exits. "The Guide" (survive all maps consecutively) is considered the hardest quest in the game. |
| `BuildItem` | 0.20 | Gunsmith quests: requires specific parts, modding knowledge, roubles. Community considers them "easy passive XP" if following a guide, but very deliberate. |
| `Item` (non-FIR handover) | 0.20 | Must acquire and hand over specific items; can buy from traders/flea. |
| `Item` (FIR required) | 0.10 | RNG-dependent, must find AND survive. Community's top frustration — "dying with the quest item makes it permanently worthless." |
| `QuestItem` | 0.10 | Must go to a specific location, pick up the quest item, survive and extract. |
| `Mark` | 0.10 | Must bring marker item, navigate to exact spot, place it, survive. |
| `UseItem` | 0.10 | Must use specific item in a specific zone. Similar to mark tasks. |
| `Basic` (catch-all) | 0.10 | Conservative default for unrecognized objective types. |

#### Constraint Multipliers per Axis

Applied multiplicatively when a constraint is active on a `Shoot`-type objective. Values closer to 0.0 mean the constraint makes the quest more active/deliberate.

| Constraint Axis | Default | Rationale |
|-----------------|---------|-----------|
| Map restriction | 0.70 | Forcing a specific map removes flexibility. "Any map" quests are far easier — community notes Customs/Shoreline-locked quests as pain points due to PvP density. |
| Zone restriction | 0.50 | Named zones (Dorms, Resort rooms) force precise positioning within a map. Much more constraining than map alone. |
| Body-part restriction | 0.50 | Headshot requirements are a top complaint. "Shooter Born in Heaven" was so hated BSG removed the distance component. Headshots + bolt-action is one of the hardest combos. |
| Weapon restriction (specific item) | 0.50 | Forces purchase and use of a specific weapon, changing loadout entirely. |
| Weapon class restriction | 0.70 | Less restrictive than a specific weapon since you choose within the class. Bolt-action class is the most complained-about (Tarkov Shooter questline). |
| Weapon mod requirement | 0.80 | Relatively minor — usually requires buying a scope or suppressor. Less impactful than weapon choice. |
| Equipment-worn requirement | 0.50 | Must wear specific gear (Scav Vest, balaclava, UN armor, Ushanka). Community loathes these — Punisher Part 4 and Setup are perennial "worst quest" entries. Forces sub-optimal combat gear. |
| Equipment-not-worn requirement | 0.60 | Must NOT wear certain items. Painful but slightly less constraining since you're removing gear rather than finding/wearing specific items. |
| Distance restriction | 0.40 | The original SBiH (100m+, later 125m+) was SO hated that BSG removed the distance component entirely. Distance constraints are arguably the single most disliked constraint in the game's history. |
| Time-of-day restriction | 0.70 | Night raids (Insomnia: 30 PMC kills at night) are tedious. Lower player counts, worse visibility, but scav detection range is shorter. Moderate impact. |
| Shot-type restriction | 0.60 | Adds precision requirement beyond body-part targeting. |
| Health-state restriction | 0.30 | Must kill while suffering tremors, pain, or debuffs. "Survivalist Path - Cold Blooded" (headshots while tremoring) is universally considered one of the most frustrating quests. Intentionally debuffing yourself is the antithesis of natural gameplay. |
| Required-key restriction | 0.80 | Need a key to access the area. Once obtained, minimal gameplay impact. Expensive/rare keys add economic friction, but key availability is separately handled by K(r). |

#### Constraint Stacking Example

The community specifically calls out that stacking multiple constraints is what makes quests feel "more tedious than fun." The multiplicative model captures this:

| Quest | Active Constraints | Passiveness |
|-------|-------------------|-------------|
| "Kill 5 scavs" (any map, any weapon) | None | 0.60 (base Shoot) |
| "Kill 5 PMCs on Customs" | Map (0.70) | 0.60 × 0.70 = 0.42 |
| "Kill 5 PMCs on Shoreline wearing Scav Vest + balaclava" | Map (0.70) × Equipment (0.50) | 0.60 × 0.70 × 0.50 = 0.21 |
| "Kill 5 PMCs on Lighthouse with M4 from 50m+ headshots" | Map (0.70) × Weapon (0.50) × Distance (0.40) × Body-part (0.50) | 0.60 × 0.70 × 0.50 × 0.40 × 0.50 = 0.042 |
- ✅ Resolved: `A(r)` uses **exponential decay** with the same decay parameter as `G(r)`: `A(r) = DECAY^depth` where `depth` is the minimum number of unsatisfied prerequisites between `r` and the nearest available requirement. Default `DECAY = 0.7`. This means: depth-1 locked → 0.70, depth-2 → 0.49, depth-3 → 0.34, depth-5 → 0.17. Deeply locked requirements are deprioritized but never fully invisible.

---

### Specification Quality Checklist

- [x] No implementation details (no algorithms, languages, frameworks, or libraries named)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] Edge cases identified, including ETL-specific scenarios
- [x] Scope bounded — Stage 0 + Stage 1 only; output consumed by spec-011
- [x] No forbidden terms (DBSCAN, PageRank, Orienteering, TypeScript, Python, GraphQL, DAG, library names)
