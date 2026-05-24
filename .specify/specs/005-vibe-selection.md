# Feature Spec: Vibe Selection

> Status: `in-progress` (inline selector only — standalone page removed)
> Priority: `P0`
> Feature: `vibes`

## Overview
Let the player pick their current "Vibe" — their short-term raid intent. The vibe modifies how the Dashboard weights its recommendations: which maps to prefer, how much to spend on gear, whether to seek or avoid bosses, and whether to prioritize loot or quest objectives. Vibes are lightweight and meant to be switched frequently between raids.

**Sole surface**: the Dashboard's `PageHeader` action slot hosts a `LabeledSelector` for the Vibe (alongside the Directive selector) — the TTI's signature "INTEL BRIEFING" header pattern. There is **no standalone Vibes page** — switching is fast enough inline that a dedicated page was redundant. The hook (`useVibeConfig`) and type definitions (`VibeId`, `VibeDefinition`, `VIBES`) remain as the source of truth for the engine; the modifier values are not user-editable.

## User Stories
- As a Tarkov player about to do a quick loot run, I want to select "Loot Run" vibe so the app recommends safe, high-value routes.
- As a Tarkov player feeling confident, I want to select "PvP / Mixed" so the app recommends meta loadouts and quest-dense maps.
- As a Tarkov player hunting Killa, I want to select "Boss Rush" so the app optimizes for boss spawn locations.
- As a Tarkov player, I want to quickly switch vibes without navigating away from the Dashboard.
- As a squad leader, I want to see how my vibe choice affects what the team can accomplish together (e.g., "PvP/Mixed: 3 shared quests on preferred maps").

## Data Requirements
### From TarkovTracker (Player State)
- `playerLevel` — affects loadout budget recommendations per vibe

### From TarkovTracker (Team State — via spec-007)
- Team task overlap per map — to show team impact in vibe summary

### From tarkov.dev (Game Data)
- `maps.bosses[]` — boss spawn chances (used by Boss Rush vibe)
- `maps.raidDuration` — affects map preference weighting

### Computed/Derived
- `vibeModifier` — the active vibe's configuration applied to dashboard scoring:
  - `mapWeights` — per-map preference multipliers
  - `poiPriority` — 'loot' | 'quest' | 'boss'
  - `gearBudgetMultiplier` — 0.3 (budget) to 1.5 (meta)
  - `riskTolerance` — affects POI risk filtering
- **Team-Aware**:
  - `vibeTeamImpact` — for each vibe, how many shared tasks exist on that vibe's preferred maps
  - Used in the modifier summary to help squad leaders pick the best vibe for the group

## Vibe Definitions

### 💰 Loot Run
- **Map preference**: Low PMC density, avoid goon maps
- **Loadout**: Budget gear (minimize risk-per-death)
- **POI priority**: High value-per-slot items, minimal key requirements
- **Risk tolerance**: Low
- **Team context**: "X shared quests on preferred maps"

### ⚔️ PvP / Mixed
- **Map preference**: High quest objective density
- **Loadout**: Meta gear based on available trader levels
- **POI priority**: Quest objectives first, boss encounters acceptable
- **Risk tolerance**: High
- **Team context**: "X shared quests on preferred maps"

### 👹 Boss Rush
- **Map preference**: Optimized by boss spawn chance
- **Loadout**: Tailored to specific boss types (e.g., face shield for Killa)
- **POI priority**: Boss spawn locations primary, quest items at boss POIs secondary
- **Risk tolerance**: High
- **Team context**: "X shared quests on preferred maps"

## UI Components
| Component | Location | Type | Description |
|-----------|----------|------|-------------|
| `LabeledSelector` | `components/shared/labeled-selector.tsx` | Client | Shared primitive that hosts the Vibe picker on the Dashboard. See spec-006. |

**Removed (no longer in the live app):**
- `VibeSelector`, `VibeCard`, `VibeModifierSummary`, `VibeQuickSwitch`. The dedicated `/vibes` route is deleted. Modifier inspection (which knob each vibe turns) lives in the `VIBES` constant in `features/vibes/types.ts` — that's documentation in code, not user-facing UI.

## Requirements
### Functional
- [x] **`LabeledSelector`** is the Dashboard switching primitive — rendered in the `PageHeader` actions slot alongside the Active Directive selector
- [x] Active vibe is stored in `localStorage` (key: `active-vibe`)
- [x] Vibe persists across page reloads
- [x] Switching vibe triggers Dashboard recalculation (via shared state/context)
- [x] `useVibeConfig()` hook provides `activeVibe` and `vibeModifier` to any component
- [x] No dedicated `/vibes` route — removed
- [ ] **Team impact** — when team data is available, the engine still weights vibe-specific map preferences against teammate overlap. The user doesn't see a "team impact" indicator on the Vibe selector itself (no room in the trigger). Team benefit shows up in the dashboard cards (`teamImpact` badge on Map Recommendation, Team Impact panel). When team data is unavailable, those indicators are hidden — no errors.

### Non-Functional
- [ ] Vibe switch should feel instant (no loading spinner)
- [ ] Cards should have hover animations (scale, glow)
- [ ] Selected card should have a prominent purple border/glow
- [ ] Smooth transition when switching active vibe

## Success Criteria
- [ ] All 3 vibes render with accurate descriptions
- [ ] Selection persists across reloads
- [ ] `useVibeConfig()` returns correct modifier values for each vibe
- [ ] Quick switch works from the Dashboard without navigating away
- [ ] Team impact lines show correct shared quest counts when team data is available
- [ ] No errors or visual breakage when team data is unavailable

## Edge Cases
- No vibe selected (first visit) → default to "Loot Run" (safest option)
- localStorage unavailable → fall back to in-memory state
- Future: adding a 4th vibe → card grid should accommodate gracefully
- No TP permission → team impact lines hidden, vibes work identically
- No shared quests on any map for a vibe → show "0 shared quests"

## Dependencies
- Depends on: `spec-001` (App Shell — sidebar nav no longer includes Vibes)
- Depends on: `spec-006` (Dashboard — sole consumer surface for vibe selection)
- Enhances with: `spec-007` (Team Progress — team data shows up in dashboard cards, not on the vibe selector itself)

## Open Questions
- ❓ Should vibes have sub-options (e.g., Boss Rush → pick specific boss)? Recommend: not for MVP — keep it simple with 3 top-level vibes.
- ❓ Should the modifier values be editable by the player (advanced mode)? Recommend: no for MVP, hardcoded modifiers per vibe.
- ❓ Should `VibeQuickSwitch` be deleted now or kept until the new selector ships? Recommend: keep until Phase 4 lands, then delete in a follow-up commit to keep the design refresh PR focused.
