# Feature Spec: Next Raid Dashboard

> Status: `done`
> Priority: `P0`
> Feature: `dashboard`

## Overview
The crown jewel of the app. The Dashboard combines the player's active Goal, current Vibe, and **team progression** with live game data to produce a single, scannable "Next Raid" recommendation. It answers: **where to go, what to bring, where to look, what to grab, what to watch out for, and who benefits**. When team data is available, the recommendation engine boosts maps and tasks where teammates also have open objectives — maximizing squad efficiency. This is a read-only output view — the player consumes the recommendation and heads into raid.

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

#### ⚠️ Risk Assessment
- Boss spawn % on recommended map
- Key requirements for recommended POIs (do you have them?)
- PvP density estimate (qualitative: low/medium/high per map)

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
| `MapRecommendationCard` | `features/dashboard/components/map-recommendation.tsx` | Client | Recommended map card with reasoning + team benefit badge |
| `LoadoutSuggestionCard` | `features/dashboard/components/loadout-suggestion.tsx` | Client | Weapon, armor, rig grid with budget |
| `POIList` | `features/dashboard/components/poi-list.tsx` | Client | Ordered list of POIs with numbered cards and risk badges |
| `ItemWatchlist` | `features/dashboard/components/item-watchlist.tsx` | Client | Priority-sorted item list with quest/hideout reasons |
| `RiskPanel` | `features/dashboard/components/risk-panel.tsx` | Client | Boss, PvP, key risk indicators with severity colors |
| `TeamImpactPanel` | `features/dashboard/components/team-impact.tsx` | Client | "This raid helps:" panel with per-teammate quest counts |
| `VibeQuickSwitch` | `features/vibes/components/vibe-quick-switch.tsx` | Client | Compact vibe switcher embedded in dashboard header |

## Hooks
| Hook | Location | Description |
|------|----------|-------------|
| `useRaidPlan()` | `features/dashboard/hooks/use-raid-plan.ts` | Consumes `useGameData()`, `usePlayerState()`, `useTeamState()`, `useVibeConfig()`. Runs `computeRaidPlan()` via `useMemo` — reactive to all inputs. |

**Critical**: `useRaidPlan()` uses the shared `GameDataProvider` from spec-003. It does NOT fetch game data itself — it reads from the global `useGameData()` context.

## Requirements
### Functional
- [x] Dashboard is the homepage (`/`) — first thing the player sees
- [x] Header shows active Goal and Vibe with quick-switch controls
- [x] Map Recommendation section: map name, reasoning paragraph, quest objective count
- [x] **Team context in map recommendation**: teammate benefit badge
- [x] Loadout Suggestion section: weapon class, armor class, rig, total budget estimate
- [x] POI List section: up to 5 cards with location name, loot expectation, risk level
- [x] Item Watchlist section: up to 8 items with name and reason (quest/hideout)
- [x] Risk Panel: boss spawn %, PvP density
- [x] **Team Impact section**: "This raid helps:" with per-teammate quest counts
- [x] Refresh button re-fetches TarkovTracker state (player + team) and recomputes
- [x] Dashboard recomputes when Vibe changes (no page reload — reactive via `useMemo`)
- [x] Single-column scrollable layout (scannable before raid)
- [x] When team data is unavailable, all team-specific indicators are hidden (no errors)
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
