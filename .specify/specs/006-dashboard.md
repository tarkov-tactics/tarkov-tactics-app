# Feature Spec: Next Raid Dashboard

> Status: `in-progress` (team indicators + progressive loading pending)
> Priority: `P0`
> Feature: `dashboard`

## Overview
The crown jewel of the app. The Dashboard combines the player's active Goal, current Vibe, and **team progression** with live game data to produce a single, scannable "Next Raid" recommendation. It answers: **where to go, what to bring, where to look, what to grab, what to watch out for, and who benefits**. When team data is available, the recommendation engine boosts maps and tasks where teammates also have open objectives — maximizing squad efficiency. This is a read-only output view — the player consumes the recommendation and heads into raid.

The page adopts the TTI **"INTEL BRIEFING"** layout: a `PageHeader` with the tactical title + inline Vibe + Directive selectors, followed by a **vibe-specific layout shape** (12-column responsive grid or 2-column split) of tactical cards. The same card components are reused across vibes but render in different **density variants** (`hero`, `compact`, plus `kit-detailed` for Loadout) depending on which slot they occupy. Each vibe also contributes one **vibe-specific intel card** (Loot Run → Quick Analysis, PvP/Mixed → Combat Strategy, Boss Rush → Boss Encounter Intel) that sits in its layout. Community-reported **Goon Squad sightings** (from tarkov.dev `goonReports`) surface in the Threat Assessment card with a relative timestamp ("SIGHTED · 2m ago · Customs") when a sighting exists for the recommended map.

## User Stories
- As a Tarkov player, I want to open the app and immediately see my recommended map for the next raid with a clear reason why.
- As a Tarkov player, I want a loadout suggestion that matches my budget and trader levels.
- As a Tarkov player, I want 3-5 specific POIs to visit on the recommended map, ordered by priority.
- As a Tarkov player, I want an item watchlist telling me what to pick up during the raid.
- As a Tarkov player, I want risk indicators so I know about boss spawns, key requirements, and PvP hotspots.
- As a Tarkov player, I want to quickly switch my Vibe from the Dashboard without navigating away.
- As a squad player, I want to see which teammates also benefit from the recommended map, and what quests they can complete there.
- As a squad player, I want shared tasks to be highlighted in the recommendation so the whole group progresses efficiently.

## Data Requirements
### From TarkovTracker (Player State)
- `tasksProgress[]` — to find incomplete tasks → drive map/POI recommendations
- `taskObjectivesProgress[]` — to find incomplete objectives → drive POI locations
- `hideoutModulesProgress[]` — to find needed hideout items → drive item watchlist
- `hideoutPartsProgress[]` — to find uncollected parts → drive item watchlist
- `playerLevel` — affects loadout budget and available tasks
- `pmcFaction` — affects faction-specific task filtering

### From TarkovTracker (Team State — via spec-007)
- `teammates[].tasksProgress[]` — each teammate's task completion
- Used to compute: team task overlap per map, shared quest count, team benefit per recommendation

### From tarkov.dev (Game Data)
- `tasks` — quest objectives, their maps, required items
- `maps` — map metadata, boss spawns, raid duration
- `items` — item prices, properties (for watchlist value scoring)
- `hideoutStations` — item requirements for uncompleted modules
- `goonReports` (via `useGoonReports()`) — community-reported sightings; consumed for the Threat Assessment card. Drives the "Goon Sighting · SIGHTED · 2m ago" indicator on the recommended map.

### Computed/Derived (The Recommendation Engine)

#### 🗺️ Map Scoring (Team-Aware)
```
mapScore = Σ(questObjectivesOnMap × goalWeight)
         × vibeMapPreference
         × (1 - riskPenalty if vibe.riskTolerance == 'low')
         + teamOverlapBonus
```
- Count **actionable** quest objectives per map (only quests whose prerequisites are satisfied)
- Weight by active goal (Kappa weights ALL quests, Prestige weights tier-specific)
- **Early-game progression bonus**: quests that unlock new traders or new maps receive a scoring multiplier. At low player levels (below flea market unlock), trader-unlocking and map-unlocking quests are critical progression gates and should be prioritized over general quest density.
- Multiply by vibe's map preference modifier
- **Team bonus**: `teamOverlapBonus = Σ(teammatesWithOpenObjectivesOnMap) × teamWeight`
  - Each teammate with open quests on this map adds a score bonus
  - `teamWeight` scales with team size (more impact in larger squads)
- Pick the highest-scoring map

#### 🔫 Loadout Budget
```
budget = baseBudget(playerLevel) × vibe.gearBudgetMultiplier
```
- Base budget scales with player level (more ₽ as you level up)
- Vibe multiplier: 0.3x (Loot Run) → 1.0x (PvP) → 1.2x (Boss Rush)
- Suggest weapon/armor tier that fits within budget

#### 📍 POI Ranking (Team-Aware)
```
poiScore = questObjectiveWeight
         + lootValueWeight × vibe.poiPriority('loot')
         + bossProximityWeight × vibe.poiPriority('boss')
         + teamSharedObjectiveBonus
         - riskPenalty × (1 - vibe.riskTolerance)
```
- Rank **map locations** (not quest objectives) on the selected map by what the player needs
- POIs must be named after recognizable map areas (e.g., "Parking Lot", "Machine Gun Position", "Old Gas Station"), not formatted as quest objectives (e.g., NOT "Prapor: Locate the Utyos machine gun"). Quest context is attached as secondary information within each POI.
- POIs must only reference **actionable** quests — quests whose prerequisites are all satisfied. Locked quests (prerequisites not met) must not appear in the POI list, even if TarkovTracker reports them as "not complete". The engine must cross-reference `taskRequirements` against the player's completed tasks to determine actionability.
- When quest objectives reference specific locations, group multiple objectives at the same location into a single POI
- **Team bonus**: POIs where teammates also have objectives score higher
- Show top 3-5 POIs with expected loot and key requirements
- When quest objectives have no map restriction (e.g., "Find Salewas in raid" can be done on any map), they must still generate POIs on the recommended map based on known loot locations for those items
- Each POI must explain **why** it is recommended. The loot expectation line must describe the player-relevant reason: needed items that spawn there (e.g., "High Salewa density · medical loot"), quest objectives at this location, or high-value loot for the active vibe. It must not simply list quest names.

#### 🎯 Watchlist Scoring (Team-Aware)
```
itemPriority = goalNeedScore (quest/hideout requirement)
             + marketValue (if Loot Run vibe)
             + bossDropChance (if Boss Rush vibe)
             + teamNeedBonus (teammate also needs this item)
```
- Items needed for active goal's open tasks and hideout modules
- **Team bonus**: items that teammates also need get a priority boost and "teammate also needs" label
- Sorted by priority score
- Show top 5-8 items

#### ⚠️ Risk Assessment (Threat Assessment card)

A dedicated `bg-card border-destructive/30` tactical card. **Format depends on slot**, set by the layout composition (not by the vibe directly):

**Format `tiles`** (Boss Rush hero, `lg:col-span-2`) — 3 horizontal metric tiles:

1. **Boss Probability** — boss name + spawn % from `maps.bosses[].spawnChance`. Bar fills with `--destructive` in proportion to spawn chance. When chance is 100%, display "100%" in bold mono and label the boss name underneath.
2. **Goon Sighting** — driven by `useGoonReports().byMap(recommendedMapId)`. Tile shows the LIVE/SIGHTED/CLEAR/STALE state — see "Goon sighting state machine" below.
3. **Danger Level** — qualitative tier (`LOW` / `ELEVATED` / `EXTREME`) from a heuristic blend of boss spawn %, map PvP hotness, and active vibe's `riskTolerance`. Renders a 4-segment bar (0–4 segments filled) with a single line of tactical guidance below (e.g., "CQC Specialty / Full Auto").

**Format `rows`** (Loot Run sidebar, compact) — 2 stacked rows:

1. **Boss row** — label (`{Boss Name} (Boss)`) + mono spawn % aligned right. No bar.
2. **Goon Squad row** — sat on a subtly tinted error background. Label "Goon Squad" + 2-line right-aligned status: top line "SIGHTED" (pulsing) / "CLEAR", bottom line `{relativeTime} · {poi}` in muted mono. No Danger Level tile.

**Format `bars`** (PvP / Mixed left column, hero) — 3 stacked rows, each with a telemetry label, value, and horizontal progress bar:

1. **Boss Probability** — `{spawnPct}%` value, primary-fill bar at `spawnPct`. Boss name underneath in subtle text.
2. **Goon Presence** — value "SIGHTED" / "CLEAR" with a `LIVE STATUS` pill on the right of the row, bar fills proportional to recency (100% if <2min, decays to 0% at 30min). Footer line `{relativeTime} · {poi}`.
3. **PMC Frequency** — replaces the "Danger Level" tile in this format. Value "High" / "Medium" / "Low" + bar reflecting `vibe.pvpDensityEstimate(mapId)`. Footer line lists hotspot POIs ("Dorms, Crackhouse").

**Goon sighting state machine** (shared across all formats):
- Recent report (<30 min, this map): "SIGHTED" in destructive bold with subtle pulse, bar filled, footer `{poi.name} · {formatRelativeTime(timestamp)}`.
- No report: "CLEAR" in secure (emerald) color, bar empty.
- Stale (>30 min on this map, or `useGoonReports().isStale === true`): muted secondary color, "STALE" label, no pulse.
- Provider error / unavailable: "—" placeholder, neutral styling, no error toast.

The Threat Assessment card is **always present** on the Dashboard regardless of vibe — its prominence (column span) and its format are what change per layout composition.

#### 👥 Team Impact (new section)
```
teamBenefit = Σ(teammatesWithOpenObjectivesOnRecommendedMap)
```
- Show which teammates benefit from this raid recommendation
- Per teammate: name, number of quests they can progress on this map
- If no team → section is hidden

## UI Components
| Component | Location | Type | Description |
|-----------|----------|------|-------------|
| `DashboardGrid` | `features/dashboard/components/dashboard-grid.tsx` | Client | Layout wrapper. Reads the active vibe's composition entry from `lib/dashboard-layout.ts` and dispatches between two shapes: `12col-with-secondary` (Loot Run, Boss Rush) and `2col-split` (PvP / Mixed). Accepts named slots (`hero`, `secondary`, `sidebar`) and an ordered list of card descriptors `{ component, variant, props }` per slot. |
| `MapRecommendationCard` | `features/dashboard/components/map-recommendation.tsx` | Client | TTI "Map Protocol" / "Map Recommendation" / "Target Area" card. Variants: `compact` (icon + name + paragraph) and `hero` (Optimal-Pick header pill + name + paragraph + visual "Clear Map" button — see "Visual-only controls"). Always shows team benefit badge when team data is available. |
| `LoadoutSuggestionCard` | `features/dashboard/components/loadout-suggestion.tsx` | Client | "Kit Proposal" / "Recommended Kit" card. Variants: `compact` (2 label/mono-value rows — Loot Run), `kit-categorized` (4 rows: Primary WPN / Ammo / Armor / Utility, separators, right-aligned mono values — Boss Rush), `kit-detailed` (3 equipment rows with 32px icon tiles + per-row sub-labels + "EST. TOTAL COST {budget} ₽" footer + "Budget Pick" header pill — PvP hero). |
| `POIList` | `features/dashboard/components/poi-list.tsx` | Client | "High-Value Loot POIs" / "Points of Interest". Variants: `detailed` (full card per POI: dot + name + risk pill + description paragraph — Loot Run hero, Boss Rush) and `compact` (single line: dot + name + risk pill — PvP sidebar). Accepts `sortMode: 'priority' | 'boss-spawn-proximity'`; Boss Rush uses the latter. |
| `ItemWatchlist` | `features/dashboard/components/item-watchlist.tsx` | Client | "Item Watchlist" / "Loot Watchlist". Variants: `hero` (32px icon tile per row + item name + multi-location description, optional goal-bound header pill "PRESTIGE TARGETS" / "ACTIVE QUESTS" — Loot Run hero) and `compact` (single inline row: small icon + name + right-aligned mono source label — Boss Rush + PvP sidebars). |
| `ThreatAssessmentCard` | `features/dashboard/components/threat-assessment.tsx` | Client | **Renamed/restructured `RiskPanel`** — dedicated `border-destructive/30` tactical card. Accepts `format: 'tiles' \| 'rows' \| 'bars'` per the spec above. Consumes `useGoonReports()`. |
| `QuickAnalysisCard` | `features/dashboard/components/quick-analysis.tsx` | Client | **New, vibe-specific (Loot Run).** Two horizontal meter rows: "LOOT DENSITY" (0–100%, primary fill) + "SURVIVAL PROB" (0–100%, destructive fill). Both values come from `vibeIntelData` (engine output — see Hooks). |
| `BossEncounterCard` | `features/dashboard/components/boss-encounter.tsx` | Client | **New, vibe-specific (Boss Rush).** Two-column grid. Left: bullet list with icons — Spawn Points, Guard Status, Unique Loot. Right: "Tactical Approach" + "Flank Maneuvers" paragraphs. Content sourced from `lib/boss-intel.ts` keyed by `{mapId, bossId}`, populated from `maps.bosses[]` + curated tactical notes. |
| `CombatStrategyCard` | `features/dashboard/components/combat-strategy.tsx` | Client | **New, vibe-specific (PvP / Mixed).** Tactical-notes panel with 2–3 named protocols (e.g., "CQB Protocol", "Anti-Goon Maneuver"). Content sourced from `lib/combat-protocols.ts` keyed by `{mapId, hasGoonSighting}`. |
| `TeamImpactPanel` | `features/dashboard/components/team-impact.tsx` | Client | "This raid helps:" panel with per-teammate quest counts. Single-variant (always compact). |
| `LabeledSelector` (×2) | `components/shared/labeled-selector.tsx` | Client | Vibe + Active Directive selectors rendered in the `PageHeader` actions slot. See spec-005. |

### Card density variants — convention

- Every dashboard card that appears in more than one slot exposes a `variant` prop. The active vibe's layout composition (see below) assigns the variant for each slot occupant.
- **`hero`** — full content: descriptions, icon tiles, multi-row internals, paragraph copy. Used in `hero` and `secondary` slots.
- **`compact`** — dense form: label + mono value pairs, no descriptions, no icon tiles, no paragraphs. Used in the `sidebar` slot stacks.
- **`kit-detailed`** — Loadout-only third variant for the PvP hero slot. See `LoadoutSuggestionCard` row above.
- **`format`** (Threat Assessment only) — orthogonal to `variant`; chooses between `tiles` / `rows` / `bars`. Set per slot in the composition map.

### Visual-only controls

- **"Clear Map" button** on the PvP hero `MapRecommendationCard` is a visual element only — it ships with no behavior in this iteration. No re-roll, no map pinning, no state change. Rendering matches the Stitch primary-styled button so the layout is faithful; click handler is a no-op (or omitted). Resolves the deferred "re-roll" question by deferring it again, intentionally.

## Layout Composition

The Dashboard supports **two layout shapes**; the active vibe selects one and assigns cards (with variant + format props) to its slots. Composition data lives in `features/dashboard/lib/dashboard-layout.ts` as a pure data structure (vibe → `{ shape, slots[] }`).

### Shapes

- **`12col-with-secondary`** (Loot Run, Boss Rush) — a 12-column grid with three named slots:
  - `hero` (`lg:col-span-8`, row 1)
  - `secondary` (`lg:col-span-8`, row 2) — optional
  - `sidebar` (`lg:col-span-4`, spans both rows) — ordered stack of cards
- **`2col-split`** (PvP / Mixed) — a 2-column grid where the **left column is an ordered stack** of full-width hero cards and the **right column is an ordered stack** of compact sidebar cards. No `secondary` slot.

### Composition map

| Vibe | Shape | Left / Hero stack | Secondary | Sidebar / Right stack |
|------|-------|-------------------|-----------|------------------------|
| Loot Run | `12col-with-secondary` | `ItemWatchlist` (`hero`) | `POIList` (`detailed`) | `MapRecommendationCard` (`compact`) → `ThreatAssessmentCard` (`rows`) → `QuickAnalysisCard` → `LoadoutSuggestionCard` (`compact`) |
| PvP / Mixed | `2col-split` | `LoadoutSuggestionCard` (`kit-detailed`) → `ThreatAssessmentCard` (`bars`) → `CombatStrategyCard` | — | `MapRecommendationCard` (`hero`) → `POIList` (`compact`) → `ItemWatchlist` (`compact`) → `TeamImpactPanel` |
| Boss Rush | `12col-with-secondary` | `ThreatAssessmentCard` (`tiles`) | `BossEncounterCard` + `POIList` (`detailed`, `sortMode: 'boss-spawn-proximity'`) — two cards in row 2 | `MapRecommendationCard` (`compact`) → `ItemWatchlist` (`compact`) → `LoadoutSuggestionCard` (`kit-categorized`) |

**Rationale notes**:
- The same `MapRecommendationCard` / `ThreatAssessmentCard` / `LoadoutSuggestionCard` / `POIList` / `ItemWatchlist` components are reused across all three vibes; only the variant/format and ordering change.
- Each vibe contributes **exactly one vibe-specific intel card** (`QuickAnalysisCard` / `BossEncounterCard` / `CombatStrategyCard`); these cards do not render under other vibes.
- `TeamImpactPanel` is currently only in the PvP / Mixed composition (matches the Stitch sidebar density). It may be added to other compositions later without breaking the data structure.

### Rules
- On mobile (`<lg`), every shape collapses to a single column in this order: hero stack (top→bottom) → secondary (if present) → sidebar stack (top→bottom).
- **Hero cards must never return `null`.** When a hero card has no data (e.g., empty watchlist), render a clear empty state inside the same card frame so the slot stays anchored and the layout shape is preserved. The same rule applies to any card that's the only resident of a slot. `TeamImpactPanel` is the exception — it sits at the end of its stack and may be omitted when there are zero benefiting teammates.
- **Selector sizing** in the `PageHeader` actions slot: `LabeledSelector` uses `min-w-[140px] max-w-[280px]` and grows to fit content. A fixed width clips long names like "Lightkeeper Unlock"; an unbounded width can push the layout. The max-width cap keeps the header tidy.
- **Adding a 4th vibe** = adding a new row to the composition table + (optionally) a new intel card. No new layout shape required unless the new vibe needs one.

## Hooks
| Hook | Location | Description |
|------|----------|-------------|
| `useRaidPlan()` | `features/dashboard/hooks/use-raid-plan.ts` | Consumes `useGameData()`, `usePlayerState()`, `useTeamState()`, `useVibeConfig()`. Runs `computeRaidPlan()` via `useMemo` — reactive to all inputs. Returns the recommendation plus a `vibeIntelData` payload shaped per the active vibe's `intelCard` (see spec-005). |
| `useGoonReports()` | `hooks/use-goon-reports.tsx` | From spec-003. Consumed by `ThreatAssessmentCard` for the Goon Sighting tile. |

**Critical**: `useRaidPlan()` uses the shared `GameDataProvider` from spec-003. It does NOT fetch game data itself — it reads from the global `useGameData()` context.

### `vibeIntelData` shapes

The engine emits a discriminated payload that the vibe-specific intel card consumes directly:

- `intelCard: 'quick-analysis'` → `{ lootDensity: 0–100, survivalProbability: 0–100 }`
- `intelCard: 'boss-encounter'` → `{ bossId, spawnPoints: string[], guardStatus: string, uniqueLoot: string[], tacticalApproach: string, flankManeuvers: string }` (lookup against `lib/boss-intel.ts`)
- `intelCard: 'combat-strategy'` → `{ protocols: { title: string, body: string }[] }` (lookup against `lib/combat-protocols.ts`)

When no intel exists for the recommended map (e.g., Boss Rush recommended Customs but no curated Reshala intel yet), the card renders a minimal "Intel not yet available" empty state in the same frame — no layout collapse.

## Requirements
### Functional
- [x] Dashboard is the homepage (`/`) — first thing the player sees
- [x] Page renders inside the shared `PageHeader` with title "INTEL BRIEFING", subtitle "Next Raid Parameters Confirmed.", and `actions` slot containing **`LabeledSelector` ×2** (Vibe + Active Directive)
- [x] Map Recommendation: map name, reasoning paragraph, quest objective count, raid duration in mono
- [x] `MapRecommendationCard` renders the variant assigned by the composition (`compact` or `hero`). Hero variant includes the "Optimal Pick" header pill and the **visual-only "Clear Map" button** (no behavior).
- [x] **Team context in map recommendation**: teammate benefit badge (rendered in both variants)
- [x] Loadout Suggestion: weapon class, armor class, rig, total budget estimate — rendered as categorized rows (Primary WPN / Ammo / Armor / Utility) with separators between
- [x] `LoadoutSuggestionCard` supports three variants (`compact`, `kit-categorized`, `kit-detailed`) per the UI Components table. `kit-detailed` includes the per-row icon tiles, sub-labels, header pill, and "EST. TOTAL COST" footer.
- [x] POI List: up to 5 cards with location name, loot expectation, **risk-colored dot indicator**, **risk pill badge**
- [x] `POIList` supports `detailed` and `compact` variants. Boss Rush uses `sortMode: 'boss-spawn-proximity'`.
- [x] Item Watchlist: up to 8 items with **icon tile (square 32px)** + name + mono source location
- [x] `ItemWatchlist` supports `hero` and `compact` variants. Hero variant accepts an optional goal-bound header pill ("PRESTIGE TARGETS" when active goal is Prestige, "ACTIVE QUESTS" otherwise).
- [x] Threat Assessment: 3-tile card (Boss Probability / Goon Sighting / Danger Level) inside an error-tinted card border
- [x] `ThreatAssessmentCard` supports `format: 'tiles' | 'rows' | 'bars'` per the spec above; the format is set by the layout composition, not by the active vibe directly. The PvP `bars` format replaces the Danger Level tile with **PMC Frequency**.
- [x] **Goon Sighting**: consumes `useGoonReports().byMap(recommendedMapId)`. Shows "SIGHTED" with relative timestamp and POI when present; "CLEAR" when none; "STALE" when last sighting >30 min old. Behaviour is identical across all three Threat formats; only the visual containment changes.
- [x] **Vibe-specific intel cards**: exactly one of `QuickAnalysisCard` / `BossEncounterCard` / `CombatStrategyCard` renders, driven by `vibe.intelCard` (see spec-005). Each consumes `vibeIntelData` from `useRaidPlan()`.
- [x] `QuickAnalysisCard` (Loot Run) renders two horizontal meter rows: LOOT DENSITY (primary fill) + SURVIVAL PROB (destructive fill).
- [x] `BossEncounterCard` (Boss Rush) renders a 2-col grid: Spawn Points / Guard Status / Unique Loot bullets on the left, Tactical Approach + Flank Maneuvers paragraphs on the right. Content sourced from `lib/boss-intel.ts`.
- [x] `CombatStrategyCard` (PvP / Mixed) renders 2–3 named tactical-notes protocols (e.g., CQB Protocol, Anti-Goon Maneuver). Content sourced from `lib/combat-protocols.ts`.
- [x] When intel data is missing for the recommended map, the intel card renders a "Intel not yet available" empty state inside the same card frame — never `null`.
- [x] **Team Impact section**: "This raid helps:" with per-teammate quest counts
- [x] Refresh button re-fetches TarkovTracker state (player + team) and recomputes
- [x] Dashboard recomputes when Vibe changes (no page reload — reactive via `useMemo`)
- [x] **Layout composition driven by the active vibe** — see Layout Composition table above. `lib/dashboard-layout.ts` is the single source of truth; `DashboardGrid` reads it and dispatches between `12col-with-secondary` and `2col-split` shapes.
- [x] Mobile collapse order: hero stack → secondary (if any) → sidebar stack — preserving the order defined in the composition entry. Cards keep their assigned variants on mobile (no automatic switch to `compact` on small screens).
- [x] When team data is unavailable, all team-specific indicators are hidden (no errors)
- [x] When goon reports unavailable (API down): Goon Sighting tile shows "—" with neutral styling, no error toast
- [x] Not connected → shows "Connect your account" CTA linking to Settings
- [x] No open tasks → shows "🎉 All caught up!" message
- [ ] **Team indicators on POIs**: show teammate initials on POIs where they also have objectives (both `detailed` and `compact` variants)
- [ ] **Team badges on watchlist items**: "PlayerX also needs this" (hero variant only — compact has no room)

### Non-Functional
- [x] Recommendation computation via `useMemo` — no loading spinner for recomputes
- [x] Mobile-optimized: single column, cards stack vertically
- [x] Loading spinner while game data is being fetched
- [ ] Sections stream in progressively (Suspense boundaries)
- [ ] Print-friendly: player can print/screenshot the raid plan

## Success Criteria
- [ ] Connected player sees a fully populated dashboard with all sections
- [ ] Changing Vibe immediately updates recommendations
- [ ] Map recommendation changes based on open quest objectives
- [ ] **Team data visibly influences map scoring** (map with team overlap ranks higher)
- [ ] Item watchlist reflects actual quest/hideout requirements + team needs
- [ ] Risk indicators are accurate for the recommended map
- [ ] Team Impact section correctly lists benefiting teammates
- [ ] Solo player (no team data) sees a clean dashboard without team sections

## Edge Cases
- No TarkovTracker connection → show "Connect your account" CTA with mock/example data
- All tasks complete for active goal → show "Goal complete! 🎉" with alternative suggestions
- No quest objectives on any map (rare) → fall back to vibe-only recommendation
- Player has no keys → flag POIs that require keys with "Key needed" badge
- Multiple maps tied in score → show top 2 with comparison
- tarkov.dev data stale → show "Game data last updated X ago" indicator
- No TP permission → team sections hidden, individual recommendation still works
- Team data stale (>5 min) → show "Team data updated X ago" indicator
- Teammate has completed all quests on the recommended map → don't list them in Team Impact
- **Goon reports unavailable** (provider error or schema change) → Threat Assessment renders without the Goon tile or shows "—" placeholder; never blocks the rest of the dashboard
- **Goon sighting on a different map** than the recommended one → display in the threat card as secondary intel ("Goons sighted on Customs — recommended map is Interchange"), or surface a small map-switch hint when the sighted map ranks ≥2nd in the score
- **Vibe doesn't define a slot composition** (future-proofing) → fall back to the `quest` composition (PvP/Mixed)

## Dependencies
- Depends on: `spec-001` (App Shell)
- Depends on: `spec-002` (TarkovTracker Connection — player state)
- Depends on: `spec-003` (Game Data Service — tasks, maps, items)
- Depends on: `spec-004` (Goal Selection — active goal + open tasks)
- Depends on: `spec-005` (Vibe Selection — active vibe + modifiers)
- Depends on: `spec-007` (Team Progress — team data for squad-aware scoring)

## Open Questions
- ✅ Resolved: Loadout suggestions — **tiers for the `compact` and `kit-categorized` variants** (e.g., "Class 4+ Mobile", "SMG / High RoF"), **specific item names for the PvP `kit-detailed` variant** (e.g., "AK-74N", "Trooper Armor", "BlackHawk Rig"). Specific item picks come from a heuristic over the player's trader levels + budget.
- ✅ Resolved: "Re-roll" / alternative recommendation — **not implemented**. The PvP `MapRecommendationCard` ships a visual-only "Clear Map" button to match Stitch, but it has no behavior. Revisit if user feedback warrants it.
- ❓ How to handle POI coordinates — are these available from tarkov.dev or need manual data? Recommend: use tarkov.dev map data if available, otherwise omit coordinates and show zone names.
- ❓ How heavily should team overlap weight in scoring? Recommend: configurable `teamWeight` constant, default to 0.3x per teammate (meaningful but doesn't override individual quest density).
- ❓ Should Goon Sighting feed into the **map scoring formula** (down-weighting maps with recent sightings for Loot Run vibe, up-weighting for PvP)? Recommend: yes, as a small `goonSightingWeight × vibe.riskTolerance` adjustment — keeps Loot Run vibes naturally avoiding hot zones.
- ❓ Should sightings on the *opposite* game mode (player on PVE, query mode mismatched) appear? Recommend: no — the provider already filters by `gameMode`; never blend PVP and PVE sighting feeds.
- ❓ Where do `lib/boss-intel.ts` and `lib/combat-protocols.ts` source their copy from? Recommend: curated by hand for the MVP (Reshala/Killa/Goons + Customs/Interchange/Factory), versioned in repo. Migrate to a community-maintained data file later.
