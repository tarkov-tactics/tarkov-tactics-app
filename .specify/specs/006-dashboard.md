# Feature Spec: Next Raid Dashboard

> Status: `in-progress` (TTI layout adoption + goon sightings)
> Priority: `P0`
> Feature: `dashboard`

## Overview
The crown jewel of the app. The Dashboard combines the player's active Goal, current Vibe, and **team progression** with live game data to produce a single, scannable "Next Raid" recommendation. It answers: **where to go, what to bring, where to look, what to grab, what to watch out for, and who benefits**. When team data is available, the recommendation engine boosts maps and tasks where teammates also have open objectives — maximizing squad efficiency. This is a read-only output view — the player consumes the recommendation and heads into raid.

The page adopts the TTI **"INTEL BRIEFING"** layout: a `PageHeader` with the tactical title + inline Vibe + Directive selectors, followed by a **12-column responsive grid** of tactical cards. Card composition (which card lives in the hero slot, which in the sidebar) is driven by the active vibe's `poiPriority` — one layout file, multiple compositions, no per-vibe layout duplication. Community-reported **Goon Squad sightings** (from tarkov.dev `goonReports`) surface in the Threat Assessment card with a relative timestamp ("SIGHTED · 2m ago · Customs") when a sighting exists for the recommended map.

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
- Count open quest objectives per map
- Weight by active goal (Kappa weights ALL quests, Prestige weights tier-specific)
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
- Rank locations on the selected map by what the player needs
- **Team bonus**: POIs where teammates also have objectives score higher
- Show top 3-5 POIs with expected loot and key requirements

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

A dedicated `bg-card border-destructive/30` tactical card rendering three metric tiles in the TTI style:

1. **Boss Probability** — boss name + spawn % from `maps.bosses[].spawnChance`. Bar fills with `--destructive` color in proportion to spawn chance. When chance is 100% (boss guaranteed), display "100%" in bold mono and label the boss name underneath.
2. **Goon Sighting** — driven by `useGoonReports().byMap(recommendedMapId)`:
   - If a recent report exists: telemetry label "GOON SIGHTING", value "SIGHTED" in destructive bold (with subtle pulse animation), bar filled, footer line `{poi.name} · {formatRelativeTime(timestamp)}`
   - If no recent report: value "CLEAR" in secure (emerald) color, bar empty
   - Sighting older than 30 min on this map: treated as "STALE", muted secondary color
3. **Danger Level / PMC Density** — qualitative tier (`LOW` / `ELEVATED` / `EXTREME`) computed from a heuristic blend of boss spawn %, key map's known PvP hotness, and active vibe's `riskTolerance` field. Renders a 4-segment bar (0–4 segments filled).

The Threat Assessment card is **always present** on the Dashboard regardless of vibe — its prominence (column span) is what changes per layout composition.

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
| `DashboardGrid` | `features/dashboard/components/dashboard-grid.tsx` | Client | 12-column responsive grid wrapper. Accepts `hero`, `secondary`, `sidebar` slots. The composition map (vibe → slot assignment) is defined in `lib/dashboard-layout.ts`. |
| `MapRecommendationCard` | `features/dashboard/components/map-recommendation.tsx` | Client | TTI "Map Protocol" card — icon tile + map name + raid duration in mono + reasoning paragraph + team benefit badge |
| `LoadoutSuggestionCard` | `features/dashboard/components/loadout-suggestion.tsx` | Client | "Kit Proposal" / "Recommended Kit" card — list of categorized loadout rows (Primary WPN, Ammo, Armor, Utility) with mono-styled value column |
| `POIList` | `features/dashboard/components/poi-list.tsx` | Client | "High-Value Loot POIs" / "Points of Interest" — each row has a risk-colored dot + name + descriptive line + risk pill badge (LOW RISK / MED RISK / EXTREME RISK) |
| `ItemWatchlist` | `features/dashboard/components/item-watchlist.tsx` | Client | "Item Watchlist" — each row has a square icon tile + item name + mono source-location label (e.g., "Killa M.", "Crackhouse") |
| `ThreatAssessmentCard` | `features/dashboard/components/threat-assessment.tsx` | Client | **Renamed/restructured `RiskPanel`** — dedicated `border-destructive/30` tactical card with the three metric tiles (Boss Probability, Goon Sighting, Danger Level) per the spec above. Consumes `useGoonReports()`. |
| `TeamImpactPanel` | `features/dashboard/components/team-impact.tsx` | Client | "This raid helps:" panel with per-teammate quest counts |
| `LabeledSelector` (×2) | `components/shared/labeled-selector.tsx` | Client | Vibe + Active Directive selectors rendered in the `PageHeader` actions slot. See spec-005. |

## Layout Composition

The Dashboard renders **one shared 12-column grid** with three named slots; the active vibe's `poiPriority` determines which card lands in which slot. This avoids per-vibe layout files and scales cleanly to a 4th vibe.

| Vibe | `poiPriority` | Hero (lg:col-span-8) | Secondary (lg:col-span-8, row 2) | Sidebar (lg:col-span-4) |
|------|---------------|----------------------|----------------------------------|--------------------------|
| Loot Run | `loot` | `ItemWatchlist` | `POIList` | `MapRecommendationCard` → `ThreatAssessmentCard` → `LoadoutSuggestionCard` |
| PvP / Mixed | `quest` | `MapRecommendationCard` + `ThreatAssessmentCard` (split) | `POIList` | `LoadoutSuggestionCard` → `ItemWatchlist` → `TeamImpactPanel` |
| Boss Rush | `boss` | `ThreatAssessmentCard` | `POIList` (boss-spawn-ordered) | `MapRecommendationCard` → `ItemWatchlist` → `LoadoutSuggestionCard` |

**Boss Rush rationale**: matches Stitch's actual Boss Rush mockup — the right sidebar holds three compact cards (Map / Watchlist / Loadout) while the left column has the threat-intel hero and the boss-spawn POIs. This keeps left and right column heights roughly balanced. Earlier draft placed Map+POIs both on the left, which produced a 3-vs-2 imbalance.

- Composition map lives in `features/dashboard/lib/dashboard-layout.ts` as a pure data structure (vibe → slot assignments).
- On mobile (`<lg`), all slots collapse to a single column in this order: hero → secondary → sidebar (in order).
- **Hero cards must never return `null`.** When a hero card has no data (e.g., empty watchlist), render a clear empty state inside the same card frame so the hero slot stays anchored and the grid composition is preserved. The same rule applies to any card that's the only resident of a slot. `TeamImpactPanel` is the exception — it sits at the end of the sidebar stack and may be omitted when there are zero benefiting teammates.
- **Selector sizing** in the `PageHeader` actions slot: `LabeledSelector` uses `min-w-[140px] max-w-[280px]` and grows to fit content. A fixed width clips long names like "Lightkeeper Unlock"; an unbounded width can push the layout. The max-width cap keeps the header tidy.

## Hooks
| Hook | Location | Description |
|------|----------|-------------|
| `useRaidPlan()` | `features/dashboard/hooks/use-raid-plan.ts` | Consumes `useGameData()`, `usePlayerState()`, `useTeamState()`, `useVibeConfig()`. Runs `computeRaidPlan()` via `useMemo` — reactive to all inputs. |
| `useGoonReports()` | `hooks/use-goon-reports.tsx` | From spec-003. Consumed by `ThreatAssessmentCard` for the Goon Sighting tile. |

**Critical**: `useRaidPlan()` uses the shared `GameDataProvider` from spec-003. It does NOT fetch game data itself — it reads from the global `useGameData()` context.

## Requirements
### Functional
- [x] Dashboard is the homepage (`/`) — first thing the player sees
- [ ] Page renders inside the shared `PageHeader` with title "INTEL BRIEFING", subtitle "Next Raid Parameters Confirmed.", and `actions` slot containing **`LabeledSelector` ×2** (Vibe + Active Directive)
- [x] Map Recommendation: map name, reasoning paragraph, quest objective count, raid duration in mono
- [x] **Team context in map recommendation**: teammate benefit badge
- [x] Loadout Suggestion: weapon class, armor class, rig, total budget estimate — rendered as categorized rows (Primary WPN / Ammo / Armor / Utility) with separators between
- [x] POI List: up to 5 cards with location name, loot expectation, **risk-colored dot indicator**, **risk pill badge**
- [x] Item Watchlist: up to 8 items with **icon tile (square 32px)** + name + mono source location
- [x] Threat Assessment: 3-tile card (Boss Probability / Goon Sighting / Danger Level) inside an error-tinted card border
- [ ] **Goon Sighting tile**: consumes `useGoonReports().byMap(recommendedMapId)`. Shows "SIGHTED" with relative timestamp and POI when present; "CLEAR" when none; "STALE" when last sighting >30 min old
- [x] **Team Impact section**: "This raid helps:" with per-teammate quest counts
- [x] Refresh button re-fetches TarkovTracker state (player + team) and recomputes
- [x] Dashboard recomputes when Vibe changes (no page reload — reactive via `useMemo`)
- [ ] **Layout composition driven by `vibe.poiPriority`** — see Layout Composition table above. One grid wrapper, three slot assignments per vibe.
- [ ] Mobile collapse order: hero → threat → map → POIs → watchlist → loadout → team impact (single column)
- [x] When team data is unavailable, all team-specific indicators are hidden (no errors)
- [ ] When goon reports unavailable (API down): Goon Sighting tile shows "—" with neutral styling, no error toast
- [x] Not connected → shows "Connect your account" CTA linking to Settings
- [x] No open tasks → shows "🎉 All caught up!" message
- [ ] **Team indicators on POIs**: show teammate initials on POIs where they also have objectives
- [ ] **Team badges on watchlist items**: "PlayerX also needs this"

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
- ❓ Should loadout suggestions include specific item names or just tiers (e.g., "Class 4 armor" vs "Korund")? Recommend: tiers for MVP, specific items later.
- ❓ Should the dashboard support "re-roll" (generate an alternative recommendation)? Recommend: nice-to-have, defer.
- ❓ How to handle POI coordinates — are these available from tarkov.dev or need manual data? Recommend: use tarkov.dev map data if available, otherwise omit coordinates and show zone names.
- ❓ How heavily should team overlap weight in scoring? Recommend: configurable `teamWeight` constant, default to 0.3x per teammate (meaningful but doesn't override individual quest density).
- ❓ Should Goon Sighting feed into the **map scoring formula** (down-weighting maps with recent sightings for Loot Run vibe, up-weighting for PvP)? Recommend: yes, as a small `goonSightingWeight × vibe.riskTolerance` adjustment — keeps Loot Run vibes naturally avoiding hot zones.
- ❓ Should sightings on the *opposite* game mode (player on PVE, query mode mismatched) appear? Recommend: no — the provider already filters by `gameMode`; never blend PVP and PVE sighting feeds.
