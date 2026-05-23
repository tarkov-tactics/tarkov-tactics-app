# Feature Spec: [Feature Name]

> Status: `draft` | `review` | `approved` | `in-progress` | `done`
> Priority: `P0` | `P1` | `P2`
> Feature: `goals` | `vibes` | `dashboard` | `shared`

## Overview
<!-- 2-3 sentences: What does this feature do? What problem does it solve for the player? -->

## User Stories
<!-- Format: As a Tarkov player, I want [capability] so that [benefit] -->
- As a Tarkov player, I want ...
- As a Tarkov player, I want ...

## Data Requirements
### From TarkovTracker (Player State)
<!-- Which fields from GET /progress does this feature need? -->
- `tasksProgress[]` — ...
- `playerLevel` — ...

### From tarkov.dev (Game Data)
<!-- Which GraphQL queries does this feature need? -->
- `tasks {}` — ...
- `maps {}` — ...

### Computed/Derived
<!-- What does the app calculate from the raw data? -->
- ...

## UI Components
<!-- List the components this feature introduces or modifies -->
| Component | Location | Type | Description |
|-----------|----------|------|-------------|
| `ExampleCard` | `features/<name>/components/` | Client | ... |

## Requirements
### Functional
- [ ] ...

### Non-Functional
- [ ] Responsive on mobile (single-column layout)
- [ ] Loading states with skeleton placeholders
- [ ] Error states with retry action

## Success Criteria
<!-- How do we know this feature is done? -->
- [ ] ...

## Edge Cases
<!-- What happens when data is missing, APIs fail, or the player is in an unusual state? -->
- No TarkovTracker token configured → ...
- API rate limited → ...
- Player has no completed tasks → ...

## Dependencies
<!-- Other specs that must be completed first -->
- Depends on: `spec-XXX` (if any)

## Open Questions
<!-- Unresolved design decisions — tag with ❓ -->
