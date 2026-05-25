# Feature Spec: Ranking-to-Loadout Interface Contract

> Status: `draft`
> Priority: `P0`
> Feature: `ranking`

## Overview

The Ranking-to-Loadout Interface Contract defines the structured payload that the ranking pipeline emits as its final output. This payload is consumed by the loadout engine (separate future spec), the dashboard UI, and optionally by a language-model narrative layer. It contains the chosen map, all candidate routes per spawn cluster, the item watchlist, active quest constraints with their priorities, and per-score reason structures for explainability.

This spec intentionally does not specify the loadout engine's internal design (how it selects specific gear). It defines the boundary: ranking owns _what to satisfy_ (constraints + priorities); loadout owns _how to satisfy_ (gear selection within budget). The interface is thin by design.

## User Stories

- As a Tarkov player, I want to see all candidate routes for my recommended map so I can pick the right one after I see my spawn in-game.
- As a Tarkov player, I want an item watchlist telling me what to pick up during the raid, regardless of which spawn I get.
- As a Tarkov player, I want to understand _why_ a map was recommended — which scores drove the decision and what the top contributing factors were.
- As a Tarkov player, I want to know when two quests on my recommended map have conflicting loadout requirements (e.g., one needs an M4 platform, another needs an AK platform).

## Data Requirements

### From Upstream Ranking Stages

- Map identifier and score from Stage 4 (spec-014)
- Candidate routes per spawn cluster from Stage 4
- POI cluster scores and metadata from Stage 3 (spec-012)
- Item priority scores from Stage 2 (spec-011)
- Requirement impact scores from Stage 1 (spec-010)
- Quest passiveness scores from Stage 1

### Computed/Derived

The ranking output payload containing all fields specified below.

## Output Payload Structure

### Map Selection

- **Map identifier** of the chosen map
- **Map score** `M(m)` with reason structure

### Candidate Routes

One per spawn cluster of the chosen map. Each route includes:

- Spawn cluster identifier
- Spawn centroid position (for the user's "which spawn am I at?" decision)
- Ordered POI list, each POI with:
  - Human-readable name
  - Accessibility requirements (keys needed, with cost and availability status)
  - Constituent quest objectives (with parent quest name and impact score)
  - Constituent containers (with expected loot summary)
  - POI score `P(c)` with reason structure
- Route score
- Routes in a stable order (e.g., by spawn cluster identifier) for deterministic rendering

### Item Watchlist

- Derived from items most likely to appear across the candidate routes' POIs
- Ordered by `I(i)`
- Map-level, not per-route (items to watch for regardless of spawn)
- Each item includes:
  - Item identifier and name
  - Priority score `I(i)` with contributing requirements
  - Found-in-Raid flag per relevant requirement
  - Expected locations (which POIs on this map may contain it)

### Active Quest Constraints

For each active open quest applicable to the chosen map:

- Quest identifier and name
- Priority `R(r)`
- Passiveness score
- All constraint axes (map, zone, body part, weapon class, weapon item, mods required, wearing required, not wearing, distance, time of day, shot type, health state, required keys)
- These constraints are map-level (independent of spawn)

The loadout engine treats the constraint payload as a constraint satisfaction problem with priorities: it must maximize the sum of `R(r)` across satisfied quests, subject to the vibe budget.

### Reason Structures (Explainability)

Every score surfaced in the user interface must be accompanied by a reason structure containing:

- The final score value
- The list of components that contributed, each with its raw value and applied weight
- A ranked list of top contributing requirements or items

This must be accessible via a "Why this score?" affordance in the user interface.

## Quest Constraint Conflict Resolution

When two or more active quests on the chosen map have conflicting loadout requirements (e.g., one quest requires an M4 platform, another requires an AK platform):

- Conflicts must be resolved by priority: the higher-`R(r)` quest's constraints take precedence.
- The lower-`R(r)` quest contributes zero to that raid's progress.
- Conflicts must be surfaced to the user as part of the dashboard reasoning, naming both quests and explaining the resolution.

## LLM Integration Point

When a language-model integration is configured:

- The system may generate a prose "Why this map?" narrative from the structured scoring inputs. The narrative is cacheable by an inputs hash.
- The system may generate per-POI "tour-guide" notes bundled with the narrative.
- When LLM access is not configured or fails at runtime, the deterministic fallback is: render the reason structure directly as component values, weights, and top contributors as labeled rows. No prose wrapper.

The system must transparently use the deterministic fallback when LLM access fails, with a single inline indicator that fallback was used. The failure must not surface as a hard error.

### LLM Configuration

The system must expose configuration for:

- Whether LLM access is enabled
- The model provider and endpoint (if enabled)
- Per-capability toggles (narrative, tour-guide notes, cluster naming, tie-breaking)
- Per-capability model selection
- Cache key strategy

## User Route Selection After Spawn

The user interface must allow the player to:

- View all candidate routes for the chosen map before the raid starts
- Select the route matching their actual spawn after the raid begins

The selection mechanism (manual choice from a list, or automatic detection if spawn position can be inferred from a game client integration) is a user-interface concern outside this spec's scope.

## Requirements

### Functional

- [ ] The output must include the chosen map identifier and its score with reason structure
- [ ] The output must include all candidate routes for the chosen map, one per spawn cluster, in a stable deterministic order
- [ ] Each route must include the spawn centroid position, ordered POIs with full metadata (name, keys, objectives, containers, score), and the route score
- [ ] The item watchlist must be map-level (not per-route) and ordered by item priority score
- [ ] Each watchlist item must include the FIR flag per relevant requirement and expected locations on the chosen map
- [ ] Active quest constraints for the chosen map must be output with all constraint axes and the quest's priority and passiveness scores
- [ ] Conflicting quest constraints must be resolved by priority: higher-`R(r)` quest's constraints take precedence; lower-`R(r)` quest contributes zero
- [ ] Quest constraint conflicts must be surfaced in the output so the dashboard can display them to the user
- [ ] Every score in the output must include a reason structure with component breakdown and top contributors
- [ ] The loadout engine must be able to consume the constraint payload as a constraint satisfaction problem with priorities
- [ ] The output must be cacheable; cache key must include game-data version, player state, goal, vibe, and configuration
- [ ] The output must be deterministic for identical inputs
- [ ] When LLM access is configured, the system may generate narrative and tour-guide notes; when not configured or on failure, the deterministic fallback must be used transparently
- [ ] LLM failures must not surface as hard errors; a single inline indicator of fallback usage is acceptable

### Non-Functional

- [ ] Reason structures must be compact enough for inline display in the dashboard
- [ ] The payload must support potential future persistence or sharing

## Configuration Parameters

| Parameter | Purpose |
|-----------|---------|
| LLM access enable/disable flag | Whether language-model features are active |
| Model provider and endpoint | Where to send LLM requests (when enabled) |
| Per-capability enable flags | Toggle narrative, tour-guide, cluster naming, tie-breaking independently |
| Model selection per capability | Different models may be used for different LLM capabilities |
| Cache key strategy | How to hash scoring inputs for narrative caching |

## Success Criteria

- [ ] The output payload contains all required fields: map, routes, watchlist, constraints, reason structures
- [ ] Routes are in stable order and the user can identify which route matches their actual spawn
- [ ] Quest constraint conflicts are detected and surfaced with clear explanation
- [ ] Reason structures explain every surfaced score with component breakdowns
- [ ] The loadout engine can consume the constraint payload without knowledge of ranking internals
- [ ] The output is deterministic for identical inputs

## Edge Cases

- Map has only one spawn cluster → single route in the output
- No items in the watchlist (all items scored zero) → empty watchlist; dashboard shows empty state
- No active quests on the chosen map → empty constraint payload; loadout has no quest-driven constraints
- Two active quests with conflicting weapon requirements → higher-`R` quest wins; conflict surfaced with both quests named and the resolution explained
- Three or more quests with mutual conflicts → resolved pairwise by priority; in the worst case, only the highest-`R` quest's constraints are satisfied
- Loadout engine does not exist yet → constraint payload is still emitted; dashboard renders constraints without loadout resolution
- LLM narrative generation fails → deterministic fallback used; inline "fallback" indicator shown
- All reason structures contain zero contributors (e.g., uniform scoring) → reason structure still emitted with "no dominant contributor" indication
- Runner-up map within tolerance triggered a re-rank (from spec-014) → the output must reflect the re-ranked map, with the reason structure explaining the re-rank

## Dependencies

- Depends on: `spec-014` (Map Scoring — map selection and routes)
- Depends on: `spec-012` (POI Cluster Scoring — POI metadata)
- Depends on: `spec-011` (Item Priority Scoring — watchlist)
- Depends on: `spec-010` (Requirement Impact Scoring — quest constraints and passiveness)
- Consumed by: `spec-006` (Dashboard — renders the output)
- Consumed by: future loadout engine spec (consumes constraint payload)

## Open Questions

- ✅ Resolved: The loadout engine will be a separate module with its own specification. This spec defines only the interface contract between ranking and loadout.
- [NEEDS CLARIFICATION] Conflict-handling UX for active quests with hard-conflicting weapon requirements (spec-context §11). See "Suggested Conflict UX" section below for a proposed approach pending approval.
- [NEEDS CLARIFICATION] Route-to-spawn matching UX (spec-context §11.1). See "Suggested Route Selection UX" section below for a proposed approach pending approval.

### Suggested Conflict UX

When two or more active quests on the chosen map have conflicting loadout requirements, the dashboard should present this using the TTI design language:

- **In the Active Quest Constraints area** of the dashboard, the winning (higher-`R`) quest renders normally with its constraint pills in standard styling.
- **The deprioritized quest** renders in a muted/dimmed card with an **amber "CONFLICT" status pill badge** (`rounded-full`, `bg-amber/10`, `border border-amber/20`, mono text).
- Below the deprioritized quest name, a single telemetry-label line reads: `DEFERRED — CONFLICTS WITH {winning quest name}`.
- A "Why?" affordance (small info icon or expandable row) reveals the reason structure: "This quest requires {weapon A}; {winning quest} requires {weapon B} and has higher priority ({R score}). Only one weapon platform can be equipped per raid."
- The deprioritized quest is **not hidden** — hiding it would confuse the player who knows they have that quest active. Instead, the visual treatment makes the trade-off transparent.

### Suggested Route Selection UX

After the ranking system outputs candidate routes (one per spawn cluster), the user needs to select which route matches their actual in-game spawn. The recommended approach uses existing TTI patterns:

- **Pre-raid state**: the dashboard shows all candidate routes as a **horizontally scrollable set of compact tactical cards** below the Map Recommendation card. Each card shows:
  - A telemetry label: `SPAWN AREA {N}` (or the named POI label from the spawn cluster, e.g., "OLD GAS SIDE", "BIG RED SIDE").
  - The route score as a mono value.
  - The first 2–3 POI names in the route as a condensed list.
  - A `SELECT` outline button.
- **Default**: the highest-scoring route is pre-selected (highlighted with `border-primary`). The dashboard's POI list, watchlist, and loadout reflect this route.
- **After spawn**: the player taps the card matching their observed spawn. The dashboard updates the POI list ordering, route path, and key requirements to reflect the selected route. The watchlist (map-level) does not change.
- **Mobile**: the route cards stack vertically in a single column above the POI list.
- This uses the existing `LabeledSelector` or tactical-card pattern from the TTI design system — no new component patterns required.

---

### Specification Quality Checklist

- [x] No implementation details (no algorithms, languages, frameworks, or libraries named)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable and technology-agnostic
- [x] Edge cases identified
- [x] Scope bounded — defines the interface contract only; does not specify loadout engine internals
- [x] No forbidden terms (DBSCAN, PageRank, Orienteering, TypeScript, Python, GraphQL, DAG, library names)
