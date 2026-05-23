# Feature Spec: App Shell & Navigation

> Status: `done`
> Priority: `P0`
> Feature: `shared`

## Overview
The app shell provides the persistent layout frame that wraps every page: a collapsible sidebar for navigation, a top header bar with branding and status, and a responsive content area. This is the visual skeleton — every other feature renders inside it.

## User Stories
- As a Tarkov player, I want a clear navigation sidebar so that I can quickly switch between Dashboard, Goals, Vibes, and Settings.
- As a Tarkov player, I want to see my player name and level in the header so I know which account is connected.
- As a Tarkov player on mobile, I want the sidebar to collapse into a hamburger menu so the app is usable on smaller screens.

## Data Requirements
### From TarkovTracker (Player State)
- `displayName` — shown in header when connected
- `playerLevel` — shown in header as badge
- `pmcFaction` — USEC/BEAR indicator

### From tarkov.dev (Game Data)
- None for this spec.

### Computed/Derived
- `isConnected` — boolean derived from whether a valid token exists and progress has been fetched

## UI Components
| Component | Location | Type | Description |
|-----------|----------|------|-------------|
| `AppShell` | `components/layout/app-shell.tsx` | Server | Wrapper that composes sidebar + header + content area |
| `Sidebar` | `components/layout/sidebar.tsx` | Client | Navigation links with active state, collapsible on mobile |
| `Header` | `components/layout/header.tsx` | Client | App branding, player info badge, mobile menu trigger |
| `MobileNav` | `components/layout/mobile-nav.tsx` | Client | Sheet/drawer navigation for small screens |

## Requirements
### Functional
- [ ] Sidebar displays nav items: Dashboard, Goals, Vibes, Settings (from `siteConfig.nav`)
- [ ] Active route is visually highlighted in sidebar
- [ ] Header shows "Tarkov Tactics" branding on the left
- [ ] Header shows player info (name + level) on the right when connected, or "Not connected" when not
- [ ] Sidebar collapses to icons-only on medium screens
- [ ] Sidebar becomes a slide-out drawer on mobile (<768px)
- [ ] Content area fills remaining space and scrolls independently
- [x] App uses Red Hat Text as the primary font (via `next/font/google`)

### Non-Functional
- [ ] Responsive across mobile, tablet, desktop
- [ ] Smooth transition animations on sidebar collapse
- [ ] Loading skeleton for player info while fetching

## Success Criteria
- [ ] All 4 routes are navigable from the sidebar
- [ ] Active route is visually distinct
- [ ] Mobile drawer opens/closes cleanly
- [ ] Build passes with no TypeScript errors

## Edge Cases
- No TarkovTracker token → header shows "Not connected" with link to Settings
- API error fetching player info → header shows error indicator with retry
- Very long player names → truncate with ellipsis

## Dependencies
- None — this is the foundation spec.

## Open Questions
- ❓ Should the sidebar support keyboard navigation (arrow keys) for a11y? (Recommend: yes, use Radix primitives) - YES
